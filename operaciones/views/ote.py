from datetime import timedelta
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from ..models import OTE, OTDetalle
from ..registro_actividad import registrar_actividad
from operaciones.models.catalogos_models import Sitio, Estatus, ResponsableProyecto, Tipo
from django.db.models import Case, When, Value, CharField,Q, ExpressionWrapper, Count,F

@login_required(login_url='/accounts/login/')
def lista_ote(request):
    """Lista de todas las OTE"""
    return render(request, 'operaciones/ot/lista_ot.html')

def datatable_ot(request):
    """Datatable para PTE"""
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('search[value]', '')
    
    # Filtro adicional del input de búsqueda
    filtro_buscar = request.GET.get('filtro', '')
    
    tipo_id = request.GET.get('tipo', '4') 
    ot_principal_id = request.GET.get('ot_principal', None)

    filters = {'estatus__in': [-1, 1]}
    
    if tipo_id:
        filters['id_tipo_id'] = tipo_id
        
    if ot_principal_id:
        filters['ot_principal'] = ot_principal_id

    ots = OTE.objects.filter(**filters).select_related(
        'id_tipo','id_pte_header','id_estatus_ot'
        ).annotate(
        estado_texto=Case(
            When(estatus=1, then=Value('Activo')),
            When(estatus=0, then=Value('Inactivo')),
            When(estatus=-1, then=Value('Por definir')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        estatus_ot_texto=F('id_estatus_ot__descripcion'),
        estatus_ot_id_db=F('id_estatus_ot_id')
    ).order_by('-id')

    if search_value:
        ots = ots.filter(
            Q(descripcion_trabajo__icontains=search_value) |
            Q(oficio_ot__icontains=search_value) |
            Q(orden_trabajo__icontains=search_value) 
        )
        
    if filtro_buscar:
        ots = ots.filter(
            Q(descripcion_trabajo__icontains=filtro_buscar) |
            Q(oficio_ot__icontains=filtro_buscar) |
            Q(orden_trabajo__icontains=filtro_buscar)             
        )
    
    total_records = ots.count()
    
    if length == -1:
        ots = ots[start:]
    else:
        ots = ots[start:start + length]
    
    data = []
    for ot in ots:
        # Si estatus es -1, mostrar "Por definir", sino mostrar el estatus_ot que se tenga
        if ot.estatus == -1:
            estatus_display = 'Por definir'
            estatus_ot_texto = 'POR DEFINIR'
        else:
            estatus_display = ot.estatus_ot_texto or 'ASIGNADA'
            estatus_ot_texto = ot.estatus_ot_texto or 'ASIGNADA'
        
        
        data.append({
            'id': ot.id,
            'id_tipo_id': ot.id_tipo_id,
            'id_frente': ot.id_frente,
            'id_embarcacion': ot.id_embarcacion,
            'id_plataforma': ot.id_plataforma,
            'id_intercom': ot.id_intercom,
            'id_patio': ot.id_patio,
            'descripcion_tipo':ot.id_tipo.descripcion,
            'estatus': estatus_display,
            'estatus_numero': ot.estatus,  # -1 o 1
            'estatus_ot_id': ot.id_estatus_ot_id,
            'estatus_ot_texto': estatus_ot_texto,
            'responsable_proyecto': ot.id_responsable_proyecto_id if ot.id_responsable_proyecto_id else '',
            'responsable_cliente':ot.responsable_cliente,
            'id_pte_id': ot.id_pte_header_id,
            'pte_padre': ot.id_pte_header.oficio_pte,
            'oficio_ot': ot.oficio_ot,
            'orden_trabajo':ot.orden_trabajo,
            'descripcion_trabajo': ot.descripcion_trabajo,
            'fecha_inicio_programada': ot.fecha_inicio_programado.strftime('%d/%m/%Y') if ot.fecha_inicio_programado else None,
            'fecha_inicio_real': ot.fecha_inicio_real.strftime('%d/%m/%Y') if ot.fecha_inicio_real else None, 
            'fecha_termino_programada': ot.fecha_termino_programado.strftime('%d/%m/%Y') if ot.fecha_termino_programado else None,
            'fecha_termino_real': ot.fecha_termino_real.strftime('%d/%m/%Y') if ot.fecha_termino_real else None,   
            'comentario':ot.comentario,
            'ot_principal': ot.ot_principal,
            'plazo_dias': ot.plazo_dias,
            'num_reprogramacion': ot.num_reprogramacion,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })

@require_http_methods(["GET"])
@login_required(login_url='/accounts/login/')
def obtener_datos_ot(request):
    """Obtener datos de una OT para edición"""
    try:
        ot_id = request.GET.get('id')
        ot = get_object_or_404(OTE, id=ot_id)
        datos_ot = {
            'id': ot.id,
            'id_tipo_id': ot.id_tipo_id,
            'id_frente': ot.id_frente,
            'id_embarcacion': ot.id_embarcacion,
            'id_plataforma': ot.id_plataforma,
            'id_intercom': ot.id_intercom,
            'id_patio': ot.id_patio,
            'descripcion_tipo':ot.id_tipo.descripcion,
            'estatus_ot':ot.id_estatus_ot_id,
            'responsable_proyecto': ot.id_responsable_proyecto_id if ot.id_responsable_proyecto_id else '',
            'responsable_cliente':ot.responsable_cliente,
            'id_pte_id': ot.id_pte_header_id,
            'pte_padre': ot.id_pte_header.oficio_pte,
            'oficio_ot': ot.oficio_ot,
            'estatus':ot.estatus,
            'orden_trabajo':ot.orden_trabajo,
            'descripcion_trabajo': ot.descripcion_trabajo,
            'fecha_inicio_programado': ot.fecha_inicio_programado.isoformat() if ot.fecha_inicio_programado else None,
            'fecha_inicio_real': ot.fecha_inicio_real.isoformat() if ot.fecha_inicio_real else None, 
            'fecha_termino_programado': ot.fecha_termino_programado.isoformat() if ot.fecha_termino_programado else None,
            'fecha_termino_real': ot.fecha_termino_real.isoformat() if ot.fecha_termino_real else None,   
            'comentario':ot.comentario,
            'ot_principal': ot.ot_principal,
            'num_reprogramacion': ot.num_reprogramacion,
            'monto_mxn': ot.monto_mxn,
            'monto_usd': ot.monto_usd,
            'plazo_dias': ot.plazo_dias,
            
        }
        
        return JsonResponse({
            'exito': True,
            'datos': datos_ot
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al obtener datos de la OT: {str(e)}'
        })
        
@require_http_methods(["GET"])
def obtener_ots_principales(request):
    """Obtener todas las OTs para el selector de OT principal"""
    try:
        ot_id = request.GET.get('ot_id')

        ots = OTE.objects.filter(
            id_tipo=4, 
        ).exclude(
            estatus=0,
        ).values('id', 'orden_trabajo', 'descripcion_trabajo')
        
        if ot_id:
            ots = ots.exclude(id=ot_id)
        
        data = list(ots)
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)

@require_http_methods(["POST"])
@login_required
def eliminar_ot(request):
    """Eliminación lógica de OT"""
    try:
        # Obtener el ID del PTE
        ot_id = request.POST.get('id')

        if not ot_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de la OT no proporcionado',
                'exito': False
            })

        ot = OTE.objects.get(id=ot_id)
        ot.estatus = 0  # Cambiar estatus a 0 para eliminación lógica
        ot.save()

        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'OT eliminado correctamente',
            'exito': True
        })

    except OTE.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'OT no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al eliminar OT: {str(e)}',
            'exito': False
        })

