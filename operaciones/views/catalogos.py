from decimal import Decimal, InvalidOperation
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required, permission_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db.models import Q, Case, When, Value, CharField, OrderBy,F
from django.views.decorators.http import require_http_methods
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
    
    tipos = Tipo.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        nivel_texto=Case(
            When(nivel_afectacion=1, then=Value('PTE')),
            When(nivel_afectacion=2, then=Value('OT')),
            When(nivel_afectacion=3, then=Value('Partida')),
            When(nivel_afectacion=4, then=Value('Produccion')),
            When(nivel_afectacion=5, then=Value('Clientes')),
            default=Value('No definido'),
            output_field=CharField()
        )
    ).order_by('nivel_afectacion')
    
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

@require_http_methods(["POST"])
def crear_tipos(request):
    try:
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        activo = True
        tipo = Tipo.objects.create(
            descripcion=descripcion,
            nivel_afectacion=afectacion,
            comentario=comentario,
            activo=activo
        )
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Tipo creado correctamente',
            'id': tipo.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear tipo: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_tipos(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de tipo no proporcionado',
                'exito': False
            })

        tipo = Tipo.objects.get(id=id)
        tipo.activo = False
        tipo.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Tipo desactivado correctamente',
            'exito': True
        })

    except Tipo.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Tipo no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar el tipo: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_tipos(request):
    try:
        id = request.GET.get('id')
        tipo = Tipo.objects.get(id=id)
        return JsonResponse({
            'id': tipo.id,
            'descripcion': tipo.descripcion,
            'afectacion': tipo.nivel_afectacion,
            'comentario': tipo.comentario,
            'activo': tipo.activo
        })
    except Estatus.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Tipo no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_tipos(request):
    try:
        if not request.user.has_perm('operaciones.change_tipo'):
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'No tienes permisos para editar',
                'exito': False
            })
        
        id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        
        tipo = Tipo.objects.get(id=id)
        tipo.descripcion = descripcion
        tipo.nivel_afectacion = afectacion
        tipo.comentario = comentario
        tipo.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Tipo actualizada correctamente',
            'exito': True
        })
    except Tipo.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Tipo no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar el tipo: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_sitios(request):
    """Lista de todas los sitios"""
    frentes = Frente.objects.filter(activo=True, nivel_afectacion=1)
    return render(request, 'operaciones/catalogos/sitios/lista_sitios.html', {'frentes': frentes})

def datatable_sitios(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    sitios = Sitio.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        frente_descripcion=F('id_frente__descripcion')
    ).order_by('id')
    
    if search_value:
        sitios = sitios.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = sitios.count()
    sitios = sitios[start:start + length]
    
    data = []
    for sitio in sitios:
        data.append({
            'id': sitio.id,
            'descripcion': sitio.descripcion,
            'activo': sitio.estado_texto, 
            'activo_bool': sitio.activo, 
            'frente': sitio.frente_descripcion,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_sitio(request):
    try:
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        id_frente = request.POST.get('id_frente')
        activo = True
        
        sitio = Sitio.objects.create(
            descripcion=descripcion,
            comentario=comentario,
            id_frente_id=id_frente,
            activo=activo
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Sitio creada correctamente',
            'id': sitio.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear sitio: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_sitio(request):
    try:
        sitio_id = request.POST.get('sitio_id')
        
        if not sitio_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de sitio no proporcionado',
                'exito': False
            })

        sitio = Sitio.objects.get(id=sitio_id)
        sitio.activo = False
        sitio.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Sitio desactivada correctamente',
            'exito': True
        })

    except Sitio.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Sitio no encontrada',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar sitio: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_sitio(request):
    try:
        sitio_id = request.GET.get('id')
        sitio = Sitio.objects.get(id=sitio_id)
        return JsonResponse({
            'id': sitio.id,
            'descripcion': sitio.descripcion,
            'comentario': sitio.comentario,
            'id_frente': sitio.id_frente_id,
            'activo': sitio.activo
        })
    except Sitio.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Sitio no encontrada'
        }, status=404)

