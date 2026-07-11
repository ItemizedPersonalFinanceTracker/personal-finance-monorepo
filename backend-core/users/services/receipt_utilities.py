from decimal import Decimal
from django.utils.dateparse import parse_datetime
from users.models import Receipt
from users.util import find_or_create_category, update_summary


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
