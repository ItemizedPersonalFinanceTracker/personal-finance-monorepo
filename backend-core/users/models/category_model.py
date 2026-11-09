from django.db import models

from users.models.customer_model import Customer


class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=200)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name = "categories")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['category_name', 'customer'],
                name='no_duplicate_categories_for_customer'
            )
        ]