@require_http_methods(["POST"])
def editar_sitio(request):
    try:
        sitio_id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        id_frente = request.POST.get('id_frente')
        
        sitio = Sitio.objects.get(id=sitio_id)
        sitio.descripcion = descripcion
        sitio.comentario = comentario
        sitio.id_frente_id = id_frente
        sitio.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Sitio actualizada correctamente',
            'exito': True
        })
    except Sitio.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Sitio no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar sitio: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_cobro(request):
    """Lista de todas los estados"""
    return render(request, 'operaciones/catalogos/estado_cobro/lista_estatus.html')

def datatable_cobro(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Estatus.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        afectacion_texto=Case(
            When(nivel_afectacion=1, then=Value('PTE')),
            When(nivel_afectacion=2, then=Value('OT')),
            When(nivel_afectacion=3, then=Value('Cobro')),
            When(nivel_afectacion=4, then=Value('Pasos PTE')),
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
            'nivel_afectacion': tipo.nivel_afectacion,
            'afectacion_texto': tipo.afectacion_texto,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_estatus(request):
    try:
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        activo = True
        estatus = Estatus.objects.create(
            descripcion=descripcion,
            nivel_afectacion=afectacion,
            comentario=comentario,
            activo=activo
        )
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Estatus creado correctamente',
            'id': estatus.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear estatus: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_estatus(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de estatus no proporcionado',
                'exito': False
            })

        estatus = Estatus.objects.get(id=id)
        estatus.activo = False
        estatus.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Estatus desactivado correctamente',
            'exito': True
        })

    except Estatus.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Estatus no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar estatus: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_estatus(request):
    try:
        id = request.GET.get('id')
        estatus = Estatus.objects.get(id=id)
        return JsonResponse({
            'id': estatus.id,
            'descripcion': estatus.descripcion,
            'afectacion': estatus.nivel_afectacion,
            'comentario': estatus.comentario,
            'activo': estatus.activo
        })
    except Estatus.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Estatus no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_estatus(request):
    try:
        id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        
        estatus = Estatus.objects.get(id=id)
        estatus.descripcion = descripcion
        estatus.nivel_afectacion = afectacion
        estatus.comentario = comentario
        estatus.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Estatus actualizada correctamente',
            'exito': True
        })
    except Sitio.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Estatus no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar el estatus: {str(e)}',
            'exito': False
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
    
    tipos = UnidadMedida.objects.filter(activo=1).annotate(
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
            'clave': tipo.clave,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_unidad_medida(request):
    try:
        descripcion = request.POST.get('descripcion')
        clave = request.POST.get('clave')
        comentario = request.POST.get('comentario', '')
        activo = True
        
        unidad_medida = UnidadMedida.objects.create(
            descripcion=descripcion,
            clave=clave,
            comentario=comentario,
            activo=activo
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Unidad de medida creada correctamente',
            'id': unidad_medida.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear unidad de medida: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_unidad_medida(request):
    try:
        unidad_id = request.POST.get('id')
        
        if not unidad_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de Unidad medida no proporcionado',
                'exito': False
            })

        unidad_medida = UnidadMedida.objects.get(id=unidad_id)
        unidad_medida.activo = False
        unidad_medida.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Unidad de medida desactivada correctamente',
            'exito': True
        })

    except UnidadMedida.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Unidad de medida no encontrada',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar Unidad de medida: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_unidad_medida(request):
    """Obtener una unidad específica o todas las unidades de medida"""
    try:
        unidad_id = request.GET.get('id')
        
        if unidad_id:
            unidad_medida = UnidadMedida.objects.get(id=unidad_id)
            return JsonResponse({
                'id': unidad_medida.id,
                'descripcion': unidad_medida.descripcion,
                'clave': unidad_medida.clave,
                'comentario': unidad_medida.comentario,
                'activo': unidad_medida.activo
            })
        else:
            unidades = UnidadMedida.objects.filter(activo=True)
            unidades_data = []
            
            for unidad in unidades:
                unidades_data.append({
                    'id': unidad.id,
                    'descripcion': unidad.descripcion,
                    'clave': unidad.clave,
                    'comentario': unidad.comentario,
                    'activo': unidad.activo
                })
            
            return JsonResponse(unidades_data, safe=False)
            
    except UnidadMedida.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Unidad de medida no encontrada'
        }, status=404)
