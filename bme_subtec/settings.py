import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-bme-subtec-default-key-change-in-production')

DEBUG = os.getenv('DEBUG', 'True') == 'True'
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
CSRF_TRUSTED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'http://0.0.0.0',
    'http://54.227.40.69',  
]
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*'
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'operaciones',
    'anymail',
]

INSTALLED_APPS += [
    'core',
    'costa_fuera', 
    'reportes',
    'tiempos_barco',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'operaciones.middleware.SessionTimeoutMiddleware'
]

ROOT_URLCONF = 'bme_subtec.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'operaciones' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'bme_subtec.wsgi.application'

# base de datos RDS - PRODUCCION
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('RDS_DB_NAME', 'postgres'),
        'USER': os.environ.get('RDS_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
        'HOST': os.environ.get('RDS_HOSTNAME', 'localhost'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}


#base de datos LOCAL - DESARROLLO
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.contrib.gis.db.backends.postgis',
#         'NAME': 'sascop_local',       
#         'USER': 'postgres',           
#         'PASSWORD': 'root',    
#         'HOST': 'localhost',         
#         'PORT': '5433',
#     }
# }


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

LANGUAGE_CODE = 'es-mx'
TIME_ZONE = 'America/Mexico_City'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'operaciones' / 'static',]

# STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

OPENPAY_MERCHANT_ID = os.getenv('OPENPAY_MERCHANT_ID', '')
OPENPAY_PRIVATE_KEY = os.getenv('OPENPAY_PRIVATE_KEY', '')
OPENPAY_PRODUCTION = os.getenv('OPENPAY_PRODUCTION', 'False') == 'True'

SESSION_COOKIE_AGE = 7200  
SESSION_SAVE_EVERY_REQUEST = True 
SESSION_EXPIRE_AT_BROWSER_CLOSE = False 

# --- Logica de configuracion de envíos de correos electronicos ---

# --- LOCAL django (SMTP) ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

# --- Servicio ---
# Si se activa, tomará la key del entorno
# EMAIL_BACKEND = "anymail.backends.sendgrid.EmailBackend"
# ANYMAIL = {
#    "SENDGRID_API_KEY": os.getenv("SENDGRID_API_KEY", ""),
# }

# Configuración global
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "SASCOP <noreply@SASCOP.com>"
)

if os.name == 'nt':
    import site
    site_packages = site.getsitepackages()[1] if len(site.getsitepackages()) > 1 else site.getsitepackages()[0]
    OSGEO_PATH = os.path.join(site_packages, 'osgeo')
    if os.path.exists(OSGEO_PATH):
        os.environ['PATH'] = OSGEO_PATH + ';' + os.environ['PATH']
        GEOS_LIBRARY_PATH = os.path.join(OSGEO_PATH, 'geos_c.dll')
        GDAL_LIBRARY_PATH = os.path.join(OSGEO_PATH, 'gdal304.dll')
        if sys.version_info >= (3, 8):
            os.add_dll_directory(OSGEO_PATH)