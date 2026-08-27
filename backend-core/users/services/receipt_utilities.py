from decimal import Decimal
from django.utils.dateparse import parse_datetime
from users.models import Category, Receipt
from users.util import find_or_create_category, update_receipt_in_trackers, update_summary, update_summary_bulk


def _create_receipt(user, total: Decimal, store_name, image=None, date_bought=None, category_name=None):
    """Shared receipt creation logic for both manual and image-based flows."""
    receipt = Receipt(
        total_spend=total,
        store_name=store_name,
        customer=user,
    )
    if image is not None:
        receipt.image = image
    if date_bought is not None:
        receipt.date_bought = date_bought
    if category_name is not None:
        category = find_or_create_category(category_name, user)
        receipt.category = category
        category.save()

    receipt.save()
    update_summary(total, receipt)
    return receipt


def _bulk_create_receipts(user, receipts: list[dict]):
    """Bulk create receipts using the same field names as a single manual receipt."""
    distinct_names = set()
    for receipt in receipts:
        category_name = receipt.get("category_name")
        if category_name:
            distinct_names.add(category_name.strip().lower())

    category_objects = {
        category.category_name: category
        for category in Category.objects.filter(
            category_name__in=distinct_names,
            customer=user,
        )
    }
    missing = [
        Category(category_name=name, customer=user)
        for name in distinct_names
        if name not in category_objects
    ]
    if missing:
        for category in Category.objects.bulk_create(missing):
            category_objects[category.category_name] = category

    receipts_objects = []
    for receipt in receipts:
        temp_receipt = Receipt(
            total_spend=receipt["total"],
            store_name=receipt["storeName"].strip(),
            customer=user,
        )
        if receipt.get("dateBought") is not None:
            temp_receipt.date_bought = receipt["dateBought"]

        category_name = receipt.get("category_name")
        if category_name:
            temp_receipt.category = category_objects[category_name.strip().lower()]
        receipts_objects.append(temp_receipt)

    created = Receipt.objects.bulk_create(receipts_objects)
    update_summary_bulk(created)
    return created

def _update_receipt(
    receipt,
    total=None,
    store_name=None,
    date_bought=None,
    category_name=None,
    update_category=False,
):
    """Apply validated manual-receipt fields and keep spend trackers in sync."""
    old_date = receipt.date_bought

    if total is not None:
        receipt.total_spend = total
    if store_name is not None:
        receipt.store_name = store_name
    if date_bought is not None:
        receipt.date_bought = date_bought

    if update_category:
        if category_name:
            category = find_or_create_category(category_name, receipt.customer)
            receipt.category = category
            category.save()
        else:
            receipt.category = None

    receipt.save()
    update_receipt_in_trackers(receipt, old_date=old_date)
    return receipt


def _apply_receipt_filters(queryset, request):
    """
    Apply query param filters to receipts queryset.
    Supports: min_total, max_total, date_from, date_to, category_id
    """
    params = request.query_params

    if min_total := params.get("min_total"):
        try:
            queryset = queryset.filter(total_spend__gte=float(min_total))
        except (ValueError, TypeError):
            pass

    if max_total := params.get("max_total"):
        try:
            queryset = queryset.filter(total_spend__lte=float(max_total))
        except (ValueError, TypeError):
            pass

    if date_from := params.get("date_from"):
        if parsed := parse_datetime(date_from):
            queryset = queryset.filter(date_bought__gte=parsed)

    if date_to := params.get("date_to"):
        if parsed := parse_datetime(date_to):
            queryset = queryset.filter(date_bought__lte=parsed)

    if category_id := params.get("category_id"):
        try:
            queryset = queryset.filter(
                category_id=int(category_id),
                category__customer=request.user,
            )
        except (ValueError, TypeError):
            pass

    return queryset