@require_http_methods(["POST"])
def editar_unidad_medida(request):
    try:
        unidad_id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        clave = request.POST.get('clave')
        comentario = request.POST.get('comentario', '')
        
        unidad_medida = UnidadMedida.objects.get(id=unidad_id)
        unidad_medida.descripcion = descripcion
        unidad_medida.clave = clave
        unidad_medida.comentario = comentario
        unidad_medida.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Unidad de medida actualizada correctamente',
            'exito': True
        })
    except UnidadMedida.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Unidad de medida no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar Unidad de medida: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_frentes(request):
    """Lista de todas los estados de cobro"""
    return render(request, 'operaciones/catalogos/frentes/lista_frentes.html')

def datatable_frentes(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    tipos = Frente.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        nivel_texto=Case(
            When(nivel_afectacion=1, then=Value('Sitios')),
            When(nivel_afectacion=2, then=Value('OTs')),
            default=Value('No definido'),
            output_field=CharField()
        )
    ).order_by('id')
    
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
    
@require_http_methods(["POST"])
def crear_frente(request):
    try:
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        activo = True
        frente = Frente.objects.create(
            descripcion=descripcion,
            nivel_afectacion=afectacion,
            comentario=comentario,
            activo=activo
        )
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Frente creado correctamente',
            'id': frente.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear frente: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_frente(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de frente no proporcionado',
                'exito': False
            })

        frente = Frente.objects.get(id=id)
        frente.activo = False
        frente.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Frente desactivado correctamente',
            'exito': True
        })

    except Frente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Frente no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar frente: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_frente(request):
    try:
        id = request.GET.get('id')
        frente = Frente.objects.get(id=id)
        return JsonResponse({
            'id': frente.id,
            'descripcion': frente.descripcion,
            'afectacion': frente.nivel_afectacion,
            'comentario': frente.comentario,
            'activo': frente.activo
        })
    except Frente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Frente no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_frente(request):
    try:
        id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        afectacion = request.POST.get('afectacion')
        comentario = request.POST.get('comentario', '')
        
        frente = Frente.objects.get(id=id)
        frente.descripcion = descripcion
        frente.nivel_afectacion = afectacion
        frente.comentario = comentario
        frente.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Frente actualizada correctamente',
            'exito': True
        })
    except Frente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Frente no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar el frente: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_pasos(request):
    """Lista de todas los pasos y afectaciones"""
    return render(request, 'operaciones/catalogos/pasos/lista_pasos.html')

def datatable_pasos(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    pasos = Paso.objects.filter(activo=1).select_related('id_tipo_cliente').annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    ).order_by('id')
    
    if search_value:
        pasos = pasos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = pasos.count()
    pasos = pasos[start:start + length]
    
    data = []
    for paso in pasos:
        data.append({
            'id': paso.id,
            'descripcion': paso.descripcion,
            'activo': paso.estado_texto, 
            'importancia': paso.importancia,
            'afectacion': paso.id_tipo_cliente.descripcion,
            'activo_bool': paso.activo,
            'orden':paso.orden
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_paso(request):
    try:
        descripcion = request.POST.get('descripcion')
        orden = request.POST.get('orden')
        activo = True
        importancia = request.POST.get('importancia')
        comentario = request.POST.get('comentario', '')
        id_tipo_cliente = request.POST.get('afectacion','')
        
        paso = Paso.objects.create(
            descripcion=descripcion,
            orden=orden,
            activo=activo,
            importancia=importancia,
            comentario=comentario,
            id_tipo_cliente_id=id_tipo_cliente,
        )
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Paso creado correctamente',
            'id': paso.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear paso: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_paso(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de paso no proporcionado',
                'exito': False
            })

        paso = Paso.objects.get(id=id)
        paso.activo = False
        paso.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Paso desactivado correctamente',
            'exito': True
        })

    except Paso.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar paso: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_paso(request):
    try:
        id = request.GET.get('id')
        paso = Paso.objects.get(id=id)
        return JsonResponse({
            'id': paso.id,
            'descripcion': paso.descripcion,
            'orden': paso.orden,
            'comentario': paso.comentario,
            'activo': paso.activo,
            'importancia':paso.importancia,
            'afectacion':paso.id_tipo_cliente_id
        })
    except Paso.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_paso(request):
    try:
        id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        orden = request.POST.get('orden')
        importancia = request.POST.get('importancia')
        comentario = request.POST.get('comentario', '')
        id_tipo_cliente = request.POST.get('afectacion','')

        paso = Paso.objects.get(id=id)
        paso.descripcion = descripcion
        paso.importancia = importancia
        paso.orden = orden
        paso.comentario = comentario
        paso.id_tipo_cliente_id = id_tipo_cliente
        paso.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Paso actualizado correctamente',
            'exito': True
        })
    except Paso.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar el paso: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_producto(request):
    """Lista de todos los productos"""
    return render(request, 'operaciones/catalogos/producto/lista_producto.html')
