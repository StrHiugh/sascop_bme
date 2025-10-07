from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q
from ..models import PTEHeader, PTEDetalle, OTE, Produccion

@login_required(login_url='/accounts/login/')
def index(request):
    """Página principal del sistema"""
    # Estadísticas básicas para el dashboard
    total_ptes = PTEHeader.objects.count()
    total_otes = OTE.objects.count()
    total_produccion = Produccion.objects.count()
    
    context = {
        'total_ptes': total_ptes,
        'total_otes': total_otes,
        'total_produccion': total_produccion,
    }
    return render(request, 'operaciones/index.html', context)

@login_required(login_url='/accounts/login/')
def lista_pte(request):
    """Lista de todos los PTE"""
    ptes = PTEHeader.objects.all().order_by('-fecha_solicitud')
    return render(request, 'operaciones/pte/lista_pte.html', {'ptes': ptes})

@login_required(login_url='/accounts/login/')
def detalle_pte(request, pte_id):
    """Detalle de un PTE específico"""
    pte = get_object_or_404(PTEHeader, id=pte_id)
    detalles = pte.detalles.all().order_by('id_paso__orden')
    
    context = {
        'pte': pte,
        'detalles': detalles,
    }
    return render(request, 'operaciones/detalle_pte.html', context)

def datatable_ptes(request):
    """Datatable para PTE"""
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('search[value]', '')
    
    # Filtrado básico
    ptes = PTEHeader.objects.all()
    
    if search_value:
        ptes = ptes.filter(
            Q(descripcion_trabajo__icontains=search_value) |
            Q(oficio_pte__icontains=search_value) |
            Q(responsable_proyecto__icontains=search_value)
        )
    
    total_records = ptes.count()
    ptes = ptes[start:start + length]
    
    data = []
    for pte in ptes:
        data.append({
            'id': pte.id,
            'id_tipo_id': pte.id_tipo_id,
            'oficio_pte': pte.oficio_pte,
            'descripcion_trabajo': pte.descripcion_trabajo,
            'fecha_solicitud': pte.fecha_solicitud.isoformat() if pte.fecha_solicitud else None,
            'responsable_proyecto': pte.responsable_proyecto if pte.responsable_proyecto else '',
            'plazo_dias': pte.plazo_dias or 0,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

def datatable_pte_detalle(request):
    """Datatable para detalle de PTE"""
    pte_header_id = request.GET.get('pte_header_id')
    detalles = PTEDetalle.objects.filter(id_pte_header_id=pte_header_id)
    data = []
    for detalle in detalles:
        data.append({
            'id': detalle.id,
            'id_paso_nombre': detalle.id_paso_id if detalle.id_paso_id else '',
            'estatus_pte': detalle.estatus_pte,
            'estatus_pte_texto': detalle.get_estatus_pte_display(),
            'fecha_entrega': detalle.fecha_entrega.isoformat() if detalle.fecha_entrega else None,
            'comentario': detalle.comentario or ''
        })
    return JsonResponse({
        'data': data,
        'recordsTotal': detalles.count(),
        'recordsFiltered': detalles.count()
    })