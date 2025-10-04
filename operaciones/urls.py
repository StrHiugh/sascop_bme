from django.urls import path
from .views import login, pte, ote, produccion, api, catalogos

app_name = 'operaciones'

urlpatterns = [
    # Login
    path('accounts/login/', login.custom_login, name='login'),
    
    # Página principal
    path('', pte.index, name='index'),
    
    # URLs para PTEs
    path('pte/', pte.lista_pte, name='lista_pte'),
    path('pte/<int:pte_id>/', pte.detalle_pte, name='detalle_pte'),
    path('ptes/datatable/', pte.datatable_ptes, name='datatable_ptes'),
    path('ptes/detalle/datatable/', pte.datatable_pte_detalle, name='datatable_pte_detalle'),
    
    # URLs para OTE
    path('ote/', ote.lista_ote, name='lista_ote'),
    
    # URLs para Producción
    path('produccion/', produccion.lista_produccion, name='lista_produccion'),
    
    #URLs para Catálogos
    path('catalogos/tipos/', catalogos.lista_tipos, name='lista_tipos'),
    path('catalogos/tipos/datatable/', catalogos.datatable_tipos, name='datatable_tipos'),
    
    # APIs
    path('api/estadisticas/', api.api_estadisticas, name='api_estadisticas'),
    path('api/ptes/', api.api_ptes, name='api_ptes'),
    path('api/ptes/<int:pte_id>/', api.api_pte_detalle, name='api_pte_detalle'),
]