def datatable_producto(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    
    search_value = request.GET.get('filtro', '')
    tipo_partida = request.GET.get('tipo_partida', '')
    sitio = request.GET.get('sitio', '')
    unidad_medida = request.GET.get('unidad_medida', '')
    estado = request.GET.get('estado', '')
    
    order_column_index = request.GET.get('order[0][column]', '0')
    order_direction = request.GET.get('order[0][dir]', 'asc')
    
    column_mapping = {
        '0': 'id',  
        '1': 'id_partida',      
        '2': 'descripcion_concepto', 
        '3': 'id_tipo_partida__descripcion', 
        '4': 'id_sitio__descripcion', 
        '5': 'id_unidad_medida__descripcion', 
        '6': 'anexo', 
        '7': 'precio_unitario_mn', 
        '8': 'precio_unitario_usd', 
        '9': 'activo' 
    }
    
    order_field = column_mapping.get(order_column_index, 'id')
    if order_direction == 'desc':
        order_field = f'-{order_field}'
    
    productos = Producto.objects.filter(activo=1).select_related(
        'id_sitio', 'id_tipo_partida', 'id_unidad_medida'
    ).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        sitio_descripcion=F('id_sitio__descripcion'),
        tipo_partida_descripcion=F('id_tipo_partida__descripcion'),
        unidad_medida_descripcion=F('id_unidad_medida__descripcion')
    )
    
    if search_value:
        productos = productos.filter(
            Q(id_partida__icontains=search_value) |
            Q(descripcion_concepto__icontains=search_value)
        )
    
    if tipo_partida:
        productos = productos.filter(id_tipo_partida_id=tipo_partida)
    
    if sitio:
        productos = productos.filter(id_sitio_id=sitio)
    
    if unidad_medida:
        productos = productos.filter(id_unidad_medida_id=unidad_medida)
    
    if estado:
        if estado == 'activo':
            productos = productos.filter(activo=True)
        elif estado == 'inactivo':
            productos = productos.filter(activo=False)
        
    total_records_filtered = productos.count()
    
    productos = productos.order_by(order_field)
    
    productos = productos[start:start + length]
    
    data = []
    for producto in productos:
        data.append({
            'id': producto.id,
            'tipo_partida': producto.tipo_partida_descripcion,
            'sitio': producto.sitio_descripcion,
            'unidad_medida': producto.unidad_medida_descripcion,
            'anexo': producto.anexo,
            'id_partida': producto.id_partida,
            'descripcion': producto.descripcion_concepto,
            'precio_unitario_mn': str(producto.precio_unitario_mn),
            'precio_unitario_usd': str(producto.precio_unitario_usd),
            'activo': producto.estado_texto, 
            'activo_bool': producto.activo,
            'comentario': producto.comentario,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': Producto.objects.filter(activo=1).count(), 
        'recordsFiltered': total_records_filtered, 
        'data': data
    })
    