@require_http_methods(["POST"])
@login_required
def cambiar_estatus_ot(request):
    """Cambiar estatus de OT"""
    try:
        ot_id = request.POST.get('ot_id')
        nuevo_estatus_id = request.POST.get('nuevo_estatus_id')
        
        if not ot_id or not nuevo_estatus_id:
            return JsonResponse({
                'exito': False,
                'detalles': 'Datos incompletos'
            })
        
        ot = OTE.objects.get(id=ot_id)

        # Actualizar el id_estatus_ot
        ot.id_estatus_ot_id = nuevo_estatus_id
        ot.save()
        
        return JsonResponse({
            'exito': True,
            'detalles': 'Estatus actualizado correctamente'
        })
        
    except OTE.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'detalles': 'OT no encontrada'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al cambiar estatus: {str(e)}'
        })
            
@require_http_methods(["POST"])
@login_required
def editar_ot(request):
    """Editar OT existente"""
    try:
        ot_id = request.POST.get('id')
        if not ot_id:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'error',
                'detalles': 'ID del OT no proporcionado'
            })
        
        ot = get_object_or_404(OTE, id=ot_id)

        if ot.estatus == -1:
            ot.estatus = 1
        ot.orden_trabajo = request.POST.get('orden_trabajo', ot.orden_trabajo)
        ot.responsable_cliente = request.POST.get('responsable_cliente', ot.responsable_cliente)
        ot.ot_principal = request.POST.get('ot_principal',ot.ot_principal)
        ot.oficio_ot = request.POST.get('oficio_ot', ot.oficio_ot)
        ot.id_tipo_id = request.POST.get('id_tipo', ot.id_tipo_id)
        ot.comentario = request.POST.get('comentario_general')
        ot.id_frente = request.POST.get('id_frente')
        ot.id_embarcacion = request.POST.get('id_embarcacion')
        ot.id_plataforma = request.POST.get('id_plataforma')
        ot.id_intercom = request.POST.get('id_intercom')
        ot.id_patio = request.POST.get('id_patio')
        ot.plazo_dias = request.POST.get('plazo_dias')
        ot.id_responsable_proyecto_id = request.POST.get('responsable_proyecto', ot.id_responsable_proyecto_id)
        # Actualizar montos
        if request.POST.get('monto_mxn'):
            ot.monto_mxn = request.POST.get('monto_mxn')

        if request.POST.get('monto_usd'):
            ot.monto_usd = request.POST.get('monto_usd')
        
        # Actualizar fechas:
        if request.POST.get('fecha_inicio_programado'):
            ot.fecha_inicio_programado = request.POST['fecha_inicio_programado']
            
        if request.POST.get('fecha_termino_programado'):
            ot.fecha_termino_programado = request.POST['fecha_termino_programado']
    
        if request.POST.get('fecha_inicio_real'):
            ot.fecha_inicio_real = request.POST['fecha_inicio_real']
            
        if request.POST.get('fecha_termino_real'):
            ot.fecha_termino_real = request.POST['fecha_termino_real']

        # Campos específicos para reprogramación
        num_reprogramacion = request.POST.get('num_reprogramacion')
        if num_reprogramacion and num_reprogramacion.strip(): 
            try:
                ot.num_reprogramacion = int(num_reprogramacion)
            except (ValueError, TypeError):
                return JsonResponse({
                    'exito': False,
                    'tipo_aviso': 'error',
                    'detalles': 'El número de reprogramación debe ser un número válido'
                })
        else:
            # Si está vacío, establecer como None
            ot.num_reprogramacion = None  
        
        
        ot.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'OT actualizado correctamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al actualizar OT: {str(e)}'
        })
        

