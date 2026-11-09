from rest_framework import serializers

from users.models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["category_id", "category_name"]
        read_only_fields = ["category_id"]

    def validate_category_name(self, value):
        return value.strip().lower()
