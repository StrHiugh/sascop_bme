from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from ..models import Producto, OTE, ImportacionAnexo, PartidaAnexoImportada, Produccion, ReporteMensual, Sitio, ReporteDiario, Estatus
from django.http import JsonResponse
from itertools import chain
from django.db.models import Q, Case, F, When, IntegerField, Value, CharField, Sum
from django.db.models.functions import Coalesce
from django.db import transaction
from datetime import date
from decimal import Decimal
import calendar
import json

@login_required(login_url='/accounts/login/')
def lista_produccion(request):
    """Lista de producción"""
    producciones = Produccion.objects.all().order_by('-fecha_produccion')
    return render(request, 'operaciones/produccion/lista_produccion.html', {'producciones': producciones})

def obtener_sitios_con_ots_ejecutadas(request):
    """Obtener todos los sitios con ots activos y en ejecucion"""
    try:
        ots_activas = OTE.objects.filter(
            id_estatus_ot_id=8, 
            id_tipo_id=4,       
            estatus=1           
        )

        ots_con_sitio_calculado = ots_activas.annotate(
            sitio_real_id=Case(
                When(id_frente_id__in=[1, 3], then=F('id_patio')),
                When(id_frente_id__in=[2, 6], then=F('id_embarcacion')),
                When(id_frente_id__in=[4, 7], then=F('id_plataforma')),
                When(id_frente_id=5, then=F('id_intercom')),
                default=None,
                output_field=IntegerField()
            )
        )

        ids_sitios = ots_con_sitio_calculado.filter(
            sitio_real_id__isnull=False
        ).values_list('sitio_real_id', flat=True).distinct()

        sitios = Sitio.objects.filter(
            id__in=ids_sitios,
            activo=True
        ).values('id', 'descripcion').order_by('id')
        
        return JsonResponse(list(sitios), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def ots_por_sitio_grid(request):
    """
    Lista las OTs activas en un sitio y CARGA sus reportes diarios (Asistencia)
    para llenar el grid.
    """
    id_sitio = request.GET.get('id_sitio')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    
    if not id_sitio or not mes or not anio:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})

    try:
        mes, anio = int(mes), int(anio)
    except ValueError:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})

    ultimo_dia = calendar.monthrange(anio, mes)[1]
    fecha_inicio_mes = date(anio, mes, 1)
    fecha_fin_mes = date(anio, mes, ultimo_dia)

    query = Q(id_embarcacion=id_sitio) | Q(id_plataforma=id_sitio) | \
            Q(id_patio=id_sitio) | Q(id_intercom=id_sitio)

    queryset = OTE.objects.filter(
        query,
        id_estatus_ot_id=8,     
        id_tipo_id=4,            
        estatus=1,
        importaciones_anexo__es_activo=True
    ).distinct()

    queryset = queryset.annotate(
        inicio_vigencia=Coalesce('fecha_inicio_real', 'fecha_inicio_programado'),
        fin_vigencia=Coalesce('fecha_termino_real', 'fecha_termino_programado')
    ).filter(
        inicio_vigencia__lte=fecha_fin_mes,
        fin_vigencia__gte=fecha_inicio_mes
    )

    ids_ots = list(queryset.values_list('id', flat=True))
    
    reportes_data = ReporteDiario.objects.filter(
        id_reporte_mensual__id_ot_id__in=ids_ots,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio
    ).values(
        'id_reporte_mensual__id_ot_id', # ID de la OT
        'fecha__day',                   # Día del mes
        'id_estatus__descripcion'            # descripcion del estatus (OK, FFP, S)
    )

    # Mapeamos para acceso rápido: {(id_ot, dia): 'OK'}
    mapa_asistencia = {}
    for r in reportes_data:
        key = (r['id_reporte_mensual__id_ot_id'], r['fecha__day'])
        # Asumimos que el descripcion del estatus es lo que muestra el grid (OK, FFP, S)
        # Si en tu BD se llaman diferente, habría que ajustar aquí o usar un diccionario de conversión.
        mapa_asistencia[key] = r['id_estatus__descripcion']

    data_reportes = []
    for ot in queryset:
        fila = {
            'id_ot': ot.id,
            'ot': ot.orden_trabajo,
            'desc': ot.descripcion_trabajo,
            'inicio_v': ot.inicio_vigencia.isoformat() if ot.inicio_vigencia else None,
            'fin_v': ot.fin_vigencia.isoformat() if ot.fin_vigencia else None,
        }

        # Llenamos columnas dia1...dia31
        for d in range(1, 32):
            val = mapa_asistencia.get((ot.id, d))
            fila[f'dia{d}'] = val if val else None

        data_reportes.append(fila)

    return JsonResponse({'reportes_diarios': data_reportes})

