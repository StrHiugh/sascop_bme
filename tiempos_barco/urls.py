from django.urls import path
from .views import bitacora_flota, dashboard, incidencias, suministros, pob, reportes

app_name = 'tiempos_barco'

urlpatterns = [
    # Dashboard General
    path('', dashboard.index, name='index'),
    path('posiciones-flota/', dashboard.posiciones_embarcacion, name='posiciones_embarcacion'),

    # URLs para movimientos de embarcacion
    path('movimiento-embarcacion/', bitacora_flota.lista_bitacoras_flota, name='lista_bitacoras_flota'),
    path('movimiento-embarcacion/datatable/', bitacora_flota.datatable_bitacoras, name='datatable_bitacoras'),

    # Nuevos Módulos del Mock
    path('incidencias/', incidencias.index, name='incidencias'),
    path('suministros/', suministros.index, name='suministros'),
    path('pob/', pob.index, name='pob'),
    path('reportes/', reportes.index, name='reportes'),
]
