from django.db import models

from users.models.customer_model import Customer


class UserConfigChoices(models.TextChoices):
    BYPASS_IMAGE_PROCESSING_POPUP = "BYPASS_IMAGE_PROCESSING_POPUP", "Show popup for image processing"
    ALLOW_IMAGE_PROCESSING = "ALLOW_IMAGE_PROCESSING", "Allow image processing"


class UserConfig(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="configs")
    config = models.CharField(max_length=64, choices=UserConfigChoices.choices)
    value = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "config"],
                name="unique_customer_config",
            )
        ]
