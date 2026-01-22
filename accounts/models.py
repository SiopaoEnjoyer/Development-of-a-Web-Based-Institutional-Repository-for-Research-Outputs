from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.base_user import BaseUserManager
from django.core.validators import FileExtensionValidator
from datetime import date, timedelta
from django.utils import timezone
import random
from storage import SupabaseStorage

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    ROLE_CHOICES = (
        ('shs_student', 'BTCS SHS Student'),
        ('alumni', 'BTCS Alumni'),
        ('nonresearch_teacher', 'BTCS Non-Research Teacher'),
        ('research_teacher', 'BTCS Research Teacher'),
        ('admin', 'BTCS Admin'),
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES
    )

    birthdate = models.DateField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def age(self):
        """Calculate age from birthdate"""
        if not self.birthdate:
            return None
        today = date.today()
        return today.year - self.birthdate.year - ((today.month, today.day) < (self.birthdate.month, self.birthdate.day))

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    pending_first_name = models.CharField(max_length=100, null=True, blank=True)
    pending_middle_initial = models.CharField(max_length=1, null=True, blank=True)
    pending_last_name = models.CharField(max_length=100, null=True, blank=True)
    pending_suffix = models.CharField(max_length=10, null=True, blank=True)

    took_shs = models.BooleanField(default=True)
    pending_G11 = models.CharField(max_length=9, null=True, blank=True)
    pending_G12 = models.CharField(max_length=9, null=True, blank=True)

    author_profile = models.ManyToManyField("research.Author", blank=True)
    assigned_papers = models.ManyToManyField("research.ResearchPaper", blank=True)

    is_approved = models.BooleanField(default=False)

    # Consent fields
    consent_status = models.CharField(
        max_length=20,
        choices=[
            ('not_consented', 'Not Consented Yet'),
            ('pending_approval', 'Pending Admin Approval'),
            ('consented', 'Consented'),
        ],
        default='not_consented'
    )
    consent_date = models.DateTimeField(null=True, blank=True)
    parental_consent_file = models.FileField(
    upload_to='parental_consents/',
    null=True,
    blank=True,
    validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
    help_text='PDF file, max 10MB',
    storage=SupabaseStorage()
)

    email_verification_code = models.CharField(max_length=6, null=True, blank=True)
    email_verification_code_created = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)

    verification_attempts = models.IntegerField(
        default=0,
        help_text="Number of failed verification attempts"
    )
    verification_locked_until = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Account locked until this time after too many failed attempts"
    )

    # Password reset tracking
    last_password_reset_request = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Timestamp of last password reset request (24hr cooldown)"
    )

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        """Full name for internal use (admin, dashboard)"""
        if not self.pending_first_name or not self.pending_last_name:
            return self.user.email

        first = self.pending_first_name.strip().title()
        last = self.pending_last_name.strip().title()

        parts = [first]

        if self.pending_middle_initial:
            parts.append(self.pending_middle_initial.strip().upper() + ".")

        parts.append(last)

        full_name = " ".join(parts)

        if self.pending_suffix:
            full_name += f", {self.pending_suffix.strip().upper()}"

        return full_name

    @property
    def display_name_public(self):
        """Name display for public view (respects consent)"""
        if self.consent_status == 'consented':
            return self.display_name
        
        # Show initials only if not consented or pending
        if not self.pending_first_name or not self.pending_last_name:
            return "Anonymous"

        last = self.pending_last_name.strip().title()
        
        # Handle multiple first names (e.g., "Stephen Wardell" -> "S. W.")
        first_names = self.pending_first_name.strip().split()
        first_initials = " ".join([name[0].upper() + "." for name in first_names if name])
        
        parts = [f"{last},", first_initials]
        
        if self.pending_middle_initial:
            parts.append(self.pending_middle_initial.strip().upper() + ".")
        
        name = " ".join(parts)
        
        if self.pending_suffix:
            name += f" {self.pending_suffix.strip().upper()}"
        
        return name
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        self.email_verification_code = code
        self.email_verification_code_created = timezone.now()
        self.save()
        return code
    
    def is_verification_code_valid(self, code):
        """Check if verification code is valid and not expired (15 min)"""
        if not self.email_verification_code or not self.email_verification_code_created:
            return False
        
        if self.email_verification_code != code:
            return False
        
        expiry_time = self.email_verification_code_created + timedelta(minutes=15)
        if timezone.now() > expiry_time:
            return False
        
        return True