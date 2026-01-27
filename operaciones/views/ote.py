from datetime import timedelta, date, datetime
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from ..models import OTE, OTDetalle, PasoOt, ImportacionAnexo, PartidaAnexoImportada, UnidadMedida, ConceptoMaestro
from ..registro_actividad import registrar_actividad
from operaciones.models.catalogos_models import Sitio, Estatus, ResponsableProyecto, Tipo
from django.db.models import Case, When, Value, CharField,Q, ExpressionWrapper, Count,F, FloatField, IntegerField
from django.db.models.functions import *
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from decimal import Decimal
from .produccion import recalcular_excedentes_ot_completa
import pandas as pd
import os
import io
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
    
    filtro_buscar = request.GET.get('filtro', '')
    
    order_column_index = request.GET.get('order[0][column]', '1')
    order_direction = request.GET.get('order[0][dir]', 'asc')

    column_mapping = {
        '0': None,                    
        '1': 'id',                    
        '2': 'orden_trabajo',         
        '3': 'oficio_ot',             
        '4': 'fecha_inicio_real',     
        '5': 'fecha_termino_real',    
        '6': 'id',                    
        '7': 'id',                    
        '8': 'id',                    
        '9': 'id_estatus_ot__descripcion',  
        '10': None                    
    }   

    tipo_id = request.GET.get('tipo', '4') 
    ot_principal_id = request.GET.get('ot_principal', None)
    estatus_id = request.GET.get('estatus', '')
    responsable_proyecto_id = request.GET.get('responsable_proyecto', '')
    cliente_id = request.GET.get('id_cliente', '')
    anio = request.GET.get('anio', '')
    id_sitio = request.GET.get('sitio', '')
    filters = {'estatus__in': [-1, 1]}
    
    if tipo_id:
        filters['id_tipo_id'] = tipo_id
        
    if ot_principal_id:
        filters['ot_principal'] = ot_principal_id
    
    if estatus_id:
        filters['id_estatus_ot_id'] = estatus_id
    
    if responsable_proyecto_id:
        filters['id_responsable_proyecto_id'] = responsable_proyecto_id
    
    if cliente_id:
        filters['id_cliente_id'] = cliente_id

    if id_sitio:
        sitio_q = Q(
            Q(id_embarcacion=id_sitio) |
            Q(id_plataforma=id_sitio) |
            Q(id_intercom=id_sitio) |
            Q(id_patio=id_sitio)
        )
        ots = OTE.objects.filter(**filters).filter(sitio_q)

    else:
        ots = OTE.objects.filter(**filters)

    ots = ots.prefetch_related('detalles').select_related(
        'id_tipo', 'id_pte_header', 'id_estatus_ot'
    ).annotate(
        estado_texto=Case(
            When(estatus=1, then=Value('Activo')),
            When(estatus=0, then=Value('Inactivo')),
            When(estatus=-1, then=Value('Por definir')),
            default=Value('Desconocido'),
            output_field=CharField()
        ),
        estatus_ot_texto=F('id_estatus_ot__descripcion'),
    )

    if anio:
        ots_con_anio_en_oficio = ots.filter(oficio_ot__regex=r'.*-(\d{4})$')
        ots_sin_anio_en_oficio = ots.exclude(oficio_ot__regex=r'.*-(\d{4})$')
        
        ots_con_anio = ots_con_anio_en_oficio.filter(
            oficio_ot__endswith=f"-{anio}"
        )
        
        ots_sin_anio = ots_sin_anio_en_oficio.filter(
            fecha_inicio_programado__year=anio
        )
        
        ots = ots_con_anio | ots_sin_anio

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
    
    field_name = column_mapping.get(order_column_index)
    
    if field_name is not None:
        if order_direction == 'desc':
            order_by_field = f'-{field_name}'
        else:
            order_by_field = field_name
        
        ots = ots.order_by(order_by_field)
    else:
        ots = ots.order_by('-id')

    total_records = ots.count()
    
    if length == -1:
        ots = ots[start:]
    else:
        ots = ots[start:start + length]
    
    data = []
    today = date.today()

    for ot in ots:
        detalles = ot.detalles.all()
        total_pasos = detalles.count()
        pasos_completados = detalles.filter(estatus_paso_id__in=[3]).count()
        
        progreso_pasos = 0
        if total_pasos > 0:
            progreso_pasos = int((pasos_completados / total_pasos) * 100)
        
        progreso_tiempo = 0
        dias_restantes = 0
        dias_transcurridos = 0
        plazo_total = 0
        
        if ot.fecha_inicio_programado and ot.fecha_termino_programado:
            fecha_inicio = ot.fecha_inicio_programado
            fecha_termino = ot.fecha_termino_programado
            
            if fecha_inicio and fecha_termino:
                plazo_total = (fecha_termino - fecha_inicio + timedelta(days=1)).days
                if plazo_total > 0:
                    if today < fecha_inicio:
                        progreso_tiempo = 0
                        dias_restantes = plazo_total
                    elif today > fecha_termino:
                        progreso_tiempo = 100
                        dias_restantes = 0
                        dias_transcurridos = plazo_total
                    else:
                        dias_transcurridos = (today - fecha_inicio).days
                        progreso_tiempo = int((dias_transcurridos / plazo_total) * 100)
                        dias_restantes = max(0, plazo_total - dias_transcurridos)
        
        progreso_tiempo_real = 0
        dias_restantes_real = 0
        dias_transcurridos_real = 0
        plazo_total_real = 0
        
        if ot.fecha_inicio_real and ot.fecha_termino_programado:
            fecha_inicio = ot.fecha_inicio_real
            fecha_termino = ot.fecha_termino_programado
            
            if fecha_inicio and fecha_termino:
                plazo_total_real = (fecha_termino - fecha_inicio + timedelta(days=1)).days
                if plazo_total_real > 0:
                    if today < fecha_inicio:
                        progreso_tiempo_real = 0
                        dias_restantes_real = plazo_total_real
                    elif today > fecha_termino:
                        progreso_tiempo_real = 100
                        dias_restantes_real = 0
                        dias_transcurridos_real = plazo_total_real
                    else:
                        dias_transcurridos_real = (today - fecha_inicio).days
                        progreso_tiempo_real = int((dias_transcurridos_real / plazo_total_real) * 100)
                        dias_restantes_real = max(0, plazo_total_real - dias_transcurridos_real)
        
        progreso_final = int((progreso_tiempo * 0.7) + (progreso_pasos * 0.3))
        progreso_final_real = int((progreso_tiempo_real * 0.7) + (progreso_pasos * 0.3))
        
        if ot.estatus == -1:
            estatus_display = 'Por definir'
            estatus_ot_texto = 'POR DEFINIR'
        else:
            estatus_display = ot.estatus_ot_texto or 'ASIGNADA'
            estatus_ot_texto = ot.estatus_ot_texto or 'ASIGNADA'
        
        data.append({
            'id': ot.id,
            'id_tipo_id': ot.id_tipo_id,
            'id_frente': ot.id_frente_id,
            'id_embarcacion': ot.id_embarcacion,
            'id_plataforma': ot.id_plataforma,
            'id_intercom': ot.id_intercom,
            'id_patio': ot.id_patio,
            'descripcion_tipo': ot.id_tipo.descripcion,
            'estatus': estatus_display,
            'estatus_numero': ot.estatus,
            'estatus_ot_id': ot.id_estatus_ot_id,
            'estatus_ot_texto': estatus_ot_texto,
            'responsable_proyecto': ot.id_responsable_proyecto_id if ot.id_responsable_proyecto_id else '',
            'responsable_cliente': ot.responsable_cliente,
            'id_pte_id': ot.id_pte_header_id,
            'pte_padre': ot.id_pte_header.oficio_pte if ot.id_pte_header else '',
            'oficio_ot': ot.oficio_ot,
            'orden_trabajo': ot.orden_trabajo,
            'descripcion_trabajo': ot.descripcion_trabajo,
            'fecha_inicio_programada': ot.fecha_inicio_programado.strftime('%d/%m/%Y') if ot.fecha_inicio_programado else None,
            'fecha_inicio_real': ot.fecha_inicio_real.strftime('%d/%m/%Y') if ot.fecha_inicio_real else None, 
            'fecha_termino_programada': ot.fecha_termino_programado.strftime('%d/%m/%Y') if ot.fecha_termino_programado else None,
            'fecha_termino_real': ot.fecha_termino_real.strftime('%d/%m/%Y') if ot.fecha_termino_real else None,   
            'comentario': ot.comentario,
            'ot_principal': ot.ot_principal,
            'plazo_dias': ot.plazo_dias,
            'num_reprogramacion': ot.num_reprogramacion,
            
            'total_pasos': total_pasos,
            'pasos_completados': pasos_completados,
            'progreso_pasos': progreso_pasos,
            'progreso_tiempo': progreso_tiempo,
            'progreso_final': progreso_final,
            'dias_restantes': dias_restantes,
            'dias_transcurridos': dias_transcurridos,
            'plazo_total': plazo_total,

            'progreso_tiempo_real': progreso_tiempo_real,
            'progreso_final_real': progreso_final_real,
            'dias_restantes_real': dias_restantes_real,
            'dias_transcurridos_real': dias_transcurridos_real,
            'plazo_total_real': plazo_total_real,

            'tiene_reprogramaciones': ot.tiene_reprogramaciones,
            'count_reprogramaciones': ot.count_reprogramaciones,

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
            'id_frente': ot.id_frente_id,
            'id_embarcacion': ot.id_embarcacion,
            'id_plataforma': ot.id_plataforma,
            'id_intercom': ot.id_intercom,
            'id_patio': ot.id_patio,
            'descripcion_tipo':ot.id_tipo.descripcion,
            'estatus_ot':ot.id_estatus_ot_id,
            'responsable_proyecto': ot.id_responsable_proyecto_id if ot.id_responsable_proyecto_id else '',
            'responsable_cliente':ot.responsable_cliente,
            'id_pte_id': ot.id_pte_header_id if ot.id_pte_header_id else '',
            'pte_padre': ot.id_pte_header.oficio_pte if ot.id_pte_header else '',
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
        ).values('id', 'orden_trabajo', 'descripcion_trabajo', 'oficio_ot').order_by('-id')
        
        # if ot_id:
        #     ots = ots.exclude(id=ot_id)
        
        data = list(ots)
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)

