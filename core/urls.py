from django.urls import path
from .views import dashboard, acerca_de

app_name = 'core'

urlpatterns = [
    path('', dashboard.index, name='dashboard'),
    path('acerca_de/', acerca_de.index, name='acerca_de'),
    # path('modulos/', views.modulos.lista_modulos, name='lista_modulos'),
    # path('modulos/ajax/', views.modulos.ajax_modulos, name='ajax_modulos'),
    # path('modulos/activar/', views.modulos.activar_modulo, name='activar_modulo'),
    #path('accounts/login/', views.auth.login_view, name='login'),
]