@require_http_methods(["POST"])
def crear_producto(request):
    try:
        id_partida = request.POST.get('id_partida')
        descripcion_concepto = request.POST.get('descripcion')
        anexo = request.POST.get('anexo', '')
        sitio_id = request.POST.get('sitio')
        tipo_partida_id = request.POST.get('tipo_partida')
        unidad_medida_id = request.POST.get('unidad_medida')
        precio_unitario_mn = request.POST.get('precio_unitario_mn', 0)
        precio_unitario_usd = request.POST.get('precio_unitario_usd', 0)
        comentario = request.POST.get('comentario', '')
        
        if not id_partida:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El ID de partida es obligatorio'
            })
        
        if not descripcion_concepto:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'La descripción es obligatoria'
            })
        
        if id_partida != 'NA':
            if Producto.objects.filter(id_partida=id_partida, activo=True).exists():
                return JsonResponse({
                    'exito': False,
                    'tipo_aviso': 'advertencia',
                    'detalles': 'Ya existe un producto con este ID de partida'
                })
        
        try:
            sitio = Sitio.objects.get(id=sitio_id)
            tipo_partida = Tipo.objects.get(id=tipo_partida_id)
            unidad_medida = UnidadMedida.objects.get(id=unidad_medida_id)
        except (Sitio.DoesNotExist, Tipo.DoesNotExist, UnidadMedida.DoesNotExist) as e:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'advertencia',
                'detalles': 'Uno de los campos de relación no existe'
            })
        
        try:
            precio_mn = Decimal(precio_unitario_mn) if precio_unitario_mn else Decimal('0')
            precio_usd = Decimal(precio_unitario_usd) if precio_unitario_usd else Decimal('0')
        except (InvalidOperation, ValueError):
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'Los precios deben ser valores numéricos válidos'
            })
        
        producto = Producto.objects.create(
            id_partida=id_partida,
            descripcion_concepto=descripcion_concepto,
            anexo=anexo,
            id_sitio=sitio,
            id_tipo_partida=tipo_partida,
            id_unidad_medida=unidad_medida,
            precio_unitario_mn=precio_mn,
            precio_unitario_usd=precio_usd,
            comentario=comentario,
            activo=True
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Producto creado correctamente',
            'id': producto.id
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear producto: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_producto(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de producto no proporcionado',
                'exito': False
            })

        producto = Producto.objects.get(id=id)
        producto.activo = False
        producto.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Producto desactivado correctamente',
            'exito': True
        })

    except Producto.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Producto no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar el producto: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_producto(request):
    try:
        id = request.GET.get('id')
        producto = Producto.objects.get(id=id)
        
        return JsonResponse({
            'id': producto.id,
            'id_partida': producto.id_partida,
            'descripcion_concepto': producto.descripcion_concepto,
            'anexo': producto.anexo,
            'sitio_id': producto.id_sitio_id,
            'tipo_partida_id': producto.id_tipo_partida_id,
            'unidad_medida_id': producto.id_unidad_medida_id,
            'precio_unitario_mn': producto.precio_unitario_mn,
            'precio_unitario_usd': producto.precio_unitario_usd,
            'comentario': producto.comentario,
            'activo': producto.activo
        })
    except Producto.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Producto no encontrado'
        }, status=404)
        
@require_http_methods(["POST"])
def editar_producto(request):
    try:
        producto_id = request.POST.get('id')
        id_partida = request.POST.get('id_partida')
        descripcion_concepto = request.POST.get('descripcion')
        anexo = request.POST.get('anexo', '')
        sitio_id = request.POST.get('sitio')
        tipo_partida_id = request.POST.get('tipo_partida')
        unidad_medida_id = request.POST.get('unidad_medida')
        precio_unitario_mn = request.POST.get('precio_unitario_mn', 0)
        precio_unitario_usd = request.POST.get('precio_unitario_usd', 0)
        comentario = request.POST.get('comentario', '')
        
        if not producto_id:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'ID de producto no proporcionado'
            })
        
        if not id_partida:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El ID de partida es obligatorio'
            })
        
        if not descripcion_concepto:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'La descripción es obligatoria'
            })
        
        try:
            producto = Producto.objects.get(id=producto_id)
        except Producto.DoesNotExist:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'Producto no encontrado'
            })
        
        if id_partida != 'NA':
            if Producto.objects.filter(id_partida=id_partida, activo=True).exclude(id=producto_id).exists():
                return JsonResponse({
                    'exito': False,
                    'tipo_aviso': 'error',
                    'detalles': 'Ya existe otro producto con este ID de partida'
                })
            
        try:
            sitio = Sitio.objects.get(id=sitio_id)
            tipo_partida = Tipo.objects.get(id=tipo_partida_id)
            unidad_medida = UnidadMedida.objects.get(id=unidad_medida_id)
        except (Sitio.DoesNotExist, Tipo.DoesNotExist, UnidadMedida.DoesNotExist) as e:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'Uno de los campos de relación no existe'
            })
        
        try:
            precio_mn = Decimal(precio_unitario_mn) if precio_unitario_mn else Decimal('0')
            precio_usd = Decimal(precio_unitario_usd) if precio_unitario_usd else Decimal('0')
        except (InvalidOperation, ValueError):
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'Los precios deben ser valores numéricos válidos'
            })
        
        producto.id_partida = id_partida
        producto.descripcion_concepto = descripcion_concepto
        producto.anexo = anexo
        producto.id_sitio = sitio
        producto.id_tipo_partida = tipo_partida
        producto.id_unidad_medida = unidad_medida
        producto.precio_unitario_mn = precio_mn
        producto.precio_unitario_usd = precio_usd
        producto.comentario = comentario
        producto.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Producto actualizado correctamente',
            'id': producto.id
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar producto: {str(e)}'
        })

