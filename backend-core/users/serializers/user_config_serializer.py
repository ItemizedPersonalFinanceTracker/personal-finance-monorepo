from rest_framework import serializers

from users.models import UserConfig


class UserConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserConfig
        fields = ["config", "value"]
