from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q, Case, When, Value, CharField, OrderBy
from ..models import *


@login_required(login_url='/accounts/login/')
def lista_tipos(request):
    """Lista de todos los tipos y afectaciones"""
    return render(request, 'operaciones/catalogos/tipos/lista_tipos.html')

def datatable_tipos(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Tipo.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        nivel_texto=Case(
            When(nivel_afectacion=1, then=Value('PTE')),
            When(nivel_afectacion=2, then=Value('OT')),
            When(nivel_afectacion=3, then=Value('PARTIDA')),
            When(nivel_afectacion=4, then=Value('PRODUCCION')),
            default=Value('No definido'),
            output_field=CharField()
        )
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value) |
            Q(nivel_afectacion__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'nivel_afectacion': tipo.nivel_texto, 
            'activo': tipo.estado_texto, 
            'activo_bool': tipo.activo, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    
@login_required(login_url='/accounts/login/')
def lista_embarcaciones(request):
    """Lista de todas los embarcaciones"""
    return render(request, 'operaciones/catalogos/embarcaciones/lista_embarcaciones.html')

def datatable_embarcaciones(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Embarcacion.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'activo': tipo.estado_texto, 
            'activo_bool': tipo.activo, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    
@login_required(login_url='/accounts/login/')
def lista_cobro(request):
    """Lista de todas los estados de cobro"""
    return render(request, 'operaciones/catalogos/estado_cobro/lista_cobro.html')

def datatable_cobro(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = EstadoCobro.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'activo': tipo.estado_texto, 
            'activo_bool': tipo.activo, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    
@login_required(login_url='/accounts/login/')
def lista_unidad_medida(request):
    """Lista de todas los estados de cobro"""
    return render(request, 'operaciones/catalogos/unidad_medida/lista_unidad_medida.html')


def datatable_unidad_medida(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = UnidadMedida.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'activo': tipo.estado_texto, 
            'activo_bool': tipo.activo, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    

@login_required(login_url='/accounts/login/')
def lista_sitios(request):
    """Lista de todas los estados de cobro"""
    return render(request, 'operaciones/catalogos/sitios/lista_sitios.html')

def datatable_sitios(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Sitio.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        nivel_texto=Case(
            When(nivel_afectacion=1, then=Value('PARTIDA')),
            When(nivel_afectacion=2, then=Value('TRABAJO')),
            default=Value('No definido'),
            output_field=CharField()
        )
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'activo': tipo.estado_texto, 
            'activo_bool': tipo.activo,
            'nivel_afectacion': tipo.nivel_texto, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    

@login_required(login_url='/accounts/login/')
def lista_pasos(request):
    """Lista de todas los estados de cobro"""
    return render(request, 'operaciones/catalogos/pasos/lista_pasos.html')

def datatable_pasos(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Paso.objects.annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        # nivel_texto=Case(
        #     When(nivel_afectacion=1, then=Value('PARTIDA')),
        #     When(nivel_afectacion=2, then=Value('TRABAJO')),
        #     default=Value('No definido'),
        #     output_field=CharField()
        # )
    )
    
    if search_value:
        tipos = tipos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = tipos.count()
    tipos = tipos[start:start + length]
    
    data = []
    for tipo in tipos:
        data.append({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'activo': tipo.estado_texto, 
            'importancia': tipo.importancia,
            'activo_bool': tipo.activo,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })
    