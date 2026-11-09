from django.db import models

from users.models.category_model import Category
from users.models.receipt_model import Receipt


class Item(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=19, decimal_places=2)
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL, related_name="items") # maybe change to set default later 
