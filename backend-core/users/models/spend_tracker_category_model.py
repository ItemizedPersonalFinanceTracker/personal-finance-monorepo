from django.db import models

from users.models.category_model import Category
from users.models.spend_tracker_model import SpendTracker


class SpendTrackerCategory(models.Model):
    tracker = models.ForeignKey(SpendTracker, on_delete=models.CASCADE, related_name="category_amounts")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="tracker_amounts")
    amount = models.DecimalField(max_digits=19, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tracker", "category"],
                name="unique_tracker_category_amount",
            )
        ]