def guardar_reportes_diarios_masiva(request):
    """
    Guarda los reportes diarios
    
    """
    try:
        data = json.loads(request.body)
        filas = data.get('reportes', [])
        mes, anio = int(data.get('mes')), int(data.get('anio'))

        if not filas:
            return JsonResponse({'exito': True, 'mensaje': 'Sin datos para guardar'})

        estatus_qs = Estatus.objects.filter(nivel_afectacion=4)
        mapa_estatus = {e.descripcion: e for e in estatus_qs}

        with transaction.atomic():
            for fila in filas:
                id_ot = fila.get('id_ot')
                valores = fila.get('valores', [])
                
                reporte_mensual, _ = ReporteMensual.objects.get_or_create(
                    id_ot_id=id_ot,
                    mes=mes,
                    anio=anio,
                    defaults={'id_estatus_id': 1}
                )

                reportes_existentes = {
                    r.fecha.day: r 
                    for r in ReporteDiario.objects.filter(id_reporte_mensual=reporte_mensual)
                }
                
                a_crear, a_actualizar, ids_borrar = [], [], []

                for idx, val_texto in enumerate(valores):
                    dia = idx + 1
                    
                    try:
                        fecha_dia = date(anio, mes, dia)
                    except ValueError:
                        continue

                    reporte_obj = reportes_existentes.get(dia)
                    estatus_obj = mapa_estatus.get(val_texto)

                    if val_texto and estatus_obj:
                        if reporte_obj:
                            if reporte_obj.id_estatus != estatus_obj:
                                reporte_obj.id_estatus = estatus_obj
                                a_actualizar.append(reporte_obj)
                        else:
                            a_crear.append(ReporteDiario(
                                id_reporte_mensual=reporte_mensual,
                                fecha=fecha_dia,
                                id_estatus=estatus_obj,
                                bloqueado=False
                            ))
                    elif reporte_obj:
                        ids_borrar.append(reporte_obj.id)

                if a_crear: ReporteDiario.objects.bulk_create(a_crear)
                if a_actualizar: ReporteDiario.objects.bulk_update(a_actualizar, ['id_estatus'])

        return JsonResponse({'exito': True, 'mensaje': 'Reportes diarios guardados correctamente.'})

    except Exception as e:
        return JsonResponse({'exito': False, 'mensaje': str(e)}, status=500)


def obtener_volumenes_consolidados(id_ot_actual, ids_partidas_codigos):
    """
    Calcula el volumen total autorizado sumando la OT inicial y todas sus reprogramaciones.
    """
    ot_actual = OTE.objects.get(id=id_ot_actual)
    id_principal = ot_actual.ot_principal if ot_actual.ot_principal else ot_actual.id
    
    familia_ots = OTE.objects.filter(Q(id=id_principal) | Q(ot_principal=id_principal)).values_list('id', flat=True)

    partidas_query = PartidaAnexoImportada.objects.filter(
        importacion_anexo__ot_id__in=familia_ots,
        importacion_anexo__es_activo=True,
        id_partida__in=ids_partidas_codigos
    ).values('id_partida').annotate(total_vol=Sum('volumen_proyectado'))
    partidas = {p['id_partida']: p['total_vol'] or 0 for p in partidas_query}
    return partidas