@require_http_methods(["POST"])
@login_required
@registrar_actividad
def eliminar_ot(request):
    """Eliminación lógica de OT"""
    try:
        ot_id = request.POST.get('id')

        if not ot_id:
            return JsonResponse({
                'tipo_aviso': 'error',
                'detalles': 'ID de la OT no proporcionado',
                'exito': False
            })

        ot = OTE.objects.get(id=ot_id)
        ot.estatus = 0 
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
@registrar_actividad
def cambiar_estatus_ot(request):
    """Cambiar estatus de OT"""
    try:
        ot_id = request.POST.get('ot_id')
        nuevo_estatus_id = request.POST.get('nuevo_estatus_id')
        comentario = request.POST.get('comentario', '')
        fecha_entrega = request.POST.get('fecha_entrega', None)
        if not ot_id or not nuevo_estatus_id:
            return JsonResponse({
                'exito': False,
                'detalles': 'Datos incompletos'
            })
        
        ot = OTE.objects.get(id=ot_id)

        estatus_anterior = ot.id_estatus_ot_id

        ot.id_estatus_ot_id = nuevo_estatus_id
        ot.comentario = comentario

        if int(nuevo_estatus_id) == 10 and int(estatus_anterior) != 10:
            if fecha_entrega:
                ot.fecha_termino_real = fecha_entrega
            else:
                ot.fecha_termino_real = datetime.now()
        elif int(nuevo_estatus_id) != 10 and int(estatus_anterior) == 10:
            ot.fecha_termino_real = None
        
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
def crear_ot(request):
    """Crear nueva OT"""
    try:
        orden_trabajo = request.POST.get('orden_trabajo')
        if not orden_trabajo:
            return JsonResponse({
                'exito': False, 
                'tipo_aviso': 'error', 
                'detalles': 'El Folio de la OT es obligatorio'
            })

        ot = OTE()
        ot.orden_trabajo = orden_trabajo
        ot.oficio_ot = request.POST.get('oficio_ot')
        ot.id_tipo_id = request.POST.get('id_tipo')
        ot.descripcion_trabajo = request.POST.get('descripcion_trabajo')
        ot.comentario = request.POST.get('comentario_general')
        ot.responsable_cliente = request.POST.get('responsable_cliente')
        ot.plazo_dias = request.POST.get('plazo_dias') or 0

        ot.id_cliente_id = request.POST.get('id_cliente') or None
        ot.id_frente_id = request.POST.get('id_frente') or None
        ot.id_responsable_proyecto_id = request.POST.get('responsable_proyecto') or None
        
        ot.id_embarcacion = request.POST.get('id_embarcacion') or None
        ot.id_plataforma = request.POST.get('id_plataforma') or None
        ot.id_intercom = request.POST.get('id_intercom') or None
        ot.id_patio = request.POST.get('id_patio') or None

        ot.monto_mxn = request.POST.get('monto_mxn') or 0
        ot.monto_usd = request.POST.get('monto_usd') or 0

        if request.POST.get('fecha_inicio_programado'):
            ot.fecha_inicio_programado = request.POST['fecha_inicio_programado']
            
        if request.POST.get('fecha_termino_programado'):
            ot.fecha_termino_programado = request.POST['fecha_termino_programado']
            
        if request.POST.get('fecha_inicio_real'):
            ot.fecha_inicio_real = request.POST['fecha_inicio_real']
            
        if request.POST.get('fecha_termino_real'):
            ot.fecha_termino_real = request.POST['fecha_termino_real']

        if str(ot.id_tipo_id) == '5':
            ot_principal_id = request.POST.get('ot_principal')
            num_reprogramacion = request.POST.get('num_reprogramacion')

            if not ot_principal_id:
                return JsonResponse({
                    'exito': False, 
                    'tipo_aviso': 'advertencia', 
                    'detalles': 'Para una reprogramación, debe seleccionar la OT Inicial.'
                })
            
            ot.ot_principal = ot_principal_id
            ot.num_reprogramacion = num_reprogramacion
        else:
            ot.ot_principal = None
            ot.num_reprogramacion = None

        ot.estatus = 1 
        ot.id_estatus_ot_id = 5
        ot.id_cliente_id = 1
        ot.save()

        if ot.id_tipo_id == 5:
            tipo_paso_busqueda = 5 if ot.id_cliente_id == 1 else 18 if ot.id_cliente_id in [2, 3, 4] else 5
        else:
            tipo_paso_busqueda = 5

        pasos_a_crear = PasoOt.objects.filter(tipo=tipo_paso_busqueda, activo=True).order_by('id')

        if pasos_a_crear:
            detalles_a_crear = []
            for paso in pasos_a_crear:
                detalles_a_crear.append(OTDetalle(
                    id_ot_id=ot.id,
                    estatus_paso_id=1, 
                    id_paso_id=paso.id,
                    comentario=""
                ))
            
            OTDetalle.objects.bulk_create(detalles_a_crear)

        return JsonResponse({
            'exito': True,
            'tipo_aviso': 'exito',
            'detalles': 'OT creada correctamente',
            'id_nuevo': ot.id
        })

    except Exception as e:
        return JsonResponse({
            'exito': False,
            'tipo_aviso': 'error',
            'detalles': f'Error al crear OT: {str(e)}'
        })

