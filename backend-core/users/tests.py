from datetime import datetime
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from users.models import Category, Customer, SpendTracker, SpendTrackerCategory
from users.services.receipt_utilities import _bulk_create_receipts, _create_receipt


class ReceiptCategorySplitTests(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(
            email="tracker@example.com",
            password="password",
            name="Tracker",
            username="tracker@example.com",
        )
        Category.objects.create(category_name="grocery", customer=self.user)
        Category.objects.create(category_name="household", customer=self.user)
        self.bought = timezone.make_aware(datetime(2026, 11, 8, 12, 0))

    def _amounts(self):
        tracker = SpendTracker.objects.get(
            customer=self.user,
            tracker_type=SpendTracker.MONTH_TRACKER,
            starting_date__year=2026,
            starting_date__month=11,
        )
        return {
            row.category.category_name: row.amount
            for row in SpendTrackerCategory.objects.filter(tracker=tracker).select_related("category")
        }

    def test_other_item_categories_are_split_from_the_receipt_category(self):
        _create_receipt(
            self.user,
            Decimal("40.00"),
            "Store",
            date_bought=self.bought,
            category_name="grocery",
            items=[{"name": "Soap", "price": Decimal("18.00"), "category_name": "household"}],
        )

        self.assertEqual(self._amounts(), {"grocery": Decimal("22.00"), "household": Decimal("18.00")})

    def test_bulk_import_rejects_items(self):
        with self.assertRaises(AssertionError):
            _bulk_create_receipts(
                self.user,
                [{
                    "total": Decimal("10.00"),
                    "storeName": "Store",
                    "dateBought": self.bought,
                    "category_name": "grocery",
                    "items": [{"name": "Soap", "price": Decimal("4.00"), "category_name": "household"}],
                }],
            )
