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
    
    #URLs para TIPOS
    path('catalogos/tipos/', catalogos.lista_tipos, name='lista_tipos'),
    path('catalogos/tipos/datatable_tipos/', catalogos.datatable_tipos, name='datatable_tipos'),
    path('catalogos/tipos/crear/', catalogos.crear_tipos, name='crear_tipos'),
    path('catalogos/tipos/eliminar/', catalogos.eliminar_tipos, name='eliminar_tipos'),
    path('catalogos/tipos/obtener/', catalogos.obtener_tipos, name='obtener_tipos'),
    path('catalogos/tipos/editar/', catalogos.editar_tipos, name='editar_tipos'),
    
    # URLs para Embarcaciones
    path('catalogos/embarcaciones/', catalogos.lista_embarcaciones, name='lista_embarcaciones'),
    path('catalogos/datatable_embarcaciones/', catalogos.datatable_embarcaciones, name='datatable_embarcaciones'),
    path('catalogos/embarcaciones/crear/', catalogos.crear_embarcacion, name='crear_embarcacion'),
    path('catalogos/embarcaciones/eliminar/', catalogos.eliminar_embarcacion, name='eliminar_embarcacion'),
    path('catalogos/embarcaciones/obtener/', catalogos.obtener_embarcacion, name='obtener_embarcacion'),
    path('catalogos/embarcaciones/editar/', catalogos.editar_estatus, name='editar_embarcacion'),
    
    # URLS para Estatus
    path('catalogos/estatus/', catalogos.lista_cobro, name='lista_estatus'),
    path('catalogos/datatable_estcobro/', catalogos.datatable_cobro, name='datatable_cobro'),
    path('catalogos/estatus/crear/', catalogos.crear_estatus, name='crear_estatus'),
    path('catalogos/estatus/eliminar/', catalogos.eliminar_estatus, name='eliminar_estatus'),
    path('catalogos/estatus/obtener/', catalogos.obtener_estatus, name='obtener_estatus'),
    path('catalogos/estatus/editar/', catalogos.editar_estatus, name='editar_estatus'),
    
    #URLs para Unidades de Medida
    path('catalogos/unidad_medida/', catalogos.lista_unidad_medida, name='lista_unidad_medida'),
    path('catalogos/datatable_unidad_medida/', catalogos.datatable_unidad_medida, name='datatable_unidad_medida'),
    path('catalogos/unidad_medida/crear/', catalogos.crear_unidad_medida, name='crear_unidad_medida'),
    path('catalogos/unidad_medida/eliminar/', catalogos.eliminar_unidad_medida, name='eliminar_unidad_medida'),
    path('catalogos/unidad_medida/obtener/', catalogos.obtener_unidad_medida, name='obtener_unidad_medida'),
    path('catalogos/unidad_medida/editar/', catalogos.editar_unidad_medida, name='editar_unidad_medida'),
    
    #URLs para Sitios
    path('catalogos/sitios/', catalogos.lista_sitios, name='lista_sitios'),
    path('catalogos/datatable_sitios/', catalogos.datatable_sitios, name='datatable_sitios'),
    path('catalogos/sitios/crear/', catalogos.crear_sitio, name='crear_sitio'),
    path('catalogos/sitios/eliminar/', catalogos.eliminar_sitio, name='eliminar_sitio'),
    path('catalogos/sitios/obtener/', catalogos.obtener_sitio, name='obtener_sitio'),
    path('catalogos/sitios/editar/', catalogos.editar_sitio, name='editar_sitio'),
    
    #URLs para Pasos
    path('catalogos/pasos/', catalogos.lista_pasos, name='lista_pasos'),
    path('catalogos/datatable_pasos/', catalogos.datatable_pasos, name='datatable_pasos'),
    path('catalogos/pasos/crear/', catalogos.crear_paso, name='crear_paso'),
    path('catalogos/pasos/eliminar/', catalogos.eliminar_paso, name='eliminar_paso'),
    path('catalogos/pasos/obtener/', catalogos.obtener_paso, name='obtener_paso'),
    path('catalogos/pasos/editar/', catalogos.editar_paso, name='editar_paso'),
    
    # APIs
    path('api/estadisticas/', api.api_estadisticas, name='api_estadisticas'),
    path('api/ptes/', api.api_ptes, name='api_ptes'),
    path('api/ptes/<int:pte_id>/', api.api_pte_detalle, name='api_pte_detalle'),
]