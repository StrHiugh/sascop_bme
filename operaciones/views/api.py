from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from ..models import PTEHeader, OTE, Produccion

@login_required(login_url='/accounts/login/')
def api_estadisticas(request):
    """API para estadísticas del dashboard"""
    total_ptes = PTEHeader.objects.count()
    total_otes = OTE.objects.count()
    total_produccion = Produccion.objects.count()
    
    # Calcular volumen total de producción
    from django.db.models import Sum
    volumen_total = Produccion.objects.aggregate(
        total=Sum('volumen_produccion')
    )['total'] or 0
    
    return JsonResponse({
        'total_ptes': total_ptes,
        'total_otes': total_otes,
        'total_produccion': total_produccion,
        'volumen_total': float(volumen_total)
    })

@login_required(login_url='/accounts/login/')
def api_ptes(request):
    """API para lista de PTE con paginación"""
    pagina = request.GET.get('pagina', 1)
    elementos_por_pagina = request.GET.get('elementos_por_pagina', 10)
    
    ptes_list = PTEHeader.objects.all().order_by('-fecha_solicitud')
    paginator = Paginator(ptes_list, elementos_por_pagina)
    
    try:
        ptes = paginator.page(pagina)
    except:
        ptes = paginator.page(1)
    
    ptes_data = []
    for pte in ptes:
        ptes_data.append({
            'id': pte.id,
            'oficio_pte': pte.oficio_pte,
            'descripcion_trabajo': pte.descripcion_trabajo,
            'fecha_solicitud': pte.fecha_solicitud.strftime('%Y-%m-%d'),
            'responsable_proyecto': pte.responsable_proyecto,
            'estatus': pte.estatus,
        })
    
    return JsonResponse({
        'ptes': ptes_data,
        'total_paginas': paginator.num_pages,
        'pagina_actual': ptes.number,
    })

@login_required(login_url='/accounts/login/')
def api_pte_detalle(request, pte_id):
    """API para detalle de un PTE específico"""
    pte = get_object_or_404(PTEHeader, id=pte_id)
    
    detalles_data = []
    for detalle in pte.detalles.all().order_by('id_paso__orden'):
        detalles_data.append({
            'paso_descripcion': detalle.id_paso.descripcion,
            'estatus_pte': detalle.estatus_pte,
            'fecha_entrega': detalle.fecha_entrega.strftime('%Y-%m-%d') if detalle.fecha_entrega else None,
            'comentario': detalle.comentario,
        })
    
    pte_data = {
        'id': pte.id,
        'oficio_pte': pte.oficio_pte,
        'descripcion_trabajo': pte.descripcion_trabajo,
        'fecha_solicitud': pte.fecha_solicitud.strftime('%Y-%m-%d'),
        'plazo_dias': pte.plazo_dias,
        'responsable_proyecto': pte.responsable_proyecto,
        'estatus': pte.estatus,
        'detalles': detalles_data,
    }
    
    return JsonResponse(pte_data)