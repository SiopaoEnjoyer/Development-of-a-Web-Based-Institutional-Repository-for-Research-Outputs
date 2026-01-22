from django.core.management.base import BaseCommand
from django.utils import timezone

class Command(BaseCommand):
    help = 'Sample cron job that runs every 5 minutes'

    def handle(self, *args, **options):
        current_time = timezone.now()
        self.stdout.write(
            self.style.SUCCESS(f'Cron job executed at {current_time}')
        )