from datetime import timedelta, date, datetime
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from ..models import OTE, OTDetalle, PasoOt, ImportacionAnexo, PartidaAnexoImportada, UnidadMedida
from ..registro_actividad import registrar_actividad
from operaciones.models.catalogos_models import Sitio, Estatus, ResponsableProyecto, Tipo
from django.db.models import Case, When, Value, CharField,Q, ExpressionWrapper, Count,F, FloatField, IntegerField
from django.db.models.functions import *
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from decimal import Decimal
import pandas as pd
import os

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
    
    order_column_index = request.GET.get('order[0][column]', '1')
    order_direction = request.GET.get('order[0][dir]', 'asc')

    # Mapeo de índices de DataTable a campos del modelo OTE
    column_mapping = {
        '0': None,                    # Columna 0: Botón de detalles/ampliar
        '1': 'id',                    # Columna 1: ID (oculta)
        '2': 'orden_trabajo',         # Columna 2: Folio OT
        '3': 'oficio_ot',             # Columna 3: Oficio OT  
        '4': 'fecha_inicio_real',     # Columna 4: Fecha de inicio
        '5': 'fecha_termino_real',    # Columna 5: Fecha término
        '6': 'id',                    # Columna 6: Progreso
        '7': 'id',                    # Columna 7: Progreso Tiempo
        '8': 'id',                    # Columna 8: Progreso Pasos
        '9': 'id_estatus_ot__descripcion',  # Columna 9: Estatus
        '10': None                    # Columna 10: Opciones
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
        # extraer el año
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
    
    # Solo ordenar si field_name no es None y no es una columna no ordenable
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
        # 1. Calcular progreso por pasos
        detalles = ot.detalles.all()
        total_pasos = detalles.count()
        pasos_completados = detalles.filter(estatus_paso_id__in=[3]).count()
        
        progreso_pasos = 0
        if total_pasos > 0:
            progreso_pasos = int((pasos_completados / total_pasos) * 100)
        
        # 2. Calcular progreso por tiempo
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
                        # No ha iniciado
                        progreso_tiempo = 0
                        dias_restantes = plazo_total
                    elif today > fecha_termino:
                        # Ya terminó
                        progreso_tiempo = 100
                        dias_restantes = 0
                        dias_transcurridos = plazo_total
                    else:
                        # En progreso
                        dias_transcurridos = (today - fecha_inicio).days
                        progreso_tiempo = int((dias_transcurridos / plazo_total) * 100)
                        dias_restantes = max(0, plazo_total - dias_transcurridos)
        
        #tiempo real
        # 2. Calcular progreso por tiempo
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
                        # No ha iniciado
                        progreso_tiempo_real = 0
                        dias_restantes_real = plazo_total_real
                    elif today > fecha_termino:
                        # Ya terminó
                        progreso_tiempo_real = 100
                        dias_restantes_real = 0
                        dias_transcurridos_real = plazo_total_real
                    else:
                        # En progreso
                        dias_transcurridos_real = (today - fecha_inicio).days
                        progreso_tiempo_real = int((dias_transcurridos_real / plazo_total_real) * 100)
                        dias_restantes_real = max(0, plazo_total_real - dias_transcurridos_real)
        


        # 3. Progreso combinado
        progreso_final = int((progreso_tiempo * 0.7) + (progreso_pasos * 0.3))
        progreso_final_real = int((progreso_tiempo_real * 0.7) + (progreso_pasos * 0.3))
        
        # 4. Estatus
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
            
            # Campos de progreso
            'total_pasos': total_pasos,
            'pasos_completados': pasos_completados,
            'progreso_pasos': progreso_pasos,
            'progreso_tiempo': progreso_tiempo,
            'progreso_final': progreso_final,
            'dias_restantes': dias_restantes,
            'dias_transcurridos': dias_transcurridos,
            'plazo_total': plazo_total,

            # Campos de progreso real
            'progreso_tiempo_real': progreso_tiempo_real,
            'progreso_final_real': progreso_final_real,
            'dias_restantes_real': dias_restantes_real,
            'dias_transcurridos_real': dias_transcurridos_real,
            'plazo_total_real': plazo_total_real,

            # Campos de reprogramaciones
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
        
        if ot_id:
            ots = ots.exclude(id=ot_id)
        
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

        # Guardar el estatus anterior para verificar cambios
        estatus_anterior = ot.id_estatus_ot_id

        # Actualizar el id_estatus_ot
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

        # Relaciones (Foreign Keys)
        ot.id_cliente_id = request.POST.get('id_cliente') or None
        ot.id_frente_id = request.POST.get('id_frente') or None
        ot.id_responsable_proyecto_id = request.POST.get('responsable_proyecto') or None
        
        # Ubicaciones
        ot.id_embarcacion = request.POST.get('id_embarcacion') or None
        ot.id_plataforma = request.POST.get('id_plataforma') or None
        ot.id_intercom = request.POST.get('id_intercom') or None
        ot.id_patio = request.POST.get('id_patio') or None

        # Montos (Limpieza básica por si vienen vacíos)
        ot.monto_mxn = request.POST.get('monto_mxn') or 0
        ot.monto_usd = request.POST.get('monto_usd') or 0

        # --- Fechas ---
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

        #crear pasos de ot dependiendo el tipo de ot y cliente
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
                    # No ha iniciado
                    progreso_tiempo = 0
                    dias_restantes = plazo_total
                    dias_transcurridos = 0
                elif today > fecha_termino:
                    # Ya terminó el plazo
                    progreso_tiempo = 100
                    dias_restantes = 0
                    dias_transcurridos = plazo_total
                else:
                    # En progreso
                    dias_transcurridos = (today - fecha_inicio).days
                    # Cálculo de porcentaje
                    progreso_tiempo = int((dias_transcurridos / plazo_total) * 100)
                    dias_restantes = max(0, plazo_total - dias_transcurridos)

        progreso_tiempo_real = 0
        dias_restantes_real = 0
        dias_transcurridos_real = 0
        plazo_total_real = 0

        if ot.fecha_inicio_real and ot.fecha_termino_programado:
            fecha_inicio_r = ot.fecha_inicio_real
            fecha_termino_r = ot.fecha_termino_programado # Se compara contra el término planeado habitualmente

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

        # Retornar respuesta
        return JsonResponse({
            'exito': True,
            'ot_id': ot_id,

            # Datos principales
            'progreso': progreso_final,
            'progreso_pasos': progreso_pasos,
            'pasos_completados': pasos_completados,
            'total_pasos': total_pasos,
            
            # Datos de tiempo (para los badges visuales)
            'dias_transcurridos': dias_transcurridos,
            'plazo_total': plazo_total,
            'dias_transcurridos_real': dias_transcurridos_real,
            'plazo_total_real': plazo_total_real,
            
            # Datos extra si los necesitas en el frontend
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
    """
    if request.method == "POST":
        ot_id = request.POST.get('ot_id')
        archivo = request.FILES.get('archivo')
        
        if not ot_id or not archivo:
            return JsonResponse({'exito': False, 'mensaje': 'Faltan datos (OT o Archivo)'})

        try:
            ot = OTE.objects.get(id=ot_id)
            try:
                xls = pd.ExcelFile(archivo, engine='openpyxl')
            except Exception as e:
                return JsonResponse({'exito': False, 'mensaje': f'Error técnico al abrir Excel: {str(e)}'})

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
                        match_partida = 'PARTIDA' in row_str
                        match_concepto = 'CONCEPTO' in row_str
                        match_unidad = 'UNIDAD' in row_str
                        match_volumen = 'VOLUMEN PTE' in row_str
                        match_precio_mn = 'P.U. M.N.' in row_str or 'P.U.M.N.' in row_str 
                        match_precio_usd = 'P.U. USD' in row_str

                        if match_partida and match_concepto and match_unidad and match_volumen and match_precio_mn and match_precio_usd:
                            header_row_index = idx
                            target_sheet = sheet
                            found = True
                            break 
                    if found:
                        break 
                    else:
                        logs_busqueda.append(f"[{sheet}]: Se escanearon filas pero no se hallaron cabeceras completas (PARTIDA+CONCEPTO+PRECIOS).")
                        
                except Exception as ex_sheet:
                    logs_busqueda.append(f"[{sheet}]: Error lectura ({str(ex_sheet)})")
                    continue

            if target_sheet is None:
                msg_error = f"No se encontró la tabla de presupuesto válida. Se requiere 'PARTIDA', 'CONCEPTO' y 'P.U. M.N.' en la misma fila. Revisado: {', '.join(logs_busqueda)}"
                return JsonResponse({'exito': False, 'mensaje': msg_error})

            df = pd.read_excel(xls, sheet_name=target_sheet, header=header_row_index)
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            cols_req = ['PARTIDA', 'CONCEPTO', 'UNIDAD', 'VOLUMEN PTE', 'P.U. M.N.', 'P.U. USD']
            
            missing_cols = [col for col in cols_req if col not in df.columns]
            if missing_cols:
                return JsonResponse({
                    'exito': False, 
                    'mensaje': f'En la hoja "{target_sheet}" (Fila {header_row_index+1}) faltan las columnas: {", ".join(missing_cols)}'
                })

            def limpiar_moneda(valor):
                if pd.isna(valor): return 0.0
                s = str(valor).strip().replace('$', '').replace(',', '').replace(' ', '')
                if s in ['-', '', 'nan', 'NAN']: return 0.0
                try:
                    return float(s)
                except ValueError:
                    return 0.0

            with transaction.atomic():
                ImportacionAnexo.objects.filter(ot=ot, es_activo=True).update(es_activo=False)
                
                nueva_importacion = ImportacionAnexo.objects.create(
                    ot=ot,
                    archivo_excel=archivo,
                    usuario_carga=request.user if request.user.is_authenticated else None,
                    total_registros=0,
                    es_activo=True
                )
                
                partidas_batch = []
                unidades_db = {u.clave.strip().upper(): u for u in UnidadMedida.objects.all()}
                unidad_default = UnidadMedida.objects.first()

                for index, row in df.iterrows():
                    codigo = str(row['PARTIDA']).strip()
                    concepto = str(row['CONCEPTO']).strip()
                    unidad_str = str(row['UNIDAD']).strip().upper()

                    if (not codigo or codigo.lower() == 'nan' or codigo.upper() == 'NONE' or
                        not concepto or concepto.lower() == 'nan' or 
                        not unidad_str or unidad_str.lower() == 'nan'): 
                        continue 

                    try:
                        volumen = limpiar_moneda(row.get('VOLUMEN PTE'))
                        pu_mn = limpiar_moneda(row.get('P.U. M.N.'))
                        pu_usd = limpiar_moneda(row.get('P.U. USD'))
                    except Exception:
                        continue 

                    unidad_obj = unidades_db.get(unidad_str, unidad_default)
                    
                    partidas_batch.append(PartidaAnexoImportada(
                        importacion_anexo=nueva_importacion,
                        id_partida=codigo,
                        descripcion_concepto=concepto,
                        unidad_medida=unidad_obj,
                        volumen_proyectado=volumen,
                        precio_unitario_mn=pu_mn,
                        precio_unitario_usd=pu_usd,
                        orden_fila=index + 1
                    ))

                if not partidas_batch:
                    return JsonResponse({'exito': False, 'mensaje': f'La hoja "{target_sheet}" se leyó pero no contenía datos válidos.'})

                PartidaAnexoImportada.objects.bulk_create(partidas_batch, batch_size=500)
                
                nueva_importacion.total_registros = len(partidas_batch)
                nueva_importacion.save()

            return JsonResponse({
                'exito': True, 
                'mensaje': f'Importación exitosa desde hoja "{target_sheet}". {len(partidas_batch)} partidas cargadas.',
            })

        except Exception as e:
            return JsonResponse({'exito': False, 'mensaje': f'Error interno: {str(e)}'})

    return JsonResponse({'exito': False, 'mensaje': 'Método no permitido'})
