import time

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from financeproject.app_settings import APP_SETTINGS
from users.managers.receipt_manager import extract_receipt_data
from users.managers.spend_tracker_manager import remove_receipt_from_trackers
from users.models import Category, Receipt
from users.serializers.receipt_serializer import (
    ImageReceiptSerializer,
    ReceiptBulkSerializer,
    ReceiptDetailSerializer,
    ReceiptListSerializer,
    ReceiptSerializer,
)
from users.services.receipt_utilities import (
    _apply_receipt_filters,
    _bulk_create_receipts,
    _create_receipt,
    _update_receipt,
)


class ReceiptListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


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
        ser = ReceiptSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data            

        receipt = _create_receipt(
            user=request.user,
            total=data["total"],
            store_name=data["storeName"],
            image=data["image"],
            date_bought=data["dateBought"],
            category_name=data["category_name"],
            items=data.get("items"),
        )
        return Response({"receipt_id": receipt.receipt_id}, status=status.HTTP_201_CREATED)


class ReceiptDetailView(APIView):
    def get(self, request, pk, format=None):
        try:
            receipt = Receipt.objects.prefetch_related("items__category").get(
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

        serializer = ReceiptSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        receipt = _update_receipt(
            receipt,
            total=data.get("total"),
            store_name=data.get("storeName"),
            date_bought=data.get("dateBought"),
            category_name=data.get("category_name"),
            update_category="category_name" in request.data,
            items=data.get("items"),
            update_items="items" in data,
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
        image_file = ser.validated_data["receiptImage"]
        if APP_SETTINGS.USE_IMAGE_PROCESSING:
            try:
                category_choices = list(
                    Category.objects.filter(customer=request.user).values_list("category_name", flat=True)
                )
                print(time.time())
                result = extract_receipt_data(image_file, category_choices)
                print(time.time())
                print(result)
                return Response(result)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Image processing is not enabled."}, status=status.HTTP_400_BAD_REQUEST)


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