@require_http_methods(["POST"])
@login_required
@registrar_actividad
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
        ot.id_frente_id = request.POST.get('id_frente')
        ot.id_embarcacion = request.POST.get('id_embarcacion')
        ot.id_plataforma = request.POST.get('id_plataforma')
        ot.id_intercom = request.POST.get('id_intercom')
        ot.id_patio = request.POST.get('id_patio')
        ot.plazo_dias = request.POST.get('plazo_dias')
        ot.id_responsable_proyecto_id = request.POST.get('responsable_proyecto', ot.id_responsable_proyecto_id)
        if request.POST.get('monto_mxn'):
            ot.monto_mxn = request.POST.get('monto_mxn')

        if request.POST.get('monto_usd'):
            ot.monto_usd = request.POST.get('monto_usd')
        
        if request.POST.get('fecha_inicio_programado'):
            ot.fecha_inicio_programado = request.POST['fecha_inicio_programado']
            
        if request.POST.get('fecha_termino_programado'):
            ot.fecha_termino_programado = request.POST['fecha_termino_programado']
    
        if request.POST.get('fecha_inicio_real'):
            ot.fecha_inicio_real = request.POST['fecha_inicio_real']
            
        if request.POST.get('fecha_termino_real'):
            ot.fecha_termino_real = request.POST['fecha_termino_real']

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
    
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    draw = int(request.GET.get('draw', 1))
    
    detalles = OTDetalle.objects.filter(
        id_ot_id=ot_id
    ).select_related('id_paso', 'id_ot', 'estatus_paso').annotate(
        estatus_texto=F('estatus_paso__descripcion')
    ).order_by('id_paso__id')
    
    total_records = detalles.count()
    
    if length != -1:
        detalles = detalles[start:start + length]
    
    data = []
    for detalle in detalles:        
        data.append({
            'id': detalle.id,
            'orden': detalle.id_paso.orden,
            'desc_paso': detalle.id_paso.descripcion,
            'tipo_paso': detalle.id_paso.tipo_id,
            'estatus_paso': detalle.estatus_paso_id,
            'estatus_texto': detalle.estatus_texto,
            'fecha_entrega': detalle.fecha_entrega.strftime('%d/%m/%Y') if detalle.fecha_entrega else None,
            'fecha_inicio': detalle.fecha_inicio.strftime('%d/%m/%Y') if detalle.fecha_inicio else None,
            'fecha_termino': detalle.fecha_termino.strftime('%d/%m/%Y') if detalle.fecha_termino else None,
            'comentario': detalle.comentario or '',
            'archivo': detalle.archivo,
            'oficio_ot': detalle.id_ot.orden_trabajo,
            'id_ot': detalle.id_ot.id,
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
        estatus_anterior = detalle.estatus_paso_id
        detalle.estatus_paso_id = int(nuevo_estatus)
        if comentario:
            detalle.comentario = comentario
        else:
            detalle.comentario = None
            
        if int(nuevo_estatus) == 3: 
            if fecha_entrega:
                detalle.fecha_entrega = fecha_entrega
            else:
                detalle.fecha_entrega = timezone.now()   
        
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
        tipo = request.POST.get('tipo')
        
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

@login_required(login_url='/accounts/login/')
def obtener_sitios(request):
    """Obtener todos los sitios activos"""
    try:
        sitios = Sitio.objects.filter(activo=1).values('id', 'descripcion').order_by('id')
        return JsonResponse(list(sitios), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
@login_required
def obtener_progreso_general_ot(request):
    """
    Obtener progreso general actualizado de una OT.
    """
    try:
        ot_id = request.GET.get('ot_id')
        
        if not ot_id:
            return JsonResponse({
                'exito': False,
                'detalles': 'ID de OT no proporcionado'
            })
        
        try:
            ot = OTE.objects.get(pk=ot_id) 
        except OTE.DoesNotExist:
            return JsonResponse({'exito': False, 'detalles': 'OT no encontrada'})

        detalles = ot.detalles.all() 
        total_pasos = detalles.count()
        pasos_completados = detalles.filter(estatus_paso=3).count() 
        
        progreso_pasos = 0
        if total_pasos > 0:
            progreso_pasos = int((pasos_completados / total_pasos) * 100)

        progreso_tiempo = 0
        dias_restantes = 0
        dias_transcurridos = 0
        plazo_total = 0
        today = date.today()

        if ot.fecha_inicio_programado and ot.fecha_termino_programado:
            fecha_inicio = ot.fecha_inicio_programado
            fecha_termino = ot.fecha_termino_programado
            
            plazo_total = (fecha_termino - fecha_inicio).days + 1
            
            if plazo_total > 0:
                if today < fecha_inicio:
                    progreso_tiempo = 0
                    dias_restantes = plazo_total
                    dias_transcurridos = 0
                elif today > fecha_termino:
                    progreso_tiempo = 100
                    dias_restantes = 0
                    dias_transcurridos = plazo_total
                else:
                    dias_transcurridos = (today - fecha_inicio).days
                    progreso_tiempo = int((dias_transcurridos / plazo_total) * 100)
                    dias_restantes = max(0, plazo_total - dias_transcurridos)

        progreso_tiempo_real = 0
        dias_restantes_real = 0
        dias_transcurridos_real = 0
        plazo_total_real = 0

        if ot.fecha_inicio_real and ot.fecha_termino_programado:
            fecha_inicio_r = ot.fecha_inicio_real
            fecha_termino_r = ot.fecha_termino_programado

            plazo_total_real = (fecha_termino_r - fecha_inicio_r).days + 1
            
            if plazo_total_real > 0:
                if today < fecha_inicio_r:
                    progreso_tiempo_real = 0
                    dias_restantes_real = plazo_total_real
                    dias_transcurridos_real = 0
                elif today > fecha_termino_r:
                    progreso_tiempo_real = 100
                    dias_restantes_real = 0
                    dias_transcurridos_real = plazo_total_real
                else:
                    dias_transcurridos_real = (today - fecha_inicio_r).days
                    progreso_tiempo_real = int((dias_transcurridos_real / plazo_total_real) * 100)
                    dias_restantes_real = max(0, plazo_total_real - dias_transcurridos_real)

        progreso_final = int((progreso_tiempo * 0.7) + (progreso_pasos * 0.3))
        progreso_final = min(100, max(0, progreso_final))

        return JsonResponse({
            'exito': True,
            'ot_id': ot_id,

            'progreso': progreso_final,
            'progreso_pasos': progreso_pasos,
            'pasos_completados': pasos_completados,
            'total_pasos': total_pasos,
            
            'dias_transcurridos': dias_transcurridos,
            'plazo_total': plazo_total,
            'dias_transcurridos_real': dias_transcurridos_real,
            'plazo_total_real': plazo_total_real,
            
            'progreso_tiempo': progreso_tiempo,
            'dias_restantes': dias_restantes
        })
        
    except Exception as e:
        return JsonResponse({
            'exito': False,
            'detalles': f'Error al obtener progreso general: {str(e)}'
        })

def datatable_importaciones(request):
    """
    DATATABLE para las partidas importadas.
    """
    ot_id = request.GET.get('ot_id')
    
    try:
        importacion = ImportacionAnexo.objects.get(ot_id=ot_id, es_activo=True)
        queryset = PartidaAnexoImportada.objects.filter(
            importacion_anexo=importacion
        ).select_related('unidad_medida')
        
    except ImportacionAnexo.DoesNotExist:
        return JsonResponse({
            "draw": int(request.GET.get('draw', 1)),
            "recordsTotal": 0,
            "recordsFiltered": 0,
            "data": []
        })

    search_value = request.GET.get('search[value]', '')
    if search_value:
        queryset = queryset.filter(
            Q(id_partida__icontains=search_value) |
            Q(descripcion_concepto__icontains=search_value)
        )

    columns_mapping = {
        0: 'id_partida',
        1: 'descripcion_concepto',
        2: 'unidad_medida__clave',
        3: 'volumen_proyectado',    
        4: 'precio_unitario_mn',    
        5: 'precio_unitario_usd'    
    }
    
    order_column_index = int(request.GET.get('order[0][column]', 0))
    order_dir = request.GET.get('order[0][dir]', 'asc')
    order_column = columns_mapping.get(order_column_index, 'orden_fila')
    
    if order_dir == 'desc':
        order_column = f'-{order_column}'
        
    queryset = queryset.order_by(order_column)

    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 25))
    total_filtered = queryset.count()
    data_page = queryset[start:start + length]
    TIPO_CAMBIO = Decimal('20.5') 
    data = []
    for row in data_page:
        importe_visual = row.volumen_proyectado * (row.precio_unitario_mn + row.precio_unitario_usd * TIPO_CAMBIO)

        data.append({
            "codigo_concepto": row.id_partida,
            "descripcion": row.descripcion_concepto,
            "unidad": row.unidad_medida.clave if row.unidad_medida else "N/A",
            "cantidad": row.volumen_proyectado,
            "precio_unitario_mn": row.precio_unitario_mn,
            "precio_unitario_usd": row.precio_unitario_usd,
            "importe": importe_visual
        })

    return JsonResponse({
        "draw": int(request.GET.get('draw', 1)),
        "recordsTotal": importacion.total_registros,
        "recordsFiltered": total_filtered,
        "data": data
    })

@csrf_exempt
def importar_anexo_ot(request):
    """
    Procesa el archivo Excel (.xlsx o .xlsm).
    MODIFICADO: Ignora filas de 'Subtítulos' (sin unidad/precio) para evitar errores de 'nan'.
    """
    if request.method == "POST":
        ot_id = request.POST.get('ot_id')
        archivo = request.FILES.get('archivo')
        
        if not ot_id or not archivo:
            return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': 'Faltan datos (OT o Archivo)'})

        try:
            ot = OTE.objects.get(id=ot_id)
            try:
                xls = pd.ExcelFile(archivo, engine='openpyxl')
            except Exception as e:
                return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': f'Error técnico al abrir Excel: {str(e)}'})

            target_sheet = None
            header_row_index = -1
            sheet_names = sorted(xls.sheet_names, key=lambda x: 0 if 'ANEXO C' in x.upper() else 1)
            logs_busqueda = []

            for sheet in sheet_names:
                try:
                    df_temp = pd.read_excel(xls, sheet_name=sheet, header=None, nrows=100)
                    found = False
                    for idx, row in df_temp.iterrows():
                        row_str = [str(x).strip().upper() for x in row.values]
                        
                        match_anexo = 'ANEXO' in row_str
                        match_partida = 'PARTIDA' in row_str
                        match_concepto = 'CONCEPTO' in row_str
                        match_unidad = 'UNIDAD' in row_str
                        match_volumen = 'VOLUMEN PTE' in row_str
                        match_precio = ('P.U. M.N.' in row_str) or ('P.U.M.N.' in row_str)

                        if match_partida and match_concepto and match_unidad and match_volumen and match_precio:
                            header_row_index = idx
                            target_sheet = sheet
                            found = True
                            if not match_anexo:
                                logs_busqueda.append(f"[{sheet}]: Se encontraron cabeceras pero falta la columna 'ANEXO'.")
                                found = False 
                            break 
                    
                    if found: break 
                    else: logs_busqueda.append(f"[{sheet}]: Sin cabeceras completas.")
                        
                except Exception as ex_sheet:
                    logs_busqueda.append(f"[{sheet}]: Error {str(ex_sheet)}")
                    continue

            if target_sheet is None:
                msg_error = f"No se encontró tabla válida con columna 'ANEXO', PARTIDA, CONCEPTO, etc. Revisado: {', '.join(logs_busqueda)}"
                return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': msg_error})

            df = pd.read_excel(xls, sheet_name=target_sheet, header=header_row_index)
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            cols_req = ['ANEXO', 'PARTIDA', 'CONCEPTO', 'UNIDAD', 'VOLUMEN PTE', 'P.U. M.N.', 'P.U. USD']
            missing_cols = [col for col in cols_req if col not in df.columns]
            
            if missing_cols:
                if 'ANEXO' in missing_cols:
                    return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': f'Falta la columna obligatoria: ANEXO'})

            def clean_str(val):
                if pd.isna(val) or val is None:
                    return ""
                s = str(val).upper()
                s = s.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                res = " ".join(s.split())
                if res == 'NAN' or res == 'NONE': return ""
                return res

            def limpiar_moneda(valor):
                if pd.isna(valor): return 0.0
                s = str(valor).strip().replace('$', '').replace(',', '').replace(' ', '')
                if s in ['-', '', 'nan', 'NAN']: return 0.0
                try: return float(s)
                except ValueError: return 0.0

            unidades_lookup = {}
            for u in UnidadMedida.objects.all():
                clave_norm = clean_str(u.clave)          
                desc_norm = clean_str(u.descripcion)     
                unidades_lookup[clave_norm] = u.id
                unidades_lookup[desc_norm] = u.id

            conceptos_db = ConceptoMaestro.objects.filter(activo=True).select_related('unidad_medida')
            catalogo_map = {}          
            conceptos_por_codigo = {}  
            conceptos_set = set()      
            
            for concept in conceptos_db:
                val_partida = concept.partida_ordinaria if concept.partida_ordinaria else concept.partida_extraordinaria
                clave_p = clean_str(val_partida)
                clave_c = clean_str(concept.descripcion)
                clave_u_id = concept.unidad_medida.id
                
                key = (clave_p, clave_c, clave_u_id)
                catalogo_map[key] = concept
                conceptos_por_codigo[clave_p] = concept
                conceptos_set.add(clave_c)

            errores_validacion = []
            partidas_validas = []

            for index, row in df.iterrows():
                raw_anexo = str(row.get('ANEXO', ''))
                raw_codigo = str(row['PARTIDA'])
                raw_concepto = str(row['CONCEPTO'])
                raw_unidad = str(row['UNIDAD'])
                
                norm_anexo = clean_str(raw_anexo)
                if not norm_anexo: norm_anexo = 'S/A'
                
                norm_codigo = clean_str(raw_codigo) 
                norm_concepto = clean_str(raw_concepto)
                norm_unidad_txt = clean_str(raw_unidad)

                if not norm_codigo or not norm_concepto:
                    continue

                if not norm_unidad_txt:
                    continue 

                p_mn_check = limpiar_moneda(row.get('P.U. M.N.'))
                vol_check = limpiar_moneda(row.get('VOLUMEN PTE'))
                
                unidad_id_resuelto = unidades_lookup.get(norm_unidad_txt)

                if not unidad_id_resuelto:
                    fila_error = row.copy()
                    fila_error['OBSERVACIONES_SISTEMA'] = f"Unidad '{raw_unidad}' no existe en el sistema."
                    errores_validacion.append(fila_error)
                    continue

                key_busqueda = (norm_codigo, norm_concepto, unidad_id_resuelto)
                producto_encontrado = catalogo_map.get(key_busqueda)

                if not producto_encontrado:
                    fila_error = row.copy()
                    razon = ""
                    prod_candidato = conceptos_por_codigo.get(norm_codigo)
                    
                    if prod_candidato:
                        errores_encontrados = []
                        db_desc = clean_str(prod_candidato.descripcion)
                        if db_desc != norm_concepto:
                            errores_encontrados.append(f"DESCRIPCIÓN DIFERENTE.")
                        if prod_candidato.unidad_medida.id != unidad_id_resuelto:
                            db_unit = prod_candidato.unidad_medida.clave
                            errores_encontrados.append(f"UNIDAD DIFERENTE. Excel: '{raw_unidad}' vs Catálogo: '{db_unit}'")
                        if not errores_encontrados:
                            errores_encontrados.append("Posible duplicidad en catálogo.")
                        razon = " | ".join(errores_encontrados)
                    else:
                        if norm_concepto in conceptos_set:
                            razon = f"CÓDIGO INCORRECTO. Partida '{norm_codigo}' no existe."
                        else:
                            razon = f"NO ENCONTRADO en catálogo."

                    fila_error['OBSERVACIONES_SISTEMA'] = razon
                    errores_validacion.append(fila_error)
                else:
                    try:
                        partidas_validas.append({
                            'producto': producto_encontrado,
                            'volumen': vol_check,
                            'pu_mn': p_mn_check, 
                            'pu_usd': limpiar_moneda(row.get('P.U. USD')),
                            'orden': index + 1,
                            'codigo': norm_codigo,
                            'concepto': norm_concepto,
                            'unidad_obj': producto_encontrado.unidad_medida,
                            'anexo_row': norm_anexo
                        })
                    except Exception as e:
                        fila_error = row.copy()
                        fila_error['OBSERVACIONES_SISTEMA'] = f"Error numérico: {str(e)}"
                        errores_validacion.append(fila_error)

            if errores_validacion:
                df_errores = pd.DataFrame(errores_validacion)
                cols_limpias = [c for c in df_errores.columns if "UNNAMED" not in str(c).upper()]
                df_errores = df_errores[cols_limpias]
                
                cols_ordenadas = ['OBSERVACIONES_SISTEMA'] + [c for c in cols_limpias if c != 'OBSERVACIONES_SISTEMA']
                cols_finales = [c for c in cols_ordenadas if c in df_errores.columns]
                df_errores = df_errores[cols_finales]
                
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df_errores.to_excel(writer, index=False, sheet_name='Errores Importacion')
                    worksheet = writer.sheets['Errores Importacion']
                    if 'A' in worksheet.column_dimensions:
                        worksheet.column_dimensions['A'].width = 80 
                    for column_cells in worksheet.columns:
                        if column_cells[0].column_letter != 'A':
                            length = max(len(str(cell.value)) for cell in column_cells)
                            worksheet.column_dimensions[column_cells[0].column_letter].width = min(length + 2, 30)

                output.seek(0)
                response = HttpResponse(
                    output,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                folio_limpio = str(ot.orden_trabajo).replace('/', '-').replace('\\', '-').strip()
                nombre_archivo = f"Errores_Importacion_{folio_limpio}.xlsx"
                response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
                response['Access-Control-Expose-Headers'] = 'Content-Disposition'
                response['X-Validation-Error'] = 'True' 
                return response

            if not partidas_validas:
                return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': 'El archivo no contenía partidas válidas.'})

            with transaction.atomic():
                ImportacionAnexo.objects.filter(ot=ot, es_activo=True).update(es_activo=False)
                
                nueva_importacion = ImportacionAnexo.objects.create(
                    ot=ot,
                    archivo_excel=archivo,
                    usuario_carga=request.user if request.user.is_authenticated else None,
                    total_registros=len(partidas_validas),
                    es_activo=True
                )
                
                objs_crear = [
                    PartidaAnexoImportada(
                        importacion_anexo=nueva_importacion,
                        id_partida=p['codigo'],
                        descripcion_concepto=p['concepto'],
                        unidad_medida=p['unidad_obj'],
                        volumen_proyectado=p['volumen'],
                        precio_unitario_mn=p['pu_mn'],
                        precio_unitario_usd=p['pu_usd'],
                        orden_fila=p['orden'],
                        anexo=p['anexo_row'] 
                    ) for p in partidas_validas
                ]
                
                PartidaAnexoImportada.objects.bulk_create(objs_crear)
                
                exito_recalc, msg_recalc = recalcular_excedentes_ot_completa(ot_id)
                if not exito_recalc:
                    print(f"Advertencia: Falló recálculo de excedentes: {msg_recalc}")

            msg_final = f'Importación completada. {len(objs_crear)} partidas registradas. {msg_recalc}'
            if exito_recalc:
                msg_final += " Se han actualizado los semáforos de producción automáticamente."

            return JsonResponse({'exito': True, 'tipo_aviso':'exito', 'detalles': msg_final})

        except Exception as e:
            return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': f'Error interno: {str(e)}'})

    return JsonResponse({'exito': False, 'tipo_aviso':'advertencia', 'detalles': 'Método no permitido'})
    

def dashboard_stacked_view(request):
    # -------------------------------------------------------------------------
    # 1. FILTROS (Tus reglas de negocio)
    # -------------------------------------------------------------------------
    filtro_pte_paso_valido = ~Q(pteheader__detalles__estatus_paso_id__in=[14])
    filtro_pte_con_archivo = Q(pteheader__detalles__archivo__isnull=False) & ~Q(pteheader__detalles__archivo='')

    filtro_ot_paso_valido = ~Q(ote__detalles__estatus_paso_id__in=[14])
    filtro_ot_con_archivo = Q(ote__detalles__archivo__isnull=False) & ~Q(ote__detalles__archivo='')

    # -------------------------------------------------------------------------
    # 2. CONSULTA
    # -------------------------------------------------------------------------
    data_queryset = ResponsableProyecto.objects.annotate(
        # === META PTE ===
        pte_meta=Count('pteheader__detalles', filter=filtro_pte_paso_valido, distinct=True),
        # === REAL PTE ===
        pte_real=Count('pteheader__detalles', filter=filtro_pte_paso_valido & filtro_pte_con_archivo, distinct=True),
        # === META OT ===
        ot_meta=Count('ote__detalles', filter=filtro_ot_paso_valido, distinct=True),
        # === REAL OT ===
        ot_real=Count('ote__detalles', filter=filtro_ot_paso_valido & filtro_ot_con_archivo, distinct=True)
    ).filter(
        Q(ot_meta__gt=0) | Q(pte_meta__gt=0)
    ).order_by('descripcion')

    # -------------------------------------------------------------------------
    # 3. PROCESAMIENTO
    # -------------------------------------------------------------------------
    axis_nombres = []
    
    # ¡OJO AQUÍ! Separamos las metas en dos listas para dibujar dos líneas
    data_meta_ot = []  
    data_meta_pte = [] 
    
    data_ot = []
    data_pte = []
    data_info = []

    for item in data_queryset:
        # Calculamos totales solo para el semáforo global (tooltip)
        total_meta = item.ot_meta + item.pte_meta
        total_real = item.ot_real + item.pte_real
        
        pct = (total_real / total_meta * 100) if total_meta > 0 else 0

        if pct < 40: color_status = '#e74c3c'
        elif pct < 80: color_status = '#f1c40f'
        else: color_status = '#2ecc71'

        axis_nombres.append(item.descripcion)
        
        # Guardamos datos separados
        data_meta_ot.append(item.ot_meta)
        data_meta_pte.append(item.pte_meta)
        data_ot.append(item.ot_real)
        data_pte.append(item.pte_real)
        
        data_info.append({
            'pct_txt': f"{pct:.1f}%",
            'color': color_status
        })

    return JsonResponse({
        'chart_nombres': axis_nombres,
        'chart_meta_ot': data_meta_ot,   # Nueva lista
        'chart_meta_pte': data_meta_pte, # Nueva lista
        'chart_ot': data_ot,
        'chart_pte': data_pte,
        'chart_info': data_info,
    })