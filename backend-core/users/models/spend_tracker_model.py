from django.db import models

from users.models.customer_model import Customer
from users.models.receipt_model import Receipt


class SpendTracker(models.Model):
    total_spend = models.DecimalField(max_digits=19, decimal_places=2, default=0)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="spend_trackers")
    
    starting_date = models.DateTimeField()

    MONTH_TRACKER = "month"
    WEEK_TRACKER = "week"
    YEAR_TRACKER = "year"


    TRACKER_TYPE_CHOICES = [
        (MONTH_TRACKER, "Month"),
        (WEEK_TRACKER, "Week"),
        (YEAR_TRACKER, "Year"),
    ]
    tracker_type = models.CharField(max_length=20, choices=TRACKER_TYPE_CHOICES)
    last_updated = models.DateTimeField(auto_now=True)

    # Deprecated. Category totals are stored on SpendTrackerCategory. This copy is left in place.
    classification_data = models.JSONField(
        default=dict,
        help_text="Deprecated. Use SpendTrackerCategory rows instead.",
    )

    # Many-to-Many relationship with Receipts
    # A receipt can belong to multiple trackers (week, month, year)
    receipts = models.ManyToManyField(Receipt, related_name="spend_trackers", blank=True)

    class Meta:
        unique_together = [['customer', 'tracker_type', 'starting_date']]
