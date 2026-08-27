from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django import utils
from django.db import transaction

from users.models import Category, Customer, Receipt, SpendTracker

def extract_receipt_data(image_file):
    """
    Placeholder for receipt image processing.
    TODO: Integrate OCR / ML model to extract store name and total from receipt images.
    """
    return {
        "storeName": None,
        "total": None,
    }


def find_or_create_category(category_name:str, user:Customer):
    clean_name = category_name.strip().lower()
    category, _ = Category.objects.get_or_create(
        category_name=clean_name,
        customer=user,
    )
    return category

def is_in_current_week(date):
    """
    Returns True if `date` is in the current week (Monday–Sunday).
    """
    now = utils.timezone.now()

    # Monday = 0, Sunday = 6
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    start_of_next_week = start_of_week + timedelta(days=7)

    return start_of_week <= date < start_of_next_week

def get_starting_date_for_period(tracker_type: str, reference_date=None):
    """
    Get the starting date for a given tracker type (week/month/year).
    """
    if reference_date is None:
        reference_date = utils.timezone.now()
    
    if tracker_type == SpendTracker.WEEK_TRACKER:
        # Monday = 0, Sunday = 6
        start_of_week = reference_date - timedelta(days=reference_date.weekday())
        return start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    elif tracker_type == SpendTracker.MONTH_TRACKER:
        return reference_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif tracker_type == SpendTracker.YEAR_TRACKER:
        return reference_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        raise ValueError(f"Invalid tracker_type: {tracker_type}")

def get_or_create_spend_tracker(customer: Customer, tracker_type: str, reference_date=None):
    """
    Get or create a SpendTracker for the given customer and tracker type for the current period.
    """
    if reference_date is None:
        reference_date = utils.timezone.now()
    
    starting_date = get_starting_date_for_period(tracker_type, reference_date)
    
    tracker, created = SpendTracker.objects.get_or_create(
        customer=customer,
        tracker_type=tracker_type,
        starting_date=starting_date,
        defaults={
            'total_spend': 0,
            'classification_data': {}
        }
    )
    return tracker, created

def handle_summary_clear(user:Customer):
    """
    Ensure SpendTracker instances exist for current periods (week/month/year).
    Creates new trackers if we've moved to a new period.
    """
    now = utils.timezone.now()
    
    # Get or create trackers for current periods
    current_week_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.WEEK_TRACKER, now)
    current_month_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.MONTH_TRACKER, now)
    current_year_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.YEAR_TRACKER, now)
    
    # Check if we need to create new trackers for new periods
    # This will automatically create new ones if they don't exist for the current period
    # The get_or_create handles this, so we don't need to manually check dates


def get_affected_trackers_for_receipt(receipt: Receipt):
    """
    Get all SpendTracker instances that should contain this receipt
    (week, month, year trackers based on receipt date).
    Returns a list of trackers.
    """
    customer = receipt.customer
    receipt_date = receipt.date_bought
    
    time_frames = [SpendTracker.WEEK_TRACKER, SpendTracker.MONTH_TRACKER, SpendTracker.YEAR_TRACKER]
    trackers = []
    
    for tracker_type in time_frames:
        tracker, _ = get_or_create_spend_tracker(customer, tracker_type, receipt_date)
        trackers.append(tracker)
    
    return trackers

def update_summary(total: Decimal, receipt: Receipt):
    """
    Update SpendTracker instances for week, month, and year based on the receipt.
    Adds the receipt to the appropriate trackers and updates their totals.
    """
    trackers = get_affected_trackers_for_receipt(receipt)
    
    for tracker in trackers:
        tracker.receipts.add(receipt)
        
        # Update total spend (convert to Decimal for proper arithmetic)
        tracker.total_spend = tracker.total_spend + total
        
        if receipt.category is not None:
            category_name = receipt.category.category_name
            classification_data = tracker.classification_data or {}
            classification_data[category_name] = round(classification_data.get(category_name, 0) + float(total), 2)
            tracker.classification_data = classification_data
        
        tracker.save()

