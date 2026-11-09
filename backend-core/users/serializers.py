import json

from rest_framework import serializers

from users.models import Category, Customer, Item, Receipt, SpendTracker, UserConfig


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Customer
        fields = ("name", "email", "password")

    def create(self, validated_data):
        user = Customer.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
            username=validated_data["email"],
        )
        return user


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


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["category_id", "category_name"]
        read_only_fields = ["category_id"]

    def validate_category_name(self, value):
        return value.strip().lower()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("name", "created_at")


class UserConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserConfig
        fields = ["config", "value"]


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


class ReceiptSerializer(serializers.Serializer):
    total = serializers.DecimalField(max_digits=19, decimal_places=2)
    storeName = serializers.CharField()
    dateBought = serializers.DateTimeField(required=False, allow_null=True, default=None)
    category_name = serializers.CharField(required=False, allow_null=True, default=None)
    image = serializers.ImageField(required=False, allow_null=True, default=None)
    items = ItemWriteSerializer(many=True, required=False)

    def to_internal_value(self, data):
        raw_items = data.get("items") if hasattr(data, "get") else None
        if isinstance(raw_items, str):
            parsed = self._parse_items(raw_items)
            if hasattr(data, "lists"):
                data = {key: data.get(key) for key in data}
            else:
                data = data.copy()
            data["items"] = parsed
        return super().to_internal_value(data)

    @staticmethod
    def _parse_items(raw):
        if not raw.strip():
            return []
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError({"items": "Items must be a JSON list."}) from exc
        if parsed is None:
            return []
        if not isinstance(parsed, list):
            raise serializers.ValidationError({"items": "Items must be a list."})
        return parsed


class ImageReceiptSerializer(serializers.Serializer):
    receiptImage = serializers.ImageField()

class ReceiptBulkSerializer(serializers.Serializer):
    receipts = ReceiptSerializer(many=True, allow_empty=False)

    def validate_receipts(self, value):
        for receipt in value:
            if not (receipt.get("storeName") or "").strip():
                raise serializers.ValidationError("Each receipt needs a store name.")
            if not receipt.get("dateBought"):
                raise serializers.ValidationError("Each receipt needs a date.")
        return value


class ReceiptListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ["receipt_id", "store_name", "date_bought", "total_spend", "category_id"]


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ["id", "name", "price", "category_name"]

    def get_category_name(self, obj):
        return obj.category.category_name if obj.category else None


class ReceiptDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    items = ItemSerializer(many=True, read_only=True)

    def get_category_name(self, obj):
        return obj.category.category_name if obj.category else None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    class Meta:
        model = Receipt
        fields = [
            "receipt_id",
            "total_spend",
            "image_url",
            "date_bought",
            "store_name",
            "category_name",
            "image_processed",
            "last_updated",
            "items",
        ]
