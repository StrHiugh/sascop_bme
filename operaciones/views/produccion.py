from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from ..models import Produccion, Sitio, OTE
from django.http import JsonResponse
from itertools import chain
from django.db.models import Q, Case, F, When, IntegerField, Value, CharField
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
    Retorna las OTs vinculadas a un sitio específico (Barco, Plataforma, Patio, Intercom).
    """
    id_sitio = request.GET.get('id_sitio')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    
    if not id_sitio:
        return JsonResponse([], safe=False)

    try:
        # 1. Determinar el Frente para saber qué columna filtrar
        sitio = Sitio.objects.select_related('id_frente').get(id=id_sitio)
        id_frente = sitio.id_frente_id
        nombre_sitio = sitio.descripcion
    except Sitio.DoesNotExist:
        return JsonResponse([], safe=False)

    # Filtros base
    filters = {
        'id_estatus_ot_id': 8, # Ejecución
        'id_tipo_id': 4,       # Producción
        'estatus': 1           # Activo
    }

    # 2. Aplicar filtro de Sitio según el Frente (Lógica Switch)
    if id_frente in [1, 3]: # Tierra, Patio
        filters['id_patio'] = id_sitio
    elif id_frente in [2, 6]: # Barco, Embarcación
        filters['id_embarcacion'] = id_sitio
    elif id_frente in [4, 7]: # Centro Procesos, Plataforma
        filters['id_plataforma'] = id_sitio
    elif id_frente == 5: # Intercom
        filters['id_intercom'] = id_sitio
    else: 
        return JsonResponse([], safe=False)

    queryset = OTE.objects.filter(**filters)

    # 3. FILTRADO POR FECHA (MES Y AÑO) - Lógica Robusta
    if mes and anio:
        try:
            mes = int(mes)
            anio = int(anio)
            fecha_inicio_mes = date(anio, mes, 1)
            ultimo_dia = calendar.monthrange(anio, mes)[1]
            fecha_fin_mes = date(anio, mes, ultimo_dia)
            queryset = queryset.annotate(
                inicio_vigencia=Coalesce('fecha_inicio_real', 'fecha_inicio_programado'),
                fin_vigencia=Coalesce('fecha_termino_real', 'fecha_termino_programado')
            ).filter(
                inicio_vigencia__lte=fecha_fin_mes,
                fin_vigencia__gte=fecha_inicio_mes
            )
        except ValueError:
            pass

    ots = queryset.values(
        'id', 
        'orden_trabajo', 
        'descripcion_trabajo'
    )

    data = []
    for ot in ots:
        fila = {
            'id_ot': ot['id'],
            'ot': ot['orden_trabajo'],
            'desc': f"{ot['descripcion_trabajo']} - [{nombre_sitio}]", 
        }
        
        for i in range(1, 32):
            fila[f'dia{i}'] = '' 
            
        data.append(fila)

    return JsonResponse(data, safe=False)

