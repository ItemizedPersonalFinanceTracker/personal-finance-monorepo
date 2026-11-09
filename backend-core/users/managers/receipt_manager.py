from collections import defaultdict
from decimal import Decimal

from financeproject.app_settings import APP_SETTINGS
from users.models import Receipt
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
