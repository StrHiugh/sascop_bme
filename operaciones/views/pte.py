from datetime import timedelta
from django.utils import timezone
from django.forms import IntegerField
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.db.models import Case, When, Value, CharField,Q, ExpressionWrapper, Count,F
from operaciones.models.catalogos_models import Embarcacion, Estatus, ResponsableProyecto, Tipo
from ..models import PTEHeader, PTEDetalle, OTE, Produccion, Paso

@login_required(login_url='/accounts/login/')
def index(request):
    """Página principal del sistema"""
    # Estadísticas básicas para el dashboard
    total_ptes = PTEHeader.objects.filter(estatus__in=[1,2,3,4]).count()
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
    return render(request, 'operaciones/pte/lista_pte.html')

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
    
    # Filtro adicional del input de búsqueda
    filtro_buscar = request.GET.get('filtro', '')
    
    ptes = PTEHeader.objects.filter(estatus__gt=0).select_related('id_tipo').annotate(
        estatus_texto=Case(
            When(estatus=1, then=Value('PENDIENTE')),
            When(estatus=2, then=Value('PROCESO')),
            When(estatus=3, then=Value('ENTREGADA')),
            When(estatus=4, then=Value('CANCELADA')),
            default=Value('DESCONOCIDO'),
            output_field=CharField()
        )
    ).order_by('id')    
    
    if search_value:
        ptes = ptes.filter(
            Q(descripcion_trabajo__icontains=search_value) |
            Q(oficio_pte__icontains=search_value) |
            Q(id_responsable_proyecto__descripcion__icontains=search_value) 
        )
        
    if filtro_buscar:
        ptes = ptes.filter(
            Q(descripcion_trabajo__icontains=filtro_buscar) |
            Q(oficio_pte__icontains=filtro_buscar) |
            Q(oficio_solicitud__icontains=filtro_buscar) 
        )
    
    filtro_estado = request.GET.get('estado', '')
    if filtro_estado:
        ptes = ptes.filter(estado=filtro_estado)
    
    total_records = ptes.count()
    ptes = ptes[start:start + length]
    
    data = []
    for pte in ptes:
        detalles = PTEDetalle.objects.filter(id_pte_header_id=pte.id)
        total_pasos = detalles.count()
        pasos_completados = detalles.filter(estatus_paso__in=[3,14]).count()  # 3 = COMPLETADO 14 =
        
        progreso = 0
        if total_pasos > 0:
            progreso = (pasos_completados / total_pasos) * 100 #calcular porcentaje
        
        data.append({
            'id': pte.id,
            'id_tipo_id': pte.id_tipo_id,
            'descripcion_tipo':pte.id_tipo.descripcion,
            'oficio_pte': pte.oficio_pte,
            'estatus': pte.estatus,
            'estatus_texto': pte.estatus_texto,
            'oficio_solicitud':pte.oficio_solicitud,
            'descripcion_trabajo': pte.descripcion_trabajo,
            'fecha_solicitud': pte.fecha_solicitud.isoformat() if pte.fecha_solicitud else None,
            'fecha_entrega': pte.fecha_entrega.strftime('%d/%m/%Y') if pte.fecha_entrega else None,
            'responsable_proyecto': pte.id_responsable_proyecto_id if pte.id_responsable_proyecto_id else '',
            'plazo_dias': pte.plazo_dias or 0,
            'progreso': round(progreso),  # Porcentaje de progreso
            'pasos_completados': pasos_completados,
            'total_pasos': total_pasos
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
    
    # Parámetros de paginación (nuevo)
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    draw = int(request.GET.get('draw', 1))
    
    detalles = PTEDetalle.objects.filter(
        id_pte_header_id=pte_header_id, id_paso__tipo=1  # Solo pasos principales
    ).select_related('id_paso').annotate(
        estatus_pte_texto=Case(
            When(estatus_paso=1, then=Value('PENDIENTE')),
            When(estatus_paso=2, then=Value('PROCESO')),
            When(estatus_paso=3, then=Value('COMPLETADO')),
            When(estatus_paso=4, then=Value('CANCELADO')),
            When(estatus_paso=14, then=Value('NO APLICA')),
            default=Value('DESCONOCIDO'),
            output_field=CharField()
        )
    ).order_by('id')
    
    for detalle in detalles:
        if detalle.id_paso_id==4:
            subpasos = PTEDetalle.objects.filter(
                id_pte_header_id=pte_header_id,
                id_paso__tipo=2  # Solo subpasos
            )
            total_subpasos = subpasos.count()
            subpasos_completados = subpasos.filter(estatus_paso__in=[3,14]).count()
            
            if total_subpasos > 0:
                detalle.progreso_subpasos = (subpasos_completados / total_subpasos) * 100
            else:
                detalle.progreso_subpasos = 0
        else:
            detalle.progreso_subpasos = None
    
    # Total de registros (sin paginar)
    total_records = detalles.count()
    
    # Aplicar paginación (nuevo)
    detalles = detalles[start:start + length]
    
    data = []
    for detalle in detalles:        
        data.append({
            'id': detalle.id,
            'orden': detalle.id_paso.orden,
            'desc_paso': detalle.id_paso.descripcion,
            'tipo_paso': detalle.id_paso.tipo,
            'estatus_pte': detalle.estatus_paso_id,
            'estatus_pte_texto': detalle.estatus_pte_texto,
            'fecha_entrega': detalle.fecha_entrega.strftime('%d/%m/%Y') if detalle.fecha_entrega else None,
            'fecha_inicio': detalle.fecha_inicio,
            'fecha_termino': detalle.fecha_termino,
            'comentario': detalle.comentario or '',
            'es_subpaso': detalle.id_paso.tipo == 2,  # Flag para identificar subpasos
            'progreso_subpasos': getattr(detalle, 'progreso_subpasos', None),  # Progreso solo para paso 4
            'total_subpasos': getattr(detalle, 'total_subpasos', 0),
            'subpasos_completados': getattr(detalle, 'subpasos_completados', 0)
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records, 
        'recordsFiltered': total_records, 
        'data': data
    })
    
def datatable_subpasos(request):
    """Datatable para subpasos del paso 4 (Volumetría)"""
    pte_header_id = request.GET.get('pte_header_id')
    
    # Obtener solo los subpasos (tipo=2) para este PTE
    subpasos = PTEDetalle.objects.filter(
        id_pte_header_id=pte_header_id,
        id_paso__tipo=2  # Solo subpasos
    ).select_related('id_paso').annotate(
        estatus_pte_texto=Case(
            When(estatus_paso=1, then=Value('PENDIENTE')),
            When(estatus_paso=2, then=Value('PROCESO')),
            When(estatus_paso=3, then=Value('COMPLETADO')),
            When(estatus_paso=4, then=Value('CANCELADO')),
            When(estatus_paso=14, then=Value('NO APLICA')),
            default=Value('DESCONOCIDO'),
            output_field=CharField()
        )
    ).order_by('id')
    
    data = []
    for subpaso in subpasos:
        data.append({
            'id': subpaso.id,
            'orden': subpaso.id_paso.orden,
            'desc_paso': subpaso.id_paso.descripcion,
            'estatus_pte_texto': subpaso.estatus_pte_texto,
            'estatus_pte': subpaso.estatus_paso_id,
            'fecha_entrega': subpaso.fecha_entrega,
            'fecha_inicio': subpaso.fecha_inicio,
            'fecha_termino': subpaso.fecha_termino,
            'comentario': subpaso.comentario or ''
        })
    
    return JsonResponse({
        'data': data
    })
    
@require_http_methods(["POST"])
@login_required
def cambiar_estatus_pte(request):
    """Cambiar estatus de una PTE"""
    try:
        pte_id = request.POST.get('pte_id')
        nuevo_estatus = request.POST.get('nuevo_estatus')
        comentario = request.POST.get('comentario', '')
        fecha_entrega = request.POST.get('fecha_entrega', None)
        
        if not pte_id or not nuevo_estatus:
            return JsonResponse({
                'exito': False,
                'detalles': 'Datos incompletos'
            })
        
        # Obtener la PTE
        pte = PTEHeader.objects.get(id=pte_id)
        # Guardar el estatus anterior para verificar cambios
        estatus_anterior = pte.estatus
        # Actualizar el estatus
        pte.estatus = nuevo_estatus
        if comentario:
            pte.comentario = comentario
        
            
        if int(nuevo_estatus) == 3 and estatus_anterior != 3:
            if fecha_entrega:
                pte.fecha_entrega = fecha_entrega
            else:
                pte.fecha_entrega = timezone.now()        
        # Si se cambia de COMPLETADO a otro estatus, limpiar la fecha de completado
        elif estatus_anterior == 3 and int(nuevo_estatus) != 3:
            pte.fecha_entrega = None
        
        pte.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Estatus de la PTE actualizado correctamente'
        })
        
    except PTEHeader.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'detalles': 'PTE no encontrada'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al cambiar estatus: {str(e)}'
        })

