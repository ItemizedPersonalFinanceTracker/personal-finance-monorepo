from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Category
from users.serializers.category_serializer import CategorySerializer


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
