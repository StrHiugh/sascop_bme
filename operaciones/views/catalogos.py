from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q
from ..models import Tipo


@login_required(login_url='/accounts/login/')
def lista_tipos(request):
    """Lista de todos los tipos y afectaciones"""
    tipos = Tipo.objects.all().order_by('id')
    return render(request, 'operaciones/catalogos/tipos/lista_tipos.html', {'ptes': tipos})

def datatable_tipos(request):
    """Datatable para TIPOS """
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('search[value]', '')
    
    # Filtrado básico
    tipos = Tipo.objects.all()
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion_trabajo__icontains=search_value) |
            Q(oficio_pte__icontains=search_value) |
            Q(responsable_proyecto__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'nivel_afectacion': tipo.nivel_afectacion,
            'activo': tipo.activo,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
