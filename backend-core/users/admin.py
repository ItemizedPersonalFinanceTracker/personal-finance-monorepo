from django.contrib import admin

# from . import models
from users.models import Category, Customer, Receipt, SpendTracker, SpendTrackerCategory, UserConfig

# Register your models here.
admin.site.register(Customer)
admin.site.register(Receipt)
admin.site.register(Category)
admin.site.register(SpendTracker)
admin.site.register(SpendTrackerCategory)
admin.site.register(UserConfig)
