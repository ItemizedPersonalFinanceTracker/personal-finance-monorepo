from rest_framework import serializers

from users.models import SpendTracker


class SpendTrackerSerializer(serializers.ModelSerializer):
    classification_data = serializers.SerializerMethodField()

    class Meta:
        model = SpendTracker
        fields = [
            "id",
            "total_spend",
            "tracker_type",
            "starting_date",
            "last_updated",
            "classification_data",
        ]
        read_only_fields = ["id", "last_updated", "classification_data"]

    def get_classification_data(self, obj):
        return {
            row.category.category_name: float(row.amount)
            for row in obj.category_amounts.all()
        }
