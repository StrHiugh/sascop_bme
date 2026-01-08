from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from ..models import OTE, ImportacionAnexo, PartidaAnexoImportada, Produccion, ReporteMensual, Sitio
from django.http import JsonResponse
from itertools import chain
from django.db.models import Q, Case, F, When, IntegerField, Value, CharField, Sum
from datetime import date
import calendar
from django.db.models.functions import Coalesce

@login_required(login_url='/accounts/login/')
def lista_produccion(request):
    """Lista de producción"""
    producciones = Produccion.objects.all().order_by('-fecha_produccion')
    return render(request, 'operaciones/produccion/lista_produccion.html', {'producciones': producciones})

def obtener_sitios_con_ots_ejecutadas(request):
    """Obtener todos los sitios con ots activos"""
    try:
        ots_activas = OTE.objects.filter(
            id_estatus_ot_id=8, 
            id_tipo_id=4,       
            estatus=1           
        )

        ots_con_sitio_calculado = ots_activas.annotate(
            sitio_real_id=Case(
                When(id_frente_id__in=[1, 3], then=F('id_patio')),
                When(id_frente_id__in=[2, 6], then=F('id_embarcacion')),
                When(id_frente_id__in=[4, 7], then=F('id_plataforma')),
                When(id_frente_id=5, then=F('id_intercom')),
                default=None,
                output_field=IntegerField()
            )
        )

        ids_sitios = ots_con_sitio_calculado.filter(
            sitio_real_id__isnull=False
        ).values_list('sitio_real_id', flat=True).distinct()

        sitios = Sitio.objects.filter(
            id__in=ids_sitios,
            activo=True
        ).values('id', 'descripcion').order_by('id')
        
        return JsonResponse(list(sitios), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def ots_por_sitio_grid(request):
    """
    Lista las OTs activas en un sitio que TIENEN anexo importado.
    """
    id_sitio = request.GET.get('id_sitio')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    
    if not id_sitio or not mes or not anio:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})

    try:
        mes, anio = int(mes), int(anio)
    except ValueError:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})

    ultimo_dia = calendar.monthrange(anio, mes)[1]
    fecha_inicio_mes = date(anio, mes, 1)
    fecha_fin_mes = date(anio, mes, ultimo_dia)

    query = Q(id_embarcacion=id_sitio) | Q(id_plataforma=id_sitio) | \
            Q(id_patio=id_sitio) | Q(id_intercom=id_sitio)

    queryset = OTE.objects.filter(
        query,
        id_estatus_ot_id=8,     
        id_tipo_id=4,            
        estatus=1,
        importaciones_anexo__es_activo=True
    ).distinct()

    queryset = queryset.annotate(
        inicio_vigencia=Coalesce('fecha_inicio_real', 'fecha_inicio_programado'),
        fin_vigencia=Coalesce('fecha_termino_real', 'fecha_termino_programado')
    ).filter(
        inicio_vigencia__lte=fecha_fin_mes,
        fin_vigencia__gte=fecha_inicio_mes
    )

    data_reportes = []
    for ot in queryset:
        data_reportes.append({
            'id_ot': ot.id,
            'ot': ot.orden_trabajo,
            'desc': ot.descripcion_trabajo,
            'inicio_v': ot.inicio_vigencia.isoformat() if ot.inicio_vigencia else None,
            'fin_v': ot.fin_vigencia.isoformat() if ot.fin_vigencia else None,
        })

    return JsonResponse({'reportes_diarios': data_reportes})

def obtener_partidas_produccion(request):
    """
    Retorna las partidas del Anexo C de una OT y su producción diaria.
    """
    id_ot = request.GET.get('id_ot')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')

    if not id_ot or not mes or not anio:
        return JsonResponse([], safe=False)

    try:
        mes, anio = int(mes), int(anio)
    except ValueError:
        return JsonResponse([], safe=False)

    importacion = ImportacionAnexo.objects.filter(ot_id=id_ot, es_activo=True).first()
    if not importacion:
        return JsonResponse([], safe=False)

    partidas = PartidaAnexoImportada.objects.filter(
        importacion_anexo=importacion
    ).select_related('unidad_medida').order_by('orden_fila')
    
    resumen_produccion = Produccion.objects.filter(
        id_reporte_mensual__id_ot_id=id_ot,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio
    ).values(
        'id_partida_anexo_id', 
        'fecha_produccion__day'
    ).annotate(
        total_dia=Sum('volumen_produccion')
    )

    produccion_dict = {
        (item['id_partida_anexo_id'], item['fecha_produccion__day']): float(item['total_dia']) 
        for item in resumen_produccion
    }

    data_produccion = []
    for p in partidas:
        fila = {
            'id_partida_imp': p.id,
            'codigo': p.id_partida,
            'concepto': p.descripcion_concepto,
            'unidad': p.unidad_medida.clave if p.unidad_medida else 'N/A',
            'vol_total_proyectado': float(p.volumen_proyectado) if p.volumen_proyectado else 0.0,
            'acumulado_otros_meses': 0.00, 
        }
        
        suma_mes = 0.0
        for d in range(1, 32):
            valor = produccion_dict.get((p.id, d), 0.0)
            fila[f'dia{d}'] = valor
            suma_mes += valor
            
        fila['acumulado_mes'] = suma_mes
        data_produccion.append(fila)

    return JsonResponse(data_produccion, safe=False)