@require_http_methods(["GET"])
@login_required
def obtener_progreso_general_pte(request):
    """Obtener progreso general actualizado de una PTE"""
    try:
        pte_id = request.GET.get('pte_id')
        
        if not pte_id:
            return JsonResponse({
                'exito': False,
                'detalles': 'ID de PTE no proporcionado'
            })
        
        # Obtener todos los pasos de la PTE
        detalles = PTEDetalle.objects.filter(id_pte_header_id=pte_id)
        total_pasos = detalles.count()
        pasos_completados = detalles.filter(estatus_paso__in=[3, 14]).count()  # 3=COMPLETADO, 14=NO APLICA
        
        progreso = 0
        if total_pasos > 0:
            progreso = (pasos_completados / total_pasos) * 100
        
        return JsonResponse({
            'exito': True,
            'progreso': round(progreso),
            'pasos_completados': pasos_completados,
            'total_pasos': total_pasos
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al obtener progreso general: {str(e)}'
        })

@require_http_methods(["GET"])
@login_required
def obtener_progreso_paso4(request):
    """Obtener progreso actualizado del paso 4 (Volumetría)"""
    try:
        pte_header_id = request.GET.get('pte_header_id')
        
        if not pte_header_id:
            return JsonResponse({
                'exito': False,
                'detalles': 'ID de PTE no proporcionado'
            })
        
        # Obtener subpasos (tipo=2) de este PTE
        subpasos = PTEDetalle.objects.filter(
            id_pte_header_id=pte_header_id,
            id_paso__tipo=2  # Solo subpasos
        )
        
        total_subpasos = subpasos.count()
        subpasos_completados = subpasos.filter(estatus_paso__in=[3, 14]).count()  # 3=COMPLETADO, 14=NO APLICA
        
        progreso = 0
        if total_subpasos > 0:
            progreso = (subpasos_completados / total_subpasos) * 100
        
        # Obtener descripción del paso 4
        paso4 = PTEDetalle.objects.filter(
            id_pte_header_id=pte_header_id,
            id_paso__orden=4  # Paso 4 = Volumetría
        ).select_related('id_paso').first()
        
        descripcion = paso4.id_paso.descripcion if paso4 else "Volumetría de Materiales"
        
        return JsonResponse({
            'exito': True,
            'progreso': round(progreso),
            'subpasos_completados': subpasos_completados,
            'total_subpasos': total_subpasos,
            'descripcion_paso': descripcion
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al obtener progreso: {str(e)}'
        })