@login_required
def obtener_partidas_produccion(request):
    """
    Retorna el Universo de Partidas (Inicial + Reprogramaciones)
    """
    id_ot = request.GET.get('id_ot')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    tipo_tiempo = request.GET.get('tipo_tiempo', 'TE')

    if not id_ot or not mes or not anio:
        return JsonResponse([], safe=False)

    try:
        mes, anio = int(mes), int(anio)
    except ValueError:
        return JsonResponse([], safe=False)

    ot_actual = OTE.objects.get(id=id_ot)
    id_principal = ot_actual.ot_principal if ot_actual.ot_principal else id_ot
    
    familia_ots_ids = OTE.objects.filter(
        Q(id=id_principal) | Q(ot_principal=id_principal),
        estatus=1
    ).values_list('id', flat=True)

    todas_partidas = PartidaAnexoImportada.objects.filter(
        importacion_anexo__ot_id__in=familia_ots_ids,
        importacion_anexo__es_activo=True
    ).select_related('unidad_medida', 'importacion_anexo__ot').order_by('importacion_anexo__ot__id', 'orden_fila')

    if not todas_partidas:
        return JsonResponse([], safe=False)

    partidas_consolidadas = {} 
    codigos_activos = set()

    for p in todas_partidas:
        codigo = p.id_partida
        vol = float(p.volumen_proyectado or 0)

        if codigo in partidas_consolidadas:
            partidas_consolidadas[codigo]['vol_total_proyectado'] += vol
        else:
            partidas_consolidadas[codigo] = {
                'id_partida_imp': p.id,
                'codigo': codigo,
                'concepto': p.descripcion_concepto,
                'unidad': p.unidad_medida.clave if p.unidad_medida else 'N/A',
                'vol_total_proyectado': vol,
                'acumulado_mes': 0.0
            }
            codigos_activos.add(codigo)

    mapa_anexos = {}
    if codigos_activos:
        productos_data = Producto.objects.filter(
            id_partida__in=codigos_activos, 
            activo=True
        ).values('id_partida', 'anexo')
        
        for prod in productos_data:
            mapa_anexos[prod['id_partida']] = prod['anexo']

    resumen_produccion = Produccion.objects.filter(
        id_reporte_mensual__id_ot_id=id_ot,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio,
        tipo_tiempo=tipo_tiempo,
        id_partida_anexo__id_partida__in=codigos_activos
    ).values('id_partida_anexo__id_partida', 'fecha_produccion__day', 'es_excedente', 'volumen_produccion')

    produccion_dict = {}
    for item in resumen_produccion:
        key = (item['id_partida_anexo__id_partida'], item['fecha_produccion__day'])
        produccion_dict[key] = {
            'valor': float(item['volumen_produccion']),
            'es_excedente': item['es_excedente']
        }

    data_final = []
    for codigo, datos in partidas_consolidadas.items():
        datos['anexo'] = mapa_anexos.get(codigo, '')

        suma_mes = 0.0
        hay_excedente = False
        
        for d in range(1, 32):
            val = produccion_dict.get((codigo, d))
            if val:
                datos[f'dia{d}'] = val
                suma_mes += val['valor']
                if val['es_excedente']: hay_excedente = True
            else:
                datos[f'dia{d}'] = None
        
        datos['acumulado_mes'] = suma_mes
        datos['estatus_gpu'] = 'BLOQUEADO' if hay_excedente else 'AUTORIZADO'
        data_final.append(datos)

    return JsonResponse(data_final, safe=False)