@require_http_methods(["GET"])
def obtener_sitios_por_frente(request):
    try:
        frente_id = request.GET.get('frente_id')
        if not frente_id:
            return JsonResponse([], safe=False)
            
        sitios = Sitio.objects.filter(id_frente_id=frente_id, activo=True).values('id', 'descripcion')
        return JsonResponse(list(sitios), safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)

def datatable_ot_detalle(request):
    """Datatable para detalle de OT"""
    ot_id = request.GET.get('ot_id')
    
    # Parámetros de paginación
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    draw = int(request.GET.get('draw', 1))
    
    detalles = OTDetalle.objects.filter(
        id_ot_id=ot_id
    ).select_related('id_paso', 'id_ot', 'estatus_paso').annotate(
        estatus_texto=F('estatus_paso__descripcion')
    ).order_by('id_paso__id')
    
    # Total de registros (sin paginar)
    total_records = detalles.count()
    
    # Aplicar paginación
    if length != -1:
        detalles = detalles[start:start + length]
    
    data = []
    for detalle in detalles:        
        data.append({
            'id': detalle.id,
            'orden': detalle.id_paso.orden,
            'desc_paso': detalle.id_paso.descripcion,
            'tipo_paso': detalle.id_paso.tipo,
            'estatus_paso': detalle.estatus_paso_id,
            'estatus_texto': detalle.estatus_texto,
            'fecha_entrega': detalle.fecha_entrega.strftime('%d/%m/%Y') if detalle.fecha_entrega else None,
            'fecha_inicio': detalle.fecha_inicio.strftime('%d/%m/%Y') if detalle.fecha_inicio else None,
            'fecha_termino': detalle.fecha_termino.strftime('%d/%m/%Y') if detalle.fecha_termino else None,
            'comentario': detalle.comentario or '',
            'archivo': detalle.archivo,
            'oficio_ot': detalle.id_ot.oficio_ot,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records, 
        'recordsFiltered': total_records, 
        'data': data
    })