@require_http_methods(["POST"])
@login_required
def actualizar_fecha(request):
    """Actualizar fecha de inicio de un paso"""
    try:
        id_paso = request.POST.get('id_paso')
        fecha = request.POST.get('fecha')
        tipo = request.POST.get('tipo')
        if not id_paso:
            return JsonResponse({
                'exito': False,
                'detalles': 'ID del paso no proporcionado'
            })
        
        paso_detalle = PTEDetalle.objects.get(id=id_paso)
        
        # Validar y guardar la fecha
        if tipo == '1':
            if fecha:
                paso_detalle.fecha_inicio = fecha
            else:
                paso_detalle.fecha_inicio = None
                
        elif tipo == '2':
            if fecha:
                paso_detalle.fecha_termino = fecha
            else:
                paso_detalle.fecha_termino = None
        elif tipo == '3':
            if fecha:
                paso_detalle.fecha_entrega = fecha
            else:
                paso_detalle.fecha_entrega = None
        paso_detalle.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Fecha actualizada correctamente',
            'fecha_actualizada': fecha
        })
        
    except PTEDetalle.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'detalles': 'Paso no encontrado'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al actualizar fecha: {str(e)}'
        })

@login_required(login_url='/accounts/login/')
def obtener_pasos_pte(request):
    """Obtener todos los pasos para PTE"""
    try:
        pasos = Paso.objects.filter(activo=1)
        return JsonResponse(list(pasos), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@login_required(login_url='/accounts/login/')
def obtener_responsables_proyecto(request):
    """Obtener todos los responsables de proyecto activos"""
    try:
        responsables = ResponsableProyecto.objects.filter(activo=1).values('id', 'descripcion')
        return JsonResponse(list(responsables), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
@login_required
def crear_pte(request):
    """Crear PTE con header y detalles"""
    try:
        get_val = lambda k, d=None, t=str: t(v) if (v := request.POST.get(k, '').strip()) else d
        
        # Datos del header
        oficio_pte = get_val('oficio_pte', 'SIN FOLIO')
        oficio_solicitud = get_val('oficio_solicitud', 'PENDIENTE')
        descripcion_trabajo = get_val('descripcion_trabajo','POR DEFINIR')
        responsable_proyecto = get_val('responsable_proyecto')
        fecha_solicitud = get_val('fecha_solicitud')
        fecha_entrega = get_val('fecha_entrega', None)
        prioridad = get_val('id_prioridad')
        plazo_dias = get_val('plazo_dias', 0, int)
        id_tipo_id = get_val('id_tipo', None, int)
        total_homologado = get_val('total_homologado', 0.00, float)
        oficio_ot = get_val('oficio_ot', '')
        comentario_general = get_val('comentario_general', '')
        
        # Validaciones básicas de campos obligatorios
        if not responsable_proyecto:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El responsable del proyecto es obligatorio'
            })
        
        if not id_tipo_id:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El tipo de PTE es obligatorio'
            })
        
        if plazo_dias <= 0:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El plazo en días debe ser mayor a 0'
            })
        
        if not prioridad:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'La prioridad es obligatoria'
            })
        
        # Crear el header del PTE
        pte_header = PTEHeader.objects.create(
            oficio_pte=oficio_pte,
            oficio_solicitud=oficio_solicitud,
            descripcion_trabajo=descripcion_trabajo,
            id_responsable_proyecto_id=responsable_proyecto,
            fecha_solicitud=fecha_solicitud,
            prioridad = prioridad,
            fecha_entrega=fecha_entrega,
            plazo_dias=plazo_dias,
            total_homologado=total_homologado,
            id_tipo_id=id_tipo_id,
            id_orden_trabajo=oficio_ot,
            comentario=comentario_general,
            estatus=1
        )
        
        # Obtener todos los pasos activos y crear detalles
        pasos = Paso.objects.filter(activo=1).order_by('id', 'orden')
        
        detalles_creados = []
        for paso in pasos:
            detalle = PTEDetalle.objects.create(
                id_pte_header_id=pte_header.id,
                id_paso_id=paso.id,
                estatus_paso_id=1,
                comentario=''
            )
            detalles_creados.append(detalle.id)
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': f'PTE creado correctamente',
            'id': pte_header.id
        })
        
    except ValueError as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error en el formato de los datos: {str(e)}'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear PTE: {str(e)}'
        })