@login_required(login_url='/accounts/login/')
def lista_responsable(request):
    """Lista de todas los embarcaciones"""
    return render(request, 'operaciones/catalogos/responsable_proyecto/lista_responsable_proyecto.html')

def datatable_responsable(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    responsables = ResponsableProyecto.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    )
    
    if search_value:
        responsables = responsables.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = responsables.count()
    responsables = responsables[start:start + length]
    
    data = []
    for responsable in responsables:
        data.append({
            'id': responsable.id,
            'descripcion': responsable.descripcion,
            'activo': responsable.estado_texto, 
            'activo_bool': responsable.activo, 
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_responsable(request):
    try:
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        activo = True
        
        responsable = ResponsableProyecto.objects.create(
            descripcion=descripcion,
            comentario=comentario,
            activo=activo
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Responsable de proyecto registrado correctamente',
            'id': responsable.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear el responsable: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_responsable(request):
    try:
        responsable_id = request.POST.get('id')
        
        if not responsable_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de embarcación no proporcionado',
                'exito': False
            })

        responsable = ResponsableProyecto.objects.get(id=responsable_id)
        responsable.activo = False
        responsable.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Responsable desactivado correctamente',
            'exito': True
        })

    except ResponsableProyecto.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Responsable no encontrada',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar responsable: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_responsable(request):
    try:
        responsable_id = request.GET.get('id')
        responsable = ResponsableProyecto.objects.get(id=responsable_id)
        return JsonResponse({
            'id': responsable.id,
            'descripcion': responsable.descripcion,
            'comentario': responsable.comentario,
            'activo': responsable.activo
        })
    except Embarcacion.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Responsable no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_responsable(request):
    try:
        responsable_id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        
        responsable = ResponsableProyecto.objects.get(id=responsable_id)
        responsable.descripcion = descripcion
        responsable.comentario = comentario
        responsable.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Responsable actualizado correctamente',
            'exito': True
        })
    except ResponsableProyecto.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Responsable no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar responsable: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_cliente(request):
    """Lista de todas los sitios"""
    return render(request, 'operaciones/catalogos/cliente/lista_cliente.html')

def datatable_cliente(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    clientes = Cliente.objects.filter(activo=1).annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        tipo_descripcion=F('id_tipo__descripcion')
    ).order_by('id')
    
    if search_value:
        clientes = clientes.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = clientes.count()
    clientes = clientes[start:start + length]
    
    data = []
    for cliente in clientes:
        data.append({
            'id': cliente.id,
            'descripcion': cliente.descripcion,
            'activo': cliente.estado_texto, 
            'activo_bool': cliente.activo, 
            'tipo': cliente.tipo_descripcion,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_cliente(request):
    try:
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        id_tipo = request.POST.get('id_tipo')
        activo = True
        
        cliente = Cliente.objects.create(
            descripcion=descripcion,
            comentario=comentario,
            id_tipo_id=id_tipo,
            activo=activo
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Cliente creada correctamente',
            'id': cliente.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear cliente: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_cliente(request):
    try:
        cliente_id = request.POST.get('cliente_id')
        
        if not cliente_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de cliente no proporcionado',
                'exito': False
            })

        cliente = Cliente.objects.get(id=cliente_id)
        cliente.activo = False
        cliente.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Cliente desactivada correctamente',
            'exito': True
        })

    except Cliente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Cliente no encontrada',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar cliente: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_cliente(request):
    try:
        cliente_id = request.GET.get('id')
        cliente = Cliente.objects.get(id=cliente_id)
        return JsonResponse({
            'id': cliente.id,
            'descripcion': cliente.descripcion,
            'comentario': cliente.comentario,
            'id_tipo': cliente.id_tipo_id,
            'activo': cliente.activo
        })
    except Cliente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Cliente no encontrada'
        }, status=404)

