from datetime import timedelta
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from ..models import OTE
from operaciones.models.catalogos_models import Embarcacion, Estatus, ResponsableProyecto, Tipo
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
    
    # Get filters
    tipo_id = request.GET.get('tipo', '4') # Default to 4 (INICIAL)
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
    )

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
    
    filtro_estado = request.GET.get('estado', '')
    if filtro_estado:
        ots = ots.filter(estado=filtro_estado)
    
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
            'id_embarcacion_id': ot.id_embarcacion_id,
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
            'fecha_inicio_programada': ot.fecha_inicio_programada.strftime('%d/%m/%Y') if ot.fecha_inicio_programada else None,
            'fecha_inicio_real': ot.fecha_inicio_real.strftime('%d/%m/%Y') if ot.fecha_inicio_real else None, 
            'fecha_termino_programada': ot.fecha_termino_programada.strftime('%d/%m/%Y') if ot.fecha_termino_programada else None,
            'fecha_termino_real': ot.fecha_termino_real.strftime('%d/%m/%Y') if ot.fecha_termino_real else None,   
            'comentario':ot.comentario,
            'ot_principal': ot.ot_principal,
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
            'id_embarcacion_id': ot.id_embarcacion_id,
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
            'fecha_inicio_programado': ot.fecha_inicio_programada.isoformat() if ot.fecha_inicio_programada else None,
            'fecha_inicio_real': ot.fecha_inicio_real.strftime('%d/%m/%Y') if ot.fecha_inicio_real else None, 
            'fecha_termino_programado': ot.fecha_termino_programada.isoformat() if ot.fecha_termino_programada else None,
            'fecha_termino_real': ot.fecha_termino_real.strftime('%d/%m/%Y') if ot.fecha_termino_real else None,   
            'comentario':ot.comentario,
            'ot_principal': ot.ot_principal,
            'num_reprogramacion': ot.num_reprogramacion,
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
        # Filtra solo OTs que pueden ser principales (excluye las que ya son reprogramaciones)
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

        # Eliminación lógica - cambiar estatus a 0
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
        
        # Si el estatus actual es -1, cambiarlo a 1 (activo)
        # if ot.estatus == -1:
        #     ot.estatus = 1
        
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
        
        # Actualizar campos básicos
        ot.orden_trabajo = request.POST.get('orden_trabajo', ot.orden_trabajo)
        ot.responsable_cliente = request.POST.get('responsable_cliente', ot.responsable_cliente)
        ot.ot_principal = request.POST.get('ot_principal',ot.ot_principal)
        ot.oficio_ot = request.POST.get('oficio_ot', ot.oficio_ot)
        ot.id_embarcacion_id = request.POST.get('id_embarcacion', ot.id_embarcacion_id)
        ot.id_tipo_id = request.POST.get('id_tipo', ot.id_tipo_id)
        ot.comentario = request.POST.get('comentario_general', ot.comentario)
        
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
        
