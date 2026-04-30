from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import BaseUserManager
from django.utils.timezone import now
from decimal import Decimal
# Create your models here.

class CustomerManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # hashes password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

class Customer(AbstractUser):
    objects = CustomerManager()

    # customer_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    # password_hash = models.CharField(max_length=255)
    # salt = models.CharField(max_length=255)

    password_last_changed = models.DateTimeField(null=True, blank=True)

    password_reset_token = models.CharField(max_length=255, null=True, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)

    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, null=True, blank=True)
    email_verification_expires = models.DateTimeField(null=True, blank=True)

    failed_login_attempts = models.IntegerField(default=0)
    last_login_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=200, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name = "categories")

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
    

class Item(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=19, decimal_places=2)
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey(Category, null=True, on_delete=models.SET_NULL, related_name="items") # maybe change to set default later 


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

    classification_data = models.JSONField(default=dict)
    
    # Many-to-Many relationship with Receipts
    # A receipt can belong to multiple trackers (week, month, year)
    receipts = models.ManyToManyField(Receipt, related_name="spend_trackers", blank=True)

    class Meta:
        unique_together = [['customer', 'tracker_type', 'starting_date']]
    
    def recalculate_from_receipts(self):
        """
        Recalculate total_spend and classification_data from associated receipts.
        Useful for data integrity checks or when receipts are updated.
        """
        
        
        receipts = self.receipts.all()
        self.total_spend = Decimal('0')
        self.classification_data = {}
        
        for receipt in receipts:
            self.total_spend += receipt.total_spend
            
            if receipt.category is not None:
                category_name = receipt.category.category_name
                current_value = self.classification_data.get(category_name, 0)
                self.classification_data[category_name] = current_value + float(receipt.total_spend)
        
        self.save()