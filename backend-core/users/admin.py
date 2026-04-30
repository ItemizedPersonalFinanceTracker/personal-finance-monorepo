from django.contrib import admin

# from . import models
from users.models import Category, Customer, Receipt, SpendTracker

# Register your models here.
admin.site.register(Customer)
admin.site.register(Receipt)
admin.site.register(Category)
admin.site.register(SpendTracker)
