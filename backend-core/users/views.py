from datetime import datetime, timedelta
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone as dj_timezone

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
    ReceiptBulkSerializer,
    ReceiptDetailSerializer,
    ReceiptListSerializer,
    RegisterSerializer,
    SpendTrackerSerializer,
)
from users.models import Category, Receipt, SpendTracker
from users.services.receipt_utilities import _apply_receipt_filters, _bulk_create_receipts, _create_receipt, _update_receipt


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

class SpendingTrackerView(APIView):
    def get(self, request, format=None):
        user = request.user
        tracker_type = request.query_params.get("tracker_type")
        if tracker_type not in [SpendTracker.WEEK_TRACKER, SpendTracker.MONTH_TRACKER, SpendTracker.YEAR_TRACKER]:
            tracker_type = SpendTracker.MONTH_TRACKER
        start_date_param = request.query_params.get("start_date")
        start_date = parse_datetime(start_date_param) if start_date_param else None
        if start_date is None and start_date_param:
            parsed_date = parse_date(start_date_param)
            if parsed_date is not None:
                start_date = datetime.combine(parsed_date, datetime.min.time())
        if start_date is None:
            start_date = dj_timezone.now() - timedelta(days=365 * 5)
        elif dj_timezone.is_naive(start_date):
            start_date = dj_timezone.make_aware(start_date, dj_timezone.get_current_timezone())
        trackers = SpendTracker.objects.filter(
            customer=user, tracker_type=tracker_type, starting_date__gte=start_date
        ).order_by("starting_date")
        serializer = SpendTrackerSerializer(trackers, many=True)
        return Response(serializer.data)


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

    def put(self, request, pk, format=None):
        try:
            receipt = Receipt.objects.get(receipt_id=pk, customer=request.user)
        except Receipt.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ManualReceiptSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        receipt = _update_receipt(
            receipt,
            total=data.get("total"),
            store_name=data.get("storeName"),
            date_bought=data.get("dateBought"),
            category_name=data.get("category_name"),
            update_category="category_name" in request.data,
        )
        return Response({"receipt_id": receipt.receipt_id})

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

class ReceiptBulkView(APIView):
    def post(self, request, format=None):
        ser = ReceiptBulkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        receipts = _bulk_create_receipts(request.user, data["receipts"])
        return Response(
            {"receipt_ids": [receipt.receipt_id for receipt in receipts]},
            status=status.HTTP_201_CREATED,
        )

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

