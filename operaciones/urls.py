from django.urls import path
from . import view

app_name = 'operaciones'

urlpatterns = [
    path('', view.index, name='index'),
    path('pte/<int:pte_id>/', view.detalle_pte, name='detalle_pte'),
    # URLs para PTEs
    path('pte/', view.lista_pte, name='lista_pte'),
    path('ptes/datatable/', view.datatable_ptes, name='datatable_ptes'),
    # path('ptes/crear/', view.crear_pte, name='crear_pte'),
    # path('ptes/editar/<int:pte_id>/', view.editar_pte, name='editar_pte'),
    path('ptes/detalle/<int:pte_id>/', view.detalle_pte, name='detalle_pte'),
    # path('ptes/eliminar/<int:pte_id>/', view.eliminar_pte, name='eliminar_pte'),
    
    
    
    
    
    path('ote/', view.lista_ote, name='lista_ote'),
    path('produccion/', view.lista_produccion, name='lista_produccion'),
    
    # APIs para jQuery
    path('api/estadisticas/', view.api_estadisticas, name='api_estadisticas'),
    path('api/ptes/', view.api_ptes, name='api_ptes'),
    path('api/ptes/<int:pte_id>/', view.api_pte_detalle, name='api_pte_detalle'),
]