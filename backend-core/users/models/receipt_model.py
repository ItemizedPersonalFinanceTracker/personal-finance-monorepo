from django.db import models
from django.utils.timezone import now

from users.models.category_model import Category
from users.models.customer_model import Customer


class Receipt(models.Model):
    receipt_id = models.AutoField(primary_key=True)
    total_spend = models.DecimalField(max_digits=19, decimal_places=2)
    image = models.ImageField(upload_to='receipts/', blank=True, null=True)
    image_processed = models.BooleanField(default=False)
    date_bought = models.DateTimeField(default = now)
    last_updated = models.DateTimeField(auto_now=True)
    store_name = models.CharField(max_length=200) #maybe change to allow blank later
    category = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL, related_name="receipts") # maybe change to set default later 
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="receipts")
