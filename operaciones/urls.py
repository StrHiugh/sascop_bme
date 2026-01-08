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
    path('pte/obtener_clientes/', pte.obtener_clientes, name='obtener_clientes'),
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
    path('pte/guardar_archivo_pte/', pte.guardar_archivo_pte, name='guardar_archivo_pte'),
    
    # URLs para OTE
    path('ot/', ote.lista_ote, name='lista_ot'),
    path('ot/datatable/', ote.datatable_ot, name='datatable_ot'),
    path('ot/obtener_datos/', ote.obtener_datos_ot, name='obtener_datos_ot'),
    path('ot/obtener_ot_iniciales/', ote.obtener_ots_principales, name='obtener_ots_principales'),
    path('ot/eliminar/', ote.eliminar_ot, name='eliminar_ot'),
    path('ot/editar/', ote.editar_ot, name='editar_ot'),
    path('ot/crear-ot-reprogramacion/', ote.crear_ot, name='crear_ot'),
    path('ot/cambiar_estatus_ot/', ote.cambiar_estatus_ot, name='cambiar_estatus_ot'),
    path('ot/obtener_sitios_frente/', ote.obtener_sitios_por_frente, name='obtener_sitios_por_frente'),
    path('ot/detalle/datatable/', ote.datatable_ot_detalle, name='datatable_ot_detalle'),
    path('ot/cambiar_estatus_paso/', ote.cambiar_estatus_paso_ot, name='cambiar_estatus_paso_ot'),
    path('ot/actualizar-fecha/', ote.actualizar_fecha_ot, name='actualizar_fecha_ot'),
    path('ot/guardar_archivo_ot/', ote.guardar_archivo_ot, name='guardar_archivo_ot'),
    path('ot/obtener_sitios/', ote.obtener_sitios, name='obtener_sitios'),
    path('ot/obtener_progreso_general_ot/', ote.obtener_progreso_general_ot, name='obtener_progreso_general_ot'),
    path('ot/datatable-importaciones/', ote.datatable_importaciones, name='datatable_importaciones'),
    path('ot/importar_anexo_ot/', ote.importar_anexo_ot, name='importar_anexo_ot'),

    #URLs para registro de actividad
    path('registro_actividad/', registro_actividad.registro_actividad, name='registro_actividad'),
    path('registro_actividad/datatable', registro_actividad.datatable_registro_actividad, name='datatable_registro_actividad'),
    path('registro_actividad/usuarios', registro_actividad.obtener_usuarios, name='obtener_usuarios_log'),
    
    # URLs para Producción
    path('produccion/', produccion.lista_produccion, name='lista_produccion'),
    path('produccion/obtener_sitios_con_ots_ejecutadas/', produccion.obtener_sitios_con_ots_ejecutadas, name='obtener_sitios_con_ots_ejecutadas'),
    path('produccion/ots_por_sitio_grid/', produccion.ots_por_sitio_grid, name='ots_por_sitio_grid'),
    path('produccion/obtener_partidas_produccion/', produccion.obtener_partidas_produccion, name='obtener_partidas_produccion'),
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
    
    # # URLs para Embarcaciones
    # path('catalogos/embarcaciones/', catalogos.lista_embarcaciones, name='lista_embarcaciones'),
    # path('catalogos/datatable_embarcaciones/', catalogos.datatable_embarcaciones, name='datatable_embarcaciones'),
    # path('catalogos/embarcaciones/crear/', catalogos.crear_embarcacion, name='crear_embarcacion'),
    # path('catalogos/embarcaciones/eliminar/', catalogos.eliminar_embarcacion, name='eliminar_embarcacion'),
    # path('catalogos/embarcaciones/obtener/', catalogos.obtener_embarcacion, name='obtener_embarcacion'),
    # path('catalogos/embarcaciones/editar/', catalogos.editar_estatus, name='editar_embarcacion'),
    
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
    
    #URLs para Frentes
    path('catalogos/frentes/', catalogos.lista_frentes, name='lista_frentes'),
    path('catalogos/datatable_frentes/', catalogos.datatable_frentes, name='datatable_frentes'),
    path('catalogos/frentes/crear/', catalogos.crear_frente, name='crear_frente'),
    path('catalogos/frentes/eliminar/', catalogos.eliminar_frente, name='eliminar_frente'),
    path('catalogos/frentes/obtener/', catalogos.obtener_frente, name='obtener_frente'),
    path('catalogos/frentes/editar/', catalogos.editar_frente, name='editar_frente'),
    
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
    
    #URLs para Pasos OT
    path('catalogos/pasos_ot/', catalogos.lista_pasos_ot, name='lista_pasos_ot'),
    path('catalogos/datatable_pasos_ot/', catalogos.datatable_pasos_ot, name='datatable_pasos_ot'),
    path('catalogos/pasos_ot/crear/', catalogos.crear_paso_ot, name='crear_paso_ot'),
    path('catalogos/pasos_ot/eliminar/', catalogos.eliminar_paso_ot, name='eliminar_paso_ot'),
    path('catalogos/pasos_ot/obtener/', catalogos.obtener_paso_ot, name='obtener_paso_ot'),
    path('catalogos/pasos_ot/editar/', catalogos.editar_paso_ot, name='editar_paso_ot'),

    #URLs para Responsables
    path('catalogos/responsable/', catalogos.lista_responsable, name='lista_responsable'),
    path('catalogos/datatable_responsable/', catalogos.datatable_responsable, name='datatable_responsable'),
    path('catalogos/responsable/crear/', catalogos.crear_responsable, name='crear_responsable'),
    path('catalogos/responsable/eliminar/', catalogos.eliminar_responsable, name='eliminar_responsable'),
    path('catalogos/responsable/obtener/', catalogos.obtener_responsable, name='obtener_responsable'),
    path('catalogos/responsable/editar/', catalogos.editar_responsable, name='editar_responsable'),
    
    #URLs para Cliente
    path('catalogos/cliente/', catalogos.lista_cliente, name='lista_cliente'),
    path('catalogos/datatable_cliente/', catalogos.datatable_cliente, name='datatable_cliente'),
    path('catalogos/cliente/crear/', catalogos.crear_cliente, name='crear_cliente'),
    path('catalogos/cliente/eliminar/', catalogos.eliminar_cliente, name='eliminar_cliente'),
    path('catalogos/cliente/obtener/', catalogos.obtener_cliente, name='obtener_cliente'),
    path('catalogos/cliente/editar/', catalogos.editar_cliente, name='editar_cliente'),
    

    # APIs
    path('api/estadisticas/', api.api_estadisticas, name='api_estadisticas'),
    path('api/ptes/', api.api_ptes, name='api_ptes'),
    path('api/ptes/<int:pte_id>/', api.api_pte_detalle, name='api_pte_detalle'),
]