from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.contrib.auth import views as auth_views
from operaciones.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('operaciones/', include('operaciones.urls')),
    # path('', RedirectView.as_view(url='/operaciones/', permanent=True)),
    
    # URLs de autenticación - Usando tu vista personalizada
    path('accounts/login/', custom_login, name='login'),
    path('accounts/logout/', CustomLogoutView.as_view(next_page='/accounts/login/'), name='logout'),
    
    # Módulo Tiempos de Barco
    path('tiempos-barco/', include('tiempos_barco.urls')),

    #  URLs de módulos extras comentadas por el momento descomentar cunado se usen
    # path('costa-fuera/', include('costa_fuera.urls')),
    # path('reportes/', include('reportes.urls')),
]