@login_required
@require_http_methods(["POST"])
def guardar_produccion_masiva(request):
    """
    Guarda producción.
    """
    try:
        data = json.loads(request.body)
        id_ot = data.get('id_ot')
        mes, anio = int(data.get('mes')), int(data.get('anio'))
        filas = data.get('partidas', [])
        tipo_tiempo = data.get('tipo_tiempo', 'TE')

        if not filas:
            return JsonResponse({'exito': True, 'mensaje': 'Sin datos para guardar'})

        with transaction.atomic():
            reporte_mensual, _ = ReporteMensual.objects.get_or_create(
                id_ot_id=id_ot, mes=mes, anio=anio, defaults={'id_estatus_id': 1}
            )

            ot_actual = OTE.objects.get(id=id_ot)
            id_principal = ot_actual.ot_principal if ot_actual.ot_principal else id_ot
            familia_ots = OTE.objects.filter(Q(id=id_principal) | Q(ot_principal=id_principal)).values_list('id', flat=True)
            
            ids_partidas_form = [f.get('id_partida_imp') for f in filas]
            partidas_db = PartidaAnexoImportada.objects.in_bulk(ids_partidas_form)
            codigos_en_batch = [p.id_partida for p in partidas_db.values()]
            mapa_autorizado = obtener_volumenes_consolidados(id_ot, codigos_en_batch)

            mapa_produccion_actual = {
                (p.id_partida_anexo_id, p.fecha_produccion.day): p 
                for p in Produccion.objects.filter(id_reporte_mensual=reporte_mensual, tipo_tiempo=tipo_tiempo)
            }
            
            a_crear, a_actualizar = [], []

            for fila in filas:
                id_p = fila.get('id_partida_imp')
                partida = partidas_db.get(id_p)
                if not partida: continue

                codigo = partida.id_partida
                
                c_clean = codigo.strip()
                variantes = {codigo, c_clean, c_clean.rstrip('.'), c_clean + '.'}
                
                vol_autorizado = sum(
                    Decimal(str(mapa_autorizado.get(v, 0))) for v in variantes if v in mapa_autorizado
                )
                vol_autorizado = round(vol_autorizado, 4)

                ids_candidatos = PartidaAnexoImportada.objects.filter(
                    importacion_anexo__ot_id__in=familia_ots, 
                    id_partida__in=variantes
                ).values_list('id', flat=True)

                base_hist = Produccion.objects.filter(
                    id_partida_anexo_id__in=ids_candidatos
                ).exclude(
                    id_reporte_mensual=reporte_mensual
                ).aggregate(total=Sum('volumen_produccion'))['total'] or 0
                
                base_hist = Decimal(str(base_hist))

                base_otros = Produccion.objects.filter(
                    id_reporte_mensual=reporte_mensual,
                    id_partida_anexo=partida
                ).exclude(
                    tipo_tiempo=tipo_tiempo
                ).aggregate(total=Sum('volumen_produccion'))['total'] or 0
                
                base_otros = Decimal(str(base_otros))
                
                running_total = base_hist + base_otros

                for idx, vol in enumerate(fila.get('valores', [])):
                    dia = idx + 1
                    vol_input = Decimal(str(vol or 0))
                    
                    prod_obj = mapa_produccion_actual.get((id_p, dia))
                    vol_db = prod_obj.volumen_produccion if prod_obj else Decimal(0)

                    vol_para_calculo = vol_input if vol_input > 0 else vol_db
                    
                    running_total += vol_para_calculo
                    
                    es_excedente = round(running_total, 4) > vol_autorizado

                    if prod_obj:
                        if vol_input > 0:
                            if prod_obj.volumen_produccion != vol_input or prod_obj.es_excedente != es_excedente:
                                prod_obj.volumen_produccion = vol_input
                                prod_obj.es_excedente = es_excedente
                                a_actualizar.append(prod_obj)
                        else:
                            if prod_obj.es_excedente != es_excedente:
                                prod_obj.es_excedente = es_excedente
                                a_actualizar.append(prod_obj)

                    elif vol_input > 0:
                        a_crear.append(Produccion(
                            id_reporte_mensual=reporte_mensual,
                            id_partida_anexo=partida, 
                            fecha_produccion=date(anio, mes, dia),
                            volumen_produccion=vol_input,
                            tipo_tiempo=tipo_tiempo,
                            es_excedente=es_excedente,
                            id_estatus_cobro_id=1
                        ))

            if a_crear: Produccion.objects.bulk_create(a_crear)
            if a_actualizar: Produccion.objects.bulk_update(a_actualizar, ['volumen_produccion', 'es_excedente'])
        
        return JsonResponse({'exito': True, 'mensaje': 'Producción guardada correctamente.'})
    except Exception as e:
        return JsonResponse({'exito': False, 'mensaje': str(e)}, status=500)

