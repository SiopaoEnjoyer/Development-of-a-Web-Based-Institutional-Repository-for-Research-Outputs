"""
Django settings for G12Research project.
"""

from pathlib import Path
import os
import logging
from decouple import config

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default='True') == 'True'

BREVO_API_KEY = config('BREVO_API_KEY', default='')

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.onrender.com',
    config('ALLOWED_HOST', default=''),
]

INSTALLED_APPS = [
    'research',
    'accounts.apps.AccountsConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_recaptcha',
    'django.contrib.sites',
    'django.contrib.sitemaps',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',  
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'accounts.middleware.MemoryLimiterMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'accounts.middleware.DatabaseConnectionMiddleware',  
    'accounts.middleware.ApprovalCheckMiddleware',
    'accounts.middleware.BotBlockerMiddleware', 
]

ROOT_URLCONF = 'G12Research.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'G12Research.wsgi.application'

if config('DEBUG', default='True') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='G12Research'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 0,
            'OPTIONS': {
                'connect_timeout': 10,
            }
        }
    }
else:
    import dj_database_url
    
    database_url = config('DATABASE_URL', default='')
    
    if database_url and 'neon.tech' in database_url and '-pooler' not in database_url:
        import re
        database_url = re.sub(
            r'@(ep-[^.]+)\.([^/]+\.neon\.tech)',
            r'@\1-pooler.\2',
            database_url
        )
        logger.info("✅ Converted to Neon pooled endpoint")
    
    DATABASES = {
        'default': dj_database_url.config(
            default=database_url,
            conn_max_age=0,  
            conn_health_checks=True,
        )
    }
    
    DATABASES['default']['ATOMIC_REQUESTS'] = False  
    DATABASES['default']['OPTIONS'] = {
        'sslmode': 'require',
        'connect_timeout': 10,
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SITE_ID = 1

LOGIN_URL = '/accounts/login'  
LOGIN_REDIRECT_URL = 'research:home'
LOGOUT_REDIRECT_URL = 'accounts:login'

AUTH_USER_MODEL = 'accounts.User'

SUPABASE_URL = config('SUPABASE_URL', default='')
SUPABASE_KEY = config('SUPABASE_KEY', default='')

DEFAULT_FROM_EMAIL = config('FROM_EMAIL', default='')

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

import mimetypes
mimetypes.add_type("image/x-icon", ".ico")

DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800

if DEBUG:
    RECAPTCHA_PUBLIC_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
    RECAPTCHA_PRIVATE_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
    SILENCED_SYSTEM_CHECKS = ['django_recaptcha.recaptcha_test_key_error']
else:
    RECAPTCHA_PUBLIC_KEY = config('RECAPTCHA_PUBLIC_KEY', default='')
    RECAPTCHA_PRIVATE_KEY = config('RECAPTCHA_PRIVATE_KEY', default='')

SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
SESSION_SAVE_EVERY_REQUEST = False 

FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
            'CULL_FREQUENCY': 4,
        }
    }
}

CACHE_TTL_SHORT = 60 * 5
CACHE_TTL_MEDIUM = 60 * 30    
CACHE_TTL_LONG = 60 * 60      
CACHE_TTL_VERY_LONG = 60 * 60 * 24  

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'WARNING',  
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',  
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  
            'propagate': False,
        },
        'accounts.middleware': {
            'handlers': ['console'],
            'level': 'ERROR',  
            'propagate': False,
        },
        'django.security.Ratelimited': {  
            'handlers': [],
            'propagate': False,
        },
    },
}

RATELIMIT_VIEW = 'research.views.ratelimit_blocked'