@require_http_methods(["POST"])
@login_required
def cambiar_estatus_paso(request):
    """Cambiar estatus de un paso del PTE"""
    try:
        paso_id = request.POST.get('paso_id')
        nuevo_estatus = request.POST.get('nuevo_estatus')
        comentario = request.POST.get('comentario','')
        fecha_entrega = request.POST.get('fecha_entrega','')
        
        if not paso_id or not nuevo_estatus:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'advertencia',
                'detalles': 'Datos incompletos'
            })
        
        # Obtener el detalle del paso
        detalle = PTEDetalle.objects.get(id=paso_id)
        pte_header_id = detalle.id_pte_header_id
        
        # Guardar el estatus anterior para verificar cambios
        estatus_anterior = detalle.estatus_paso_id
        
        # Actualizar el estatus
        detalle.estatus_paso_id = int(nuevo_estatus)
        if comentario:
            detalle.comentario = comentario
            
        if int(nuevo_estatus) == 3 and estatus_anterior != 3:
            if fecha_entrega:
                detalle.fecha_entrega = fecha_entrega
            else:
                detalle.fecha_entrega = timezone.now()        
        # Si se cambia de COMPLETADO a otro estatus, limpiar la fecha de completado
        elif estatus_anterior == 3 and int(nuevo_estatus) != 3:
            detalle.fecha_entrega = None
            
        detalle.save()
        
        # VERIFICAR SI ES UN SUBPASO DEL PASO 4 Y ACTUALIZAR AUTOMÁTICAMENTE
        paso_actualizado_4 = verificar_y_actualizar_paso_4(pte_header_id)
        
        # Recalcular progreso del PTE
        detalles_pte = PTEDetalle.objects.filter(id_pte_header_id=detalle.id_pte_header_id)
        total_pasos = detalles_pte.count()
        pasos_completados = detalles_pte.filter(estatus_paso=3).count()
        
        progreso = 0
        if total_pasos > 0:
            progreso = (pasos_completados / total_pasos) * 100
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Estatus actualizado correctamente',
            'progreso': round(progreso),
            'pasos_completados': pasos_completados,
            'total_pasos': total_pasos,
            'paso_actualizado_4': paso_actualizado_4
        })
        
    except PTEDetalle.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al cambiar estatus: {str(e)}'
        })
        
