from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = 'Creates a superuser from environment variables'

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        
        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully'))
        else:
            self.stdout.write(self.style.WARNING(f'Superuser {email} already exists'))