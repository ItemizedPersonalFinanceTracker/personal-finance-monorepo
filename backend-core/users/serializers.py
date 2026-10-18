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
        read_only_fields = ["id", "last_updated"]


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


class ReceiptSerializer(serializers.Serializer):
    total = serializers.DecimalField(max_digits=19, decimal_places=2)
    storeName = serializers.CharField()
    dateBought = serializers.DateTimeField(required=False, allow_null=True, default=None)
    category_name = serializers.CharField(required=False, allow_null=True, default=None)
    image = serializers.ImageField(required=False, allow_null=True, default=None)


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
    class Meta:
        model = Item
        fields = ["name", "price"]


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
