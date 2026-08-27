from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import F

from users.models import Receipt


class Command(BaseCommand):
    help = "Shift receipt date_bought values from midnight to noon."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many receipts would be updated without writing.",
        )

    def handle(self, *args, **options):
        midnight_receipts = Receipt.objects.filter(
            date_bought__hour=0,
            date_bought__minute=0,
            date_bought__second=0,
        )
        count = midnight_receipts.count()

        if options["dry_run"]:
            self.stdout.write(f"Would update {count} receipt(s) from midnight to noon.")
            return

        updated = midnight_receipts.update(date_bought=F("date_bought") + timedelta(hours=12))
        self.stdout.write(self.style.SUCCESS(f"Updated {updated} receipt(s) from midnight to noon."))
