from datetime import datetime

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from users.managers.spend_tracker_manager import get_or_create_spend_tracker
from users.models import SpendTracker
from users.serializers.customer_serializer import ProfileSerializer, RegisterSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create initial SpendTracker instances for current periods
        now = datetime.now()
        get_or_create_spend_tracker(user, SpendTracker.WEEK_TRACKER, now)
        get_or_create_spend_tracker(user, SpendTracker.MONTH_TRACKER, now)
        get_or_create_spend_tracker(user, SpendTracker.YEAR_TRACKER, now)

        return Response(
            {"id": user.id, "email": user.email},
            status=status.HTTP_201_CREATED
        )


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(APIView):
    def get(self, request, format=None):
        return Response(ProfileSerializer(request.user).data)