def verificar_y_actualizar_paso_4(pte_header_id):
    """Verificar si todos los subpasos del paso 4 están completados y actualizarlo automáticamente"""
    try:
        # Obtener el paso 4 de esta PTE
        paso_4 = PTEDetalle.objects.filter(
            id_pte_header_id=pte_header_id,
            id_paso_id=4  # Paso 4 = Volumetría
        ).first()
        
        if not paso_4:
            return False
        
        # Obtener todos los subpasos (tipo=2) de esta PTE
        subpasos = PTEDetalle.objects.filter(
            id_pte_header_id=pte_header_id,
            id_paso__tipo=2  # Solo subpasos
        )
        
        total_subpasos = subpasos.count()
        
        if total_subpasos == 0:
            return False
        
        # Contar subpasos completados (3=COMPLETADO, 14=NO APLICA)
        subpasos_completados = subpasos.filter(estatus_paso__in=[3, 14]).count()
        
        # Si todos los subpasos están completados, actualizar el paso 4 a COMPLETADO
        if subpasos_completados == total_subpasos and paso_4.estatus_paso_id != 3:
            paso_4.estatus_paso_id = 3  # COMPLETADO
            paso_4.comentario = "Entregables finalizados"
            paso_4.fecha_termino = timezone.now().date()
            paso_4.save()
            return True  
        
        return False
        
    except Exception as e:
        print(f"Error al verificar paso 4: {str(e)}")
        return False
        
        
@require_http_methods(["GET"])
@login_required(login_url='/accounts/login/')
def obtener_datos_pte(request):
    """Obtener datos de un PTE para edición"""
    try:
        pte_id = request.GET.get('id')
        pte = get_object_or_404(PTEHeader, id=pte_id)
        datos_pte = {
            'id': pte.id,
            'oficio_pte': pte.oficio_pte,
            'oficio_solicitud': pte.oficio_solicitud,
            'descripcion_trabajo': pte.descripcion_trabajo,
            'fecha_solicitud': pte.fecha_solicitud.strftime('%Y-%m-%d') if pte.fecha_solicitud else '',
            'plazo_dias': pte.plazo_dias,
            'id_prioridad': pte.prioridad,
            'id_tipo': pte.id_tipo_id,
            'fecha_entrega': pte.fecha_entrega.strftime('%Y-%m-%d') if pte.fecha_entrega else '',
            'id_responsable_proyecto': pte.id_responsable_proyecto_id,
            'total_homologado': float(pte.total_homologado) if pte.total_homologado else 0,
            'id_orden_trabajo': pte.id_orden_trabajo,
            'comentario': pte.comentario,
            'estatus': pte.estatus
        }
        print (datos_pte)
        return JsonResponse({
            'exito': True,
            'datos': datos_pte
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al obtener datos del PTE: {str(e)}'
        })

@require_http_methods(["POST"])
@login_required
def editar_pte(request):
    """Editar PTE existente"""
    try:
        pte_id = request.POST.get('id')
        if not pte_id:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'ID del PTE no proporcionado'
            })
        
        pte = get_object_or_404(PTEHeader, id=pte_id)
        
        # Actualizar campos
        pte.oficio_pte = request.POST.get('oficio_pte', pte.oficio_pte)
        pte.oficio_solicitud = request.POST.get('oficio_solicitud', pte.oficio_solicitud)
        pte.descripcion_trabajo = request.POST.get('descripcion_trabajo', pte.descripcion_trabajo)
        pte.id_responsable_proyecto_id = request.POST.get('responsable_proyecto', pte.id_responsable_proyecto_id)
        pte.id_tipo_id = request.POST.get('id_tipo', pte.id_tipo_id)
        pte.prioridad = request.POST.get('id_prioridad', pte.prioridad)
        
        # Campos con validación
        fecha_solicitud = request.POST.get('fecha_solicitud')
        if fecha_solicitud:
            pte.fecha_solicitud = fecha_solicitud
            
        fecha_entrega = request.POST.get('fecha_entrega')
        if fecha_entrega:
            pte.fecha_entrega = fecha_entrega
        
        plazo_dias = request.POST.get('plazo_dias')
        if plazo_dias:
            pte.plazo_dias = float(plazo_dias)
        
        total_homologado = request.POST.get('total_homologado')
        if total_homologado:
            pte.total_homologado = float(total_homologado)
        
        pte.id_orden_trabajo = request.POST.get('oficio_ot', pte.id_orden_trabajo)
        pte.comentario = request.POST.get('comentario_general', pte.comentario)
        
        pte.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'PTE actualizado correctamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar PTE: {str(e)}'
        })
        