@require_http_methods(["POST"])
def editar_cliente(request):
    try:
        cliente_id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        comentario = request.POST.get('comentario', '')
        id_tipo = request.POST.get('id_tipo')
        
        cliente = Cliente.objects.get(id=cliente_id)
        cliente.descripcion = descripcion
        cliente.comentario = comentario
        cliente.id_tipo_id = id_tipo
        cliente.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Cliente actualizada correctamente',
            'exito': True
        })
    except Cliente.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Cliente no encontrada',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar cliente: {str(e)}',
            'exito': False
        })

@login_required(login_url='/accounts/login/')
def lista_pasos_ot(request):
    """Lista de todas los pasos y afectaciones de ots"""
    return render(request, 'operaciones/catalogos/pasos_ot/lista_pasos_ot.html')

def datatable_pasos_ot(request):
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    pasos = PasoOt.objects.filter(activo=1).select_related('id_tipo_cliente').annotate(
        estado_texto=Case(
            When(activo=True, then=Value('Activo')),
            When(activo=False, then=Value('Inactivo')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
    ).order_by('tipo_id', 'id')
    
    if search_value:
        pasos = pasos.filter(
            Q(descripcion__icontains=search_value) |
            Q(activo__icontains=search_value)
        )
    
    total_records = pasos.count()
    pasos = pasos[start:start + length]
    
    data = []
    for paso in pasos:
        data.append({
            'id': paso.id,
            'descripcion': paso.descripcion,
            'activo': paso.estado_texto, 
            'importancia': paso.importancia,
            'afectacion': paso.id_tipo_cliente.descripcion,
            'tipo':paso.tipo.descripcion,
            'activo_bool': paso.activo,
            'orden':paso.orden
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["POST"])
def crear_paso_ot(request):
    try:
        descripcion = request.POST.get('descripcion')
        orden = request.POST.get('orden')
        activo = True
        importancia = request.POST.get('importancia')
        comentario = request.POST.get('comentario', '')
        id_tipo_cliente = request.POST.get('afectacion','')
        id_tipo = request.POST.get('tipo','')
        paso = PasoOt.objects.create(
            descripcion=descripcion,
            orden=orden,
            activo=activo,
            importancia=importancia,
            comentario=comentario,
            tipo_id=id_tipo,
            id_tipo_cliente_id=id_tipo_cliente,
        )
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Paso creado correctamente',
            'id': paso.id
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear paso: {str(e)}'
        })
        
@require_http_methods(["POST"])
def eliminar_paso_ot(request):
    try:
        id = request.POST.get('id')
        
        if not id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de paso no proporcionado',
                'exito': False
            })

        paso = PasoOt.objects.get(id=id)
        paso.activo = False
        paso.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Paso desactivado correctamente',
            'exito': True
        })

    except PasoOt.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al desactivar paso: {str(e)}',
            'exito': False
        })

@require_http_methods(["GET"])
def obtener_paso_ot(request):
    try:
        id = request.GET.get('id')
        paso = PasoOt.objects.get(id=id)
        return JsonResponse({
            'id': paso.id,
            'descripcion': paso.descripcion,
            'orden': paso.orden,
            'comentario': paso.comentario,
            'activo': paso.activo,
            'importancia':paso.importancia,
            'afectacion':paso.id_tipo_cliente_id
        })
    except PasoOt.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado'
        }, status=404)

@require_http_methods(["POST"])
def editar_paso_ot(request):
    try:
        id = request.POST.get('id')
        descripcion = request.POST.get('descripcion')
        orden = request.POST.get('orden')
        importancia = request.POST.get('importancia')
        comentario = request.POST.get('comentario', '')
        id_tipo_cliente = request.POST.get('afectacion','')
        id_tipo = request.POST.get('tipo','')

        paso = PasoOt.objects.get(id=id)
        paso.descripcion = descripcion
        paso.importancia = importancia
        paso.orden = orden
        paso.comentario = comentario
        paso.id_tipo_cliente_id = id_tipo_cliente
        paso.tipo_id = id_tipo
        paso.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'Paso actualizado correctamente',
            'exito': True
        })
    except PasoOt.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado',
            'exito': False
        })
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar el paso: {str(e)}',
            'exito': False
        })
