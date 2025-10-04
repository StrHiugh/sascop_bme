from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.contrib.auth import views as auth_views
from operaciones.views import custom_login 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('operaciones/', include('operaciones.urls')),
    path('', RedirectView.as_view(url='/operaciones/', permanent=True)),
    # URLs de autenticación - Usando tu vista personalizada
    path('accounts/login/', custom_login, name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(next_page='/accounts/login/'), name='logout'),
]