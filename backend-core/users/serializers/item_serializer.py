from rest_framework import serializers

from users.models import Item


class ItemWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    price = serializers.DecimalField(max_digits=19, decimal_places=2)
    category_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Item name is required.")
        return value

    def validate_category_name(self, value):
        if value is None:
            return None
        return value.strip().lower() or None


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ["id", "name", "price", "category_name"]

    def get_category_name(self, obj):
        return obj.category.category_name if obj.category else None
