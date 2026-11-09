from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django import utils
from django.db import transaction
from django.db.models import Max

from financeproject.app_settings import APP_SETTINGS
from users.models import (
    Category,
    Customer,
    Item,
    Receipt,
    SpendTracker,
    SpendTrackerCategory,
)
from users.services.gemini_provider import GeminiProvider


def _extract_with_gemini(image_file, category_choices: list[str]) -> dict:
    result = GeminiProvider().receipt_process(image_file, category_choices)
    return result.model_dump(mode="json")


def extract_receipt_data(image_file, category_choices: list[str]) -> dict:
    """
    Extract receipt fields from an image.
    Add another extractor here when swapping providers.
    """
    if APP_SETTINGS.USE_GEMINI:
        return _extract_with_gemini(image_file, category_choices)
    raise ValueError("No receipt extraction method is configured.")


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
        }
    )
    return tracker, created

def _next_period_start(tracker_type: str, starting_date):
    if tracker_type == SpendTracker.WEEK_TRACKER:
        return get_starting_date_for_period(tracker_type, starting_date + timedelta(weeks=1))
    if tracker_type == SpendTracker.MONTH_TRACKER:
        year = starting_date.year + (starting_date.month == 12)
        month = 1 if starting_date.month == 12 else starting_date.month + 1
        return get_starting_date_for_period(
            tracker_type, starting_date.replace(year=year, month=month, day=1)
        )
    if tracker_type == SpendTracker.YEAR_TRACKER:
        return get_starting_date_for_period(
            tracker_type, starting_date.replace(year=starting_date.year + 1, month=1, day=1)
        )
    raise ValueError(f"Invalid tracker_type: {tracker_type}")

def backfill_empty_spend_trackers(customer: Customer | None = None):
    """
    For each tracker type, find the latest SpendTracker and create an empty one
    for every period after it through the current period.
    """
    now = utils.timezone.now()
    trackers = SpendTracker.objects.all()
    if customer is not None:
        trackers = trackers.filter(customer=customer)

    latest_by_type = trackers.values("customer_id", "tracker_type").annotate(
        latest_start=Max("starting_date")
    )

    to_create = []
    for row in latest_by_type:
        tracker_type = row["tracker_type"]
        current_start = get_starting_date_for_period(tracker_type, now)
        period_start = _next_period_start(tracker_type, row["latest_start"])
        while period_start <= current_start:
            to_create.append(
                SpendTracker(
                    customer_id=row["customer_id"],
                    tracker_type=tracker_type,
                    starting_date=period_start,
                    total_spend=0,
                    last_updated=now,
                )
            )
            period_start = _next_period_start(tracker_type, period_start)

    if not to_create:
        return []
    # Another request may insert the same periods first. The unique key makes those no-ops.
    return SpendTracker.objects.bulk_create(to_create, ignore_conflicts=True)

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

def receipt_category_amounts(receipt: Receipt) -> dict[int, Decimal]:
    """
    Group item prices by category, excluding the receipt's own category.
    That category receives the rest of total_spend, including its own items.
    """
    grouped: dict[int, Decimal] = defaultdict(Decimal)
    for item in receipt.items.all():
        if item.category_id is None:
            continue
        grouped[item.category_id] += item.price

    amounts = {
        category_id: amount
        for category_id, amount in grouped.items()
        if category_id != receipt.category_id
    }
    other_sum = sum(amounts.values(), Decimal("0"))
    if receipt.category_id is not None:
        leftover = receipt.total_spend - other_sum
        if leftover != 0:
            amounts[receipt.category_id] = leftover
    return amounts

def recalculate_from_receipts(tracker: SpendTracker):
    """Rebuild a tracker's total and category rows from its receipts."""
    receipts = tracker.receipts.prefetch_related("items")
    tracker.total_spend = Decimal("0")
    category_totals = {}

    for receipt in receipts:
        tracker.total_spend += receipt.total_spend
        for category_id, amount in receipt_category_amounts(receipt).items():
            category_totals[category_id] = category_totals.get(category_id, Decimal("0")) + amount

    tracker.save()
    tracker.category_amounts.all().delete()
    SpendTrackerCategory.objects.bulk_create([
        SpendTrackerCategory(tracker=tracker, category_id=category_id, amount=amount)
        for category_id, amount in category_totals.items()
    ])

def add_category_amount(tracker: SpendTracker, category_id: int, amount: Decimal):
    """Add amount onto the single category row for this tracker."""
    if not category_id or amount == 0:
        return
    row, created = SpendTrackerCategory.objects.get_or_create(
        tracker=tracker,
        category_id=category_id,
        defaults={"amount": amount},
    )
    if created:
        return
    row.amount += amount
    row.save(update_fields=["amount"])

def update_summary(total: Decimal, receipt: Receipt):
    """
    Update SpendTracker instances for week, month, and year based on the receipt.
    Adds the receipt to the appropriate trackers and updates their totals.
    """
    trackers = get_affected_trackers_for_receipt(receipt)
    amounts = receipt_category_amounts(receipt)

    for tracker in trackers:
        tracker.receipts.add(receipt)
        
        # Update total spend (convert to Decimal for proper arithmetic)
        tracker.total_spend = tracker.total_spend + total
        for category_id, amount in amounts.items():
            add_category_amount(tracker, category_id, amount)
        tracker.save()

def update_summary_bulk(receipts: list[Receipt]):
    """
    Same effect as calling update_summary for each receipt, but groups receipts
    that share a week/month/year tracker so each tracker is loaded and saved once.
    """
    if not receipts:
        return

    assert not Item.objects.filter(receipt_id__in=[receipt.pk for receipt in receipts]).exists(), (
        "Bulk receipt import does not support items."
    )

    grouped: dict[tuple, list[Receipt]] = defaultdict(list)
    for receipt in receipts:
        for tracker_type in (
            SpendTracker.WEEK_TRACKER,
            SpendTracker.MONTH_TRACKER,
            SpendTracker.YEAR_TRACKER,
        ):
            starting_date = get_starting_date_for_period(tracker_type, receipt.date_bought)
            grouped[(receipt.customer_id, tracker_type, starting_date)].append(receipt)

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
            total_delta = Decimal("0")
            category_deltas = defaultdict(Decimal)

            for receipt in group:
                total_delta += receipt.total_spend
                if receipt.category_id is not None:
                    category_deltas[receipt.category_id] += receipt.total_spend
                through_rows.append(
                    ThroughModel(spendtracker_id=tracker.pk, receipt_id=receipt.pk)
                )

            tracker.total_spend = tracker.total_spend + total_delta
            tracker.last_updated = now
            trackers_to_update.append(tracker)
            for category_id, amount in category_deltas.items():
                add_category_amount(tracker, category_id, amount)

        SpendTracker.objects.bulk_update(
            trackers_to_update,
            ["total_spend", "last_updated"],
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
        recalculate_from_receipts(tracker)

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
                recalculate_from_receipts(tracker)
        
        # Add to new trackers
        new_trackers = get_affected_trackers_for_receipt(receipt)
        amounts = receipt_category_amounts(receipt)
        for tracker in new_trackers:
            tracker.receipts.add(receipt)
            tracker.total_spend = Decimal(str(tracker.total_spend)) + Decimal(str(receipt.total_spend))
            for category_id, amount in amounts.items():
                add_category_amount(tracker, category_id, amount)
            tracker.save()
    else:
        # Just recalculate all affected trackers
        trackers = receipt.spend_trackers.all()
        for tracker in trackers:
            recalculate_from_receipts(tracker)

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