@require_http_methods(["POST"])
@login_required
@registrar_actividad
def cambiar_estatus_paso_ot(request):
    """Cambiar estatus de un paso de OT"""
    try:
        paso_id = request.POST.get('paso_id')
        nuevo_estatus = request.POST.get('nuevo_estatus')
        comentario = request.POST.get('comentario', '')
        fecha_entrega = request.POST.get('fecha_entrega', None)

        if not paso_id or not nuevo_estatus:
            return JsonResponse({
                'exito': False,
                'tipo_aviso': 'advertencia',
                'detalles': 'Datos incompletos'
            })
        
        detalle = OTDetalle.objects.get(id=paso_id)
        # Guardar el estatus anterior para verificar cambios
        estatus_anterior = detalle.estatus_paso_id
        #Asignar nuevo estatus
        detalle.estatus_paso_id = int(nuevo_estatus)
        if comentario:
            detalle.comentario = comentario
        else:
            detalle.comentario = None
            
        # Lógica de fechas automática (similar a PTE)
        if int(nuevo_estatus) == 3: # COMPLETADO (asumiendo ID 3)
            if fecha_entrega:
                detalle.fecha_entrega = fecha_entrega
            else:
                detalle.fecha_entrega = timezone.now()   
        # Si se cambia de COMPLETADO a otro estatus, limpiar la fecha de completado
        elif estatus_anterior == 3 and int(nuevo_estatus) != 3:
            detalle.fecha_entrega = None
        detalle.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Estatus actualizado correctamente'
        })
        
    except OTDetalle.DoesNotExist:
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

@require_http_methods(["POST"])
@login_required
@registrar_actividad
def actualizar_fecha_ot(request):
    """Actualizar fechas de un paso de OT"""
    try:
        id_paso = request.POST.get('id_paso')
        fecha = request.POST.get('fecha')
        tipo = request.POST.get('tipo') # 1: Inicio, 2: Termino, 3: Entrega
        
        if not id_paso:
            return JsonResponse({
                'exito': False,
                'detalles': 'ID del paso no proporcionado'
            })
        
        paso_detalle = OTDetalle.objects.get(id=id_paso)
        
        if tipo == '1':
            paso_detalle.fecha_inicio = fecha if fecha else None
        elif tipo == '2':
            paso_detalle.fecha_termino = fecha if fecha else None
        elif tipo == '3':
            paso_detalle.fecha_entrega = fecha if fecha else None
            
        paso_detalle.save()
        
        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'Fecha actualizada correctamente'
        })
        
    except OTDetalle.DoesNotExist:
        return JsonResponse({
            'exito': False,
            'detalles': 'Paso no encontrado'
        })
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al actualizar fecha: {str(e)}'
        })

@require_http_methods(["POST"])
@login_required
def guardar_archivo_ot(request):
    """Guardar Archivo de entregables de OT"""
    try:
        paso_id = request.POST.get('paso_id')
        url = request.POST.get('archivo')
        
        if not paso_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID del paso no proporcionado',
                'exito': False
            })

        paso = OTDetalle.objects.get(id=paso_id)
        paso.archivo = url
        paso.save()
        
        return JsonResponse({
            'tipo_aviso': 'exito',
            'detalles': 'URL asignada correctamente',
            'exito': True
        })

    except OTDetalle.DoesNotExist:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': 'Paso no encontrado',
            'exito': False
        })
        
    except Exception as e:
        return JsonResponse({
            'tipo_aviso': 'error',
            'detalles': f'Error al asignar url: {str(e)}',
            'exito': False
        })