@require_http_methods(["POST"])
@login_required
def eliminar_pte(request):
    """Eliminación lógica de PTE"""
    try:
        # Obtener el ID del PTE
        pte_id = request.POST.get('id')

        if not pte_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID del PTE no proporcionado',
                'exito': False
            })

        # Eliminación lógica - cambiar estatus a 0
        pte = PTEHeader.objects.get(id=pte_id)
        pte.estatus = 0  # Cambiar estatus a 0 para eliminación lógica
        pte.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'PTE eliminado correctamente',
            'exito': True
        })

    except PTEHeader.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'PTE no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al eliminar PTE: {str(e)}',
            'exito': False
        })

@require_http_methods(["POST"])
@login_required
def crear_ot_desde_pte(request):
    """Crear OT automáticamente desde PTE completada"""
    try:
        pte_id = request.POST.get('pte_id')
        oficio_ot = request.POST.get('folio')
        
        if not pte_id or not oficio_ot:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'Datos incompletos'
            })
        
        # Obtener la PTE
        pte = PTEHeader.objects.get(id=pte_id)
        
        # Verificar que el progreso sea 100%
        detalles_pte = PTEDetalle.objects.filter(id_pte_header_id=pte.id)
        total_pasos = detalles_pte.count()
        pasos_completados = detalles_pte.filter(estatus_paso=3).count()
        
        progreso = (pasos_completados / total_pasos) * 100 if total_pasos > 0 else 0
        
        if progreso < 100:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'advertencia',
                'detalles': 'La PTE debe estar 100% completada para crear una OT'
            })
        
        # Verificar si ya existe una OT para esta PTE
        if OTE.objects.filter(id_pte_header=pte).exists():
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'advertencia',
                'detalles': 'Ya existe una OT creada para esta PTE'
            })
        
        # Verificar si el folio ya existe
        if OTE.objects.filter(orden_trabajo=oficio_ot).exists():
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'El oficio de OT ya existe'
            })
        
        # Crear la OTE automáticamente
        # Buscar un tipo adecuado para OTE (nivel_afectacion=2)
        tipo_ote = Tipo.objects.filter(nivel_afectacion=2).first()
        if not tipo_ote:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'No se encontró un tipo válido para OTE'
            })
        
        # Buscar embarcación por defecto (puedes ajustar esto)
        embarcacion_default = Embarcacion.objects.filter(activo=1).first()
        if not embarcacion_default:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'No se encontró una embarcación válida'
            })
        
        # Buscar estatus por defecto para OTE
        estatus_ote_default = Estatus.objects.filter(nivel_afectacion=2).first()
        if not estatus_ote_default:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'No se encontró un estatus válido para OT'
            })
        
        # Calcular fechas programadas (puedes ajustar esta lógica)
        fecha_actual = timezone.now().date()
        fecha_termino = fecha_actual + timedelta(days=pte.plazo_dias)
        
        # Crear la OTE
        ote = OTE.objects.create(
            id_tipo=tipo_ote,
            id_pte_header=pte,
            orden_trabajo=oficio_ot,
            descripcion_trabajo=pte.descripcion_trabajo,
            id_responsable_proyecto=pte.id_responsable_proyecto,
            responsable_cliente="POR DEFINIR", 
            oficio_ot='PENDIENTE',
            id_embarcacion=embarcacion_default,
            id_estatus_ot=estatus_ote_default,
            fecha_inicio_programada=fecha_actual,
            fecha_termino_programada=fecha_termino,
            estatus=-1,
            comentario=""
        )
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': f'OT creada correctamente: {ote.orden_trabajo}',
            'ote_id': ote.id
        })
        
    except PTEHeader.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': 'PTE no encontrada'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear OT: {str(e)}'
        })