def recalcular_excedentes_ot_completa(id_ot):
    """
    Recorre toda la producción histórica de la familia de esa OT y 
    actualiza los flags 'es_excedente' basándose en los nuevos topes consolidados.
    """
    try:
        ot_actual = OTE.objects.get(id=id_ot)
        id_principal = ot_actual.ot_principal if ot_actual.ot_principal else ot_actual.id

        familia_ots = OTE.objects.filter(Q(id=id_principal) | Q(ot_principal=id_principal)).values_list('id', flat=True)
        
        codigos_con_produccion = Produccion.objects.filter(
            id_reporte_mensual__id_ot_id__in=familia_ots
        ).values_list('id_partida_anexo__id_partida', flat=True).distinct()
        
        mapa_topes = obtener_volumenes_consolidados(id_ot, list(codigos_con_produccion))
        
        prod_a_actualizar = []
        
        for codigo in codigos_con_produccion:
            codigo_limpio = codigo.strip() if codigo else codigo
            tope = Decimal(str(mapa_topes.get(codigo_limpio, 0)))
            running_total = Decimal(0)
            
            historial = Produccion.objects.filter(
                id_reporte_mensual__id_ot_id__in=familia_ots,
                id_partida_anexo__id_partida=codigo
            ).order_by('fecha_produccion', 'id')
            
            for prod in historial:
                vol = prod.volumen_produccion
                running_total += vol
                
                nuevo_estado_excedente = running_total > tope

                if prod.es_excedente != nuevo_estado_excedente:
                    prod.es_excedente = nuevo_estado_excedente
                    prod_a_actualizar.append(prod)
        
        if prod_a_actualizar:
            Produccion.objects.bulk_update(prod_a_actualizar, ['es_excedente'])
            
        return True, f"Se recalcularon {len(prod_a_actualizar)} registros de producción."
        
    except Exception as e:
        return False, str(e)

@login_required
@require_http_methods(["GET"])
def buscar_productos_catalogo(request):
    """
    Busqueda en sabana de productos 
    """
    query = request.GET.get('q', '')

    productos = Producto.objects.filter(
        Q(id_partida__icontains=query) | Q(descripcion_concepto__icontains=query),
        activo=True
    )[:20]

    results = []
    for p in productos:
        results.append({
            'id': p.id,
            'text': f"{p.id_partida} - {p.descripcion_concepto}",
            'partida': p.id_partida,
            'unidad': p.id_unidad_medida.clave if p.id_unidad_medida else 'N/A',
            'precio': float(p.precio_unitario_mn),
            'precio_usd': float(p.precio_unitario_usd)
        })
    
    return JsonResponse({'results': results})

@login_required
@require_http_methods(["POST"])
def vincular_partida_ot(request):
    """
    Agrega un producto del catálogo al Anexo de una OT específica.
    """

    id_ot = request.POST.get('id_ot')
    id_producto = request.POST.get('id_producto')
    volumen = request.POST.get('volumen', 0)

    try:
        importacion = ImportacionAnexo.objects.filter(ot_id=id_ot, es_activo=True).first()
        
        if not importacion:
            ot = OTE.objects.get(id=id_ot)
            importacion = ImportacionAnexo.objects.create(
                ot=ot,
                usuario_carga=request.user,
                es_activo=True
            )

        producto = Producto.objects.get(id=id_producto)

        if not producto:
            return JsonResponse({'exito': False, 'mensaje': 'Producto no encontrado. Verifique si existe en la sabana de productos'})
        
        if PartidaAnexoImportada.objects.filter(importacion_anexo=importacion, id_partida=producto.id_partida).exists():
            return JsonResponse({'exito': False, 'mensaje': f'La partida {producto.id_partida} ya existe en esta OT.'})

        ultimo_orden = PartidaAnexoImportada.objects.filter(importacion_anexo=importacion).count() + 1
        
        PartidaAnexoImportada.objects.create(
            importacion_anexo=importacion,
            id_partida=producto.id_partida,
            descripcion_concepto=producto.descripcion_concepto,
            unidad_medida=producto.id_unidad_medida,
            volumen_proyectado=volumen,
            precio_unitario_mn=producto.precio_unitario_mn,
            precio_unitario_usd=producto.precio_unitario_usd,
            orden_fila=ultimo_orden
        )

        return JsonResponse({'exito': True, 'mensaje': 'Partida vinculada correctamente'})

    except Exception as e:
        return JsonResponse({'exito': False, 'mensaje': f'Error: {str(e)}'}, status=500)




