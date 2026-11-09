from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import UserConfig, UserConfigChoices
from users.serializers.user_config_serializer import UserConfigSerializer


class UserConfigView(APIView):
    def get(self, request, format=None):
        configs = {
            row.config: row
            for row in UserConfig.objects.filter(customer=request.user)
        }
        for choice in UserConfigChoices.values:
            if choice not in configs:
                configs[choice] = UserConfig.objects.create(
                    customer=request.user,
                    config=choice,
                    value=False,
                )
        ordered = [configs[choice] for choice in UserConfigChoices.values]
        return Response(UserConfigSerializer(ordered, many=True).data)

    def put(self, request, format=None):
        serializer = UserConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config, _created = UserConfig.objects.update_or_create(
            customer=request.user,
            config=serializer.validated_data["config"],
            defaults={"value": serializer.validated_data["value"]},
        )
        return Response(UserConfigSerializer(config).data)
