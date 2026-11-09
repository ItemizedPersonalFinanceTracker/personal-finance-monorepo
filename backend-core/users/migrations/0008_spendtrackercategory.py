from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def copy_classification_to_rows(apps, schema_editor):
    SpendTracker = apps.get_model("users", "SpendTracker")
    SpendTrackerCategory = apps.get_model("users", "SpendTrackerCategory")
    Category = apps.get_model("users", "Category")
    rows = []
    for tracker in SpendTracker.objects.all().iterator():
        data = tracker.classification_data or {}
        if not data:
            continue
        categories = {
            category.category_name: category.pk
            for category in Category.objects.filter(
                customer_id=tracker.customer_id,
                category_name__in=list(data.keys()),
            )
        }
        for name, amount in data.items():
            category_id = categories.get(name)
            if category_id is None:
                continue
            rows.append(
                SpendTrackerCategory(
                    tracker_id=tracker.pk,
                    category_id=category_id,
                    amount=Decimal(str(amount)),
                )
            )
    if rows:
        SpendTrackerCategory.objects.bulk_create(rows)


def copy_rows_to_classification(apps, schema_editor):
    SpendTracker = apps.get_model("users", "SpendTracker")
    SpendTrackerCategory = apps.get_model("users", "SpendTrackerCategory")
    for tracker in SpendTracker.objects.all().iterator():
        data = {}
        amounts = SpendTrackerCategory.objects.filter(tracker_id=tracker.pk).select_related("category")
        for row in amounts:
            data[row.category.category_name] = float(row.amount)
        tracker.classification_data = data
        tracker.save(update_fields=["classification_data"])


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_userconfig"),
    ]

    operations = [
        migrations.CreateModel(
            name="SpendTrackerCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=19)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tracker_amounts",
                        to="users.category",
                    ),
                ),
                (
                    "tracker",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="category_amounts",
                        to="users.spendtracker",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("tracker", "category"),
                        name="unique_tracker_category_amount",
                    )
                ],
            },
        ),
        migrations.RunPython(copy_classification_to_rows, copy_rows_to_classification),
    ]
