from datetime import datetime
from django.utils.dateparse import parse_datetime

from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from users.util import (
    extract_receipt_data,
    get_or_create_spend_tracker,
    handle_summary_clear,
    remove_receipt_from_trackers,
)
from users.serializers import (
    CategorySerializer,
    ImageReceiptSerializer,
    ManualReceiptSerializer,
    ReceiptDetailSerializer,
    ReceiptListSerializer,
    RegisterSerializer,
    SpendTrackerSerializer,
)
from users.models import Category, Receipt, SpendTracker
from users.services.receipt_utilities import _create_receipt, _apply_receipt_filters


class ReceiptListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class HelloWorld(APIView):

    def get(self, request, format=None):
        return Response({"message": "Hello World", "format": format, "params":request.query_params})
    

class AccountSummaryView(APIView):

    def get(self, request:Request, format=None):
        user = request.user
        # Ensure current period trackers exist
        handle_summary_clear(user)
        
        # Get current period trackers
        now = datetime.now()
        week_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.WEEK_TRACKER, now)
        month_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.MONTH_TRACKER, now)
        year_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.YEAR_TRACKER, now)
        
        serializer = SpendTrackerSerializer([week_tracker, month_tracker, year_tracker], many=True)
        return Response({
            'week': serializer.data[0],
            'month': serializer.data[1],
            'year': serializer.data[2]
        })



class ReceiptView(APIView):
    pagination_class = ReceiptListPagination

    def get(self, request, format=None):
        receipts = Receipt.objects.filter(customer=request.user)
        receipts = _apply_receipt_filters(receipts, request)
        receipts = receipts.order_by("-date_bought")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(receipts, request)
        serializer = ReceiptListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, format=None):
        ser = ManualReceiptSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        receipt = _create_receipt(
            user=request.user,
            total=data["total"],
            store_name=data["storeName"],
            date_bought=data["dateBought"],
            category_name=data["category_name"],
        )
        return Response({"receipt_id": receipt.receipt_id}, status=status.HTTP_201_CREATED)


class ReceiptDetailView(APIView):
    def get(self, request, pk, format=None):
        try:
            receipt = Receipt.objects.prefetch_related("items").get(
                receipt_id=pk, customer=request.user
            )
        except Receipt.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ReceiptDetailSerializer(receipt, context={"request": request})
        return Response(serializer.data)

    def delete(self, request, pk, format=None):
        try:
            receipt = Receipt.objects.get(receipt_id=pk, customer=request.user)
        except Receipt.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        remove_receipt_from_trackers(receipt)
        if receipt.image:
            receipt.image.delete(save=False)
        receipt.delete()
        return Response(status=status.HTTP_200_OK)


class ReceiptScanView(APIView):

    def post(self, request, format=None):
        ser = ImageReceiptSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        image_file = data["receiptImage"]
        extracted = extract_receipt_data(image_file)

        total = data["total"] if data["total"] is not None else extracted.get("total")
        store_name = data["storeName"] if data["storeName"] is not None else extracted.get("storeName")

        if total is None or store_name is None:
            return Response(
                {"error": "Could not extract store name and total from the image. Please provide them manually."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        receipt = _create_receipt(
            user=request.user,
            total=total,
            store_name=store_name,
            image=image_file,
            date_bought=data["dateBought"],
            category_name=data["category_name"],
        )
        return Response({"receipt_id": receipt.receipt_id}, status=status.HTTP_201_CREATED)



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



class CategoryView(APIView):
    def get(self, request, pk=None, format=None):
        if pk is not None:
            try:
                category = Category.objects.get(category_id=pk, customer=request.user)
            except Category.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
            serializer = CategorySerializer(category)
            return Response(serializer.data)

        categories = Category.objects.filter(customer=request.user).order_by("category_name")
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request, format=None):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk, format=None):
        try:
            category = Category.objects.get(category_id=pk, customer=request.user)
        except Category.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = CategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

