from rest_framework import serializers

from users.models import Customer


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


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("name", "created_at")
