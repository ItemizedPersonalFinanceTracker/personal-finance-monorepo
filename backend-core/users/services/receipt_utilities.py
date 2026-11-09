from decimal import Decimal
from django.db import transaction
from django.utils.dateparse import parse_datetime
from users.models import Category, Item, Receipt
from users.util import find_or_create_category, update_receipt_in_trackers, update_summary, update_summary_bulk


def _category_key(category_name):
    if not category_name:
        return None
    return category_name.strip().lower() or None


def _save_items(receipt, user, items, category_objects=None):
    if not items:
        return
    rows = []
    resolved = {}
    for item in items:
        category = None
        key = _category_key(item.get("category_name"))
        if key:
            if category_objects is not None:
                category = category_objects[key]
            elif key in resolved:
                category = resolved[key]
            else:
                category = find_or_create_category(key, user)
                resolved[key] = category
        rows.append(
            Item(
                name=item["name"],
                price=item["price"],
                receipt=receipt,
                category=category,
            )
        )
    Item.objects.bulk_create(rows)


def _create_receipt(user, total: Decimal, store_name, image=None, date_bought=None, category_name=None, items=None):
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

    with transaction.atomic():
        receipt.save()
        _save_items(receipt, user, items)
        update_summary(total, receipt)
    return receipt


def _bulk_create_receipts(user, receipts: list[dict]):
    """Bulk create receipts using the same field names as a single manual receipt."""
    distinct_names = set()
    for receipt in receipts:
        category_name = _category_key(receipt.get("category_name"))
        if category_name:
            distinct_names.add(category_name)
        for item in receipt.get("items") or []:
            item_category = _category_key(item.get("category_name"))
            if item_category:
                distinct_names.add(item_category)

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

    with transaction.atomic():
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

            category_name = _category_key(receipt.get("category_name"))
            if category_name:
                temp_receipt.category = category_objects[category_name]
            receipts_objects.append(temp_receipt)

        created = Receipt.objects.bulk_create(receipts_objects)
        for source, receipt_obj in zip(receipts, created):
            _save_items(receipt_obj, user, source.get("items"), category_objects)
        update_summary_bulk(created)
    return created

def _update_receipt(
    receipt,
    total=None,
    store_name=None,
    date_bought=None,
    category_name=None,
    update_category=False,
    items=None,
    update_items=False,
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

    with transaction.atomic():
        receipt.save()
        if update_items:
            receipt.items.all().delete()
            _save_items(receipt, receipt.customer, items)
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
