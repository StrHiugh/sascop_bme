from django.urls import path
from .views import login, pte, ote, produccion, api, catalogos, registro_actividad

app_name = 'operaciones'

urlpatterns = [
    # Login
    path('accounts/login/', login.custom_login, name='login'),
    
    # Página principal
    path('', pte.index, name='index'),
    
    # URLs para PTEs
    path('pte/', pte.lista_pte, name='lista_pte'),
    path('pte/<int:pte_id>/', pte.detalle_pte, name='detalle_pte'),
    path('pte/datatable/', pte.datatable_ptes, name='datatable_ptes'),
    path('pte/detalle/datatable/', pte.datatable_pte_detalle, name='datatable_pte_detalle'),
    path('pte/obtener_pasos/', pte.obtener_pasos_pte, name='obtener_pasos_pte'),
    path('pte/obtener_responsables/', pte.obtener_responsables_proyecto, name='obtener_responsables_proyecto'),
    path('pte/crear/', pte.crear_pte, name='crear_pte'),
    path('pte/cambiar_estatus_paso/', pte.cambiar_estatus_paso, name='cambiar_estatus_paso'),
    path('pte/obtener_datos/', pte.obtener_datos_pte, name='obtener_datos_pte'),
    path('pte/editar/', pte.editar_pte, name='editar_pte'),
    path('pte/eliminar/', pte.eliminar_pte, name='eliminar_pte'),
    path('ot/crear-desde-pte/', pte.crear_ot_desde_pte, name='crear_ot_desde_pte'),
    path('pte/datatable-subpasos/', pte.datatable_subpasos, name='datatable_subpasos'),
    path('pte/obtener-progreso-paso4/', pte.obtener_progreso_paso4, name='obtener_progreso_paso4'),
    path('pte/obtener-progreso-general-pte/', pte.obtener_progreso_general_pte, name='obtener_progreso_general_pte'),
    path('pte/actualizar-fecha/', pte.actualizar_fecha, name='actualizar_fecha'),
    path('pte/cambiar_estatus_pte/', pte.cambiar_estatus_pte, name='cambiar_estatus_pte'),
    
    # URLs para OTE
    path('ot/', ote.lista_ote, name='lista_ot'),
    path('ot/datatable/', ote.datatable_ot, name='datatable_ot'),
    path('ot/obtener_datos/', ote.obtener_datos_ot, name='obtener_datos_ot'),
    path('ot/obtener_ot_iniciales/', ote.obtener_ots_principales, name='obtener_ots_principales'),
    path('ot/eliminar/', ote.eliminar_ot, name='eliminar_ot'),
    path('ot/editar/', ote.editar_ot, name='editar_ot'),
    path('ot/cambiar_estatus_ot/', ote.cambiar_estatus_ot, name='cambiar_estatus_ot'),
    
    #URLs para registro de actividad
    path('registro_actividad/', registro_actividad.registro_actividad, name='registro_actividad'),
    path('registro_actividad/datatable', registro_actividad.datatable_registro_actividad, name='datatable_registro_actividad'),
    path('registro_actividad/usuarios', registro_actividad.obtener_usuarios, name='obtener_usuarios_log'),
    
    # URLs para Producción
    path('produccion/', produccion.lista_produccion, name='lista_produccion'),
    
    #URLs para PRODUCTOS
    path('catalogos/producto/', catalogos.lista_producto, name='lista_producto'),
    path('catalogos/producto/datatable_producto/', catalogos.datatable_producto, name='datatable_producto'),
    path('catalogos/producto/crear/', catalogos.crear_producto, name='crear_producto'),
    path('catalogos/producto/eliminar/', catalogos.eliminar_producto, name='eliminar_producto'),
    path('catalogos/producto/obtener/', catalogos.obtener_producto, name='obtener_producto'),
    path('catalogos/producto/editar/', catalogos.editar_producto, name='editar_producto'),
    
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
    
    #URLs para Responsables
    path('catalogos/responsable/', catalogos.lista_responsable, name='lista_responsable'),
    path('catalogos/datatable_responsable/', catalogos.datatable_responsable, name='datatable_responsable'),
    path('catalogos/responsable/crear/', catalogos.crear_responsable, name='crear_responsable'),
    path('catalogos/responsable/eliminar/', catalogos.eliminar_responsable, name='eliminar_responsable'),
    path('catalogos/responsable/obtener/', catalogos.obtener_responsable, name='obtener_responsable'),
    path('catalogos/responsable/editar/', catalogos.editar_responsable, name='editar_responsable'),
    
    # APIs
    path('api/estadisticas/', api.api_estadisticas, name='api_estadisticas'),
    path('api/ptes/', api.api_ptes, name='api_ptes'),
    path('api/ptes/<int:pte_id>/', api.api_pte_detalle, name='api_pte_detalle'),
]