def update_summary_bulk(receipts: list[Receipt]):
    """
    Same effect as calling update_summary for each receipt, but groups receipts
    that share a week/month/year tracker so each tracker is loaded and saved once.
    """
    if not receipts:
        return

    grouped: dict[tuple, list[Receipt]] = defaultdict(list)
    for receipt in receipts:
        for tracker_type in (
            SpendTracker.WEEK_TRACKER,
            SpendTracker.MONTH_TRACKER,
            SpendTracker.YEAR_TRACKER,
        ):
            starting_date = get_starting_date_for_period(tracker_type, receipt.date_bought)
            grouped[(receipt.customer_id, tracker_type, starting_date)].append(receipt)

    category_ids = {receipt.category_id for receipt in receipts if receipt.category_id}
    categories_by_id = Category.objects.in_bulk(category_ids) if category_ids else {}

    customer_ids = {key[0] for key in grouped}
    tracker_types = {key[1] for key in grouped}
    starting_dates = {key[2] for key in grouped}

    existing = {
        (tracker.customer_id, tracker.tracker_type, tracker.starting_date): tracker
        for tracker in SpendTracker.objects.filter(
            customer_id__in=customer_ids,
            tracker_type__in=tracker_types,
            starting_date__in=starting_dates,
        )
    }

    missing = []
    for customer_id, tracker_type, starting_date in grouped:
        if (customer_id, tracker_type, starting_date) not in existing:
            missing.append(
                SpendTracker(
                    customer_id=customer_id,
                    tracker_type=tracker_type,
                    starting_date=starting_date,
                    total_spend=0,
                    classification_data={},
                )
            )

    with transaction.atomic():
        if missing:
            created = SpendTracker.objects.bulk_create(missing)
            for tracker in created:
                existing[(tracker.customer_id, tracker.tracker_type, tracker.starting_date)] = tracker

        trackers_to_update = []
        through_rows = []
        ThroughModel = SpendTracker.receipts.through
        now = utils.timezone.now()

        for key, group in grouped.items():
            tracker = existing[key]
            classification_data = dict(tracker.classification_data or {})
            total_delta = Decimal("0")

            for receipt in group:
                total_delta += receipt.total_spend
                category = categories_by_id.get(receipt.category_id)
                if category is not None:
                    category_name = category.category_name
                    classification_data[category_name] = round(
                        classification_data.get(category_name, 0) + float(receipt.total_spend),
                        2,
                    )
                through_rows.append(
                    ThroughModel(spendtracker_id=tracker.pk, receipt_id=receipt.pk)
                )

            tracker.total_spend = tracker.total_spend + total_delta
            tracker.classification_data = classification_data
            tracker.last_updated = now
            trackers_to_update.append(tracker)

        SpendTracker.objects.bulk_update(
            trackers_to_update,
            ["total_spend", "classification_data", "last_updated"],
        )
        ThroughModel.objects.bulk_create(through_rows, ignore_conflicts=True)

def remove_receipt_from_trackers(receipt: Receipt):
    """
    Remove a receipt from all trackers and recalculate their totals.
    Call this when a receipt is deleted or its amount/date changes significantly.
    """
    # Get all trackers that contain this receipt
    affected_trackers = receipt.spend_trackers.all()
    
    for tracker in affected_trackers:
        tracker.receipts.remove(receipt)
        tracker.recalculate_from_receipts()

def update_receipt_in_trackers(receipt: Receipt, old_total=None, old_date=None):
    """
    Update trackers when a receipt is modified.
    If old_total or old_date are provided, removes from old trackers and adds to new ones.
    Otherwise, just recalculates affected trackers.
    """
    
    # If date changed, we need to move receipt between trackers
    if old_date is not None and old_date != receipt.date_bought:
        # Remove from old trackers
        old_trackers = get_affected_trackers_for_receipt_at_date(receipt.customer, old_date)
        for tracker in old_trackers:
            if receipt in tracker.receipts.all():
                tracker.receipts.remove(receipt)
                tracker.recalculate_from_receipts()
        
        # Add to new trackers
        new_trackers = get_affected_trackers_for_receipt(receipt)
        for tracker in new_trackers:
            tracker.receipts.add(receipt)
            tracker.total_spend = Decimal(str(tracker.total_spend)) + Decimal(str(receipt.total_spend))
            
            if receipt.category is not None:
                category_name = receipt.category.category_name
                classification_data = tracker.classification_data or {}
                classification_data[category_name] = classification_data.get(category_name, 0) + float(receipt.total_spend)
                tracker.classification_data = classification_data
            
            tracker.save()
    else:
        # Just recalculate all affected trackers
        trackers = receipt.spend_trackers.all()
        for tracker in trackers:
            tracker.recalculate_from_receipts()

def get_affected_trackers_for_receipt_at_date(customer: Customer, receipt_date):
    """
    Helper to get trackers for a specific date (useful when receipt date changes).
    """
    time_frames = [SpendTracker.WEEK_TRACKER, SpendTracker.MONTH_TRACKER, SpendTracker.YEAR_TRACKER]
    trackers = []
    
    for tracker_type in time_frames:
        starting_date = get_starting_date_for_period(tracker_type, receipt_date)
        try:
            tracker = SpendTracker.objects.get(
                customer=customer,
                tracker_type=tracker_type,
                starting_date=starting_date
            )
            trackers.append(tracker)
        except SpendTracker.DoesNotExist:
            # Tracker doesn't exist for this date, skip it
            pass
    
    return trackers
