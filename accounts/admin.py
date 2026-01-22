from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'role', 'birthdate', 'age', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email']
    readonly_fields = ['age']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('birthdate', 'age')}),
        ('Role', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'birthdate', 'is_active', 'is_staff'),
        }),
    )
    
    ordering = ['email']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 
        'display_name', 
        'consent_status', 
        'consent_date',
        'is_approved',
        'has_parental_consent'
    ]
    list_filter = ['consent_status', 'is_approved', 'took_shs']
    search_fields = ['user__email', 'pending_first_name', 'pending_last_name']
    readonly_fields = ['consent_date', 'display_name', 'display_name_public']
    
    fieldsets = (
        ('User Account', {
            'fields': ('user',)
        }),
        ('Personal Information', {
            'fields': (
                'pending_first_name',
                'pending_middle_initial',
                'pending_last_name',
                'pending_suffix',
                'display_name',
            )
        }),
        ('Academic Information', {
            'fields': ('took_shs', 'pending_G11', 'pending_G12')
        }),
        ('Approval Status', {
            'fields': ('is_approved',)
        }),
        ('Consent Management', {
            'fields': (
                'consent_status',
                'consent_date',
                'parental_consent_file',
                'display_name_public',
            )
        }),
        ('Relationships', {
            'fields': ('author_profile', 'assigned_papers'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['author_profile', 'assigned_papers']
    
    def has_parental_consent(self, obj):
        return bool(obj.parental_consent_file)
    has_parental_consent.boolean = True
    has_parental_consent.short_description = 'Parental Consent'