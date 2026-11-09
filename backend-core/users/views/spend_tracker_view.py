from datetime import datetime, timedelta

from django.utils import timezone as dj_timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.managers.spend_tracker_manager import backfill_empty_spend_trackers, get_or_create_spend_tracker
from users.models import SpendTracker
from users.serializers.spend_tracker_serializer import SpendTrackerSerializer


class AccountSummaryView(APIView):

    def get(self, request:Request, format=None):
        user = request.user
        backfill_empty_spend_trackers(user)
        now = datetime.now()
        week_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.WEEK_TRACKER, now)
        month_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.MONTH_TRACKER, now)
        year_tracker, _ = get_or_create_spend_tracker(user, SpendTracker.YEAR_TRACKER, now)
        tracker_ids = [week_tracker.pk, month_tracker.pk, year_tracker.pk]
        trackers = {
            tracker.pk: tracker
            for tracker in SpendTracker.objects.filter(pk__in=tracker_ids).prefetch_related(
                "category_amounts__category"
            )
        }
        serializer = SpendTrackerSerializer([trackers[pk] for pk in tracker_ids], many=True)
        return Response({
            'week': serializer.data[0],
            'month': serializer.data[1],
            'year': serializer.data[2]
        })


class SpendingTrackerView(APIView):
    def get(self, request, format=None):
        user = request.user
        backfill_empty_spend_trackers(user)
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
        ).prefetch_related("category_amounts__category").order_by("starting_date")
        serializer = SpendTrackerSerializer(trackers, many=True)
        return Response(serializer.data)
