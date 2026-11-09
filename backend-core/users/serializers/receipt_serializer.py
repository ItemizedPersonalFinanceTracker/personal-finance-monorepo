import json

from rest_framework import serializers

from users.models import Receipt
from users.serializers.item_serializer import ItemSerializer, ItemWriteSerializer


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


class ReceiptDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    items = ItemSerializer(many=True, read_only=True)

    def get_category_name(self, obj):
        return obj.category.category_name if obj.category else None

    def get_image_url(self, obj):
        if not obj.image:
            return None
        url = obj.image.url
        if url.startswith(("http://", "https://")):
            return url
        if not url.startswith("/"):
            url = f"/{url}"
        return url

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
