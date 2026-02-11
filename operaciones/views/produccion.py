from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from ..models import OTE, ImportacionAnexo, PartidaAnexoImportada, Produccion, ReporteMensual, Sitio, ReporteDiario, Estatus, ConceptoMaestro, PartidaProyectada, CicloGuardia, Superintendente
from django.http import JsonResponse
from itertools import chain
from django.db.models import Q, Case, F, When, IntegerField, Value, CharField, Sum, OuterRef, Subquery, Max
from django.db.models.functions import Coalesce
from django.db import transaction
from datetime import date, timedelta, datetime
from decimal import Decimal
import calendar
import json
from collections import defaultdict

@login_required(login_url='/accounts/login/')
def lista_produccion(request):
    """Lista de producción"""
    producciones = Produccion.objects.all().order_by('-fecha_produccion')
    return render(request, 'operaciones/produccion/lista_produccion.html', {'producciones': producciones})

def obtener_sitios_con_ots_ejecutadas(request):
    """Obtener todos los sitios con ots activos y en ejecucion"""
    try:
        ots_activas = OTE.objects.filter(
            id_tipo_id=4,       
            estatus=1           
        )

        ids_principales = ots_activas.annotate(
            sitio_real_id=Case(
                When(id_frente_id__in=[1, 3], then=F('id_patio')),
                When(id_frente_id__in=[2, 6], then=F('id_embarcacion')),
                When(id_frente_id__in=[4, 7], then=F('id_plataforma')),
                When(id_frente_id=5, then=F('id_intercom')),
                default=None,
                output_field=IntegerField()
            )
        ).values_list('sitio_real_id', flat=True)

        ids_patios_fase = ots_activas.filter(
            id_patio__isnull=False
        ).values_list('id_patio', flat=True)

        todos_los_sitios_ids = set(ids_principales) | set(ids_patios_fase)
        
        todos_los_sitios_ids.discard(None)

        sitios = Sitio.objects.filter(
            id__in=todos_los_sitios_ids,
            activo=True
        ).values('id', 'descripcion').order_by('id')
        
        return JsonResponse(list(sitios), safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def ots_por_sitio_grid(request):
    """
    Lista las OTs activas en un sitio y CARGA sus reportes diarios
    para llenar el grid.
    """
    id_sitio = request.GET.get('id_sitio')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    
    if not id_sitio or not mes or not anio:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})

    try:
        mes, anio = int(mes), int(anio)
        id_sitio_int = int(id_sitio)
    except ValueError:
        return JsonResponse({'reportes_diarios': [], 'produccion': []})
    
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    fecha_inicio_mes = date(anio, mes, 1)
    fecha_fin_mes = date(anio, mes, ultimo_dia)

    query = Q(id_embarcacion=id_sitio) | Q(id_plataforma=id_sitio) | \
            Q(id_patio=id_sitio) | Q(id_intercom=id_sitio)

    ultima_repro_fin = OTE.objects.filter(
        ot_principal=OuterRef('id'),
        id_tipo_id=5,
        estatus=1
    ).values('ot_principal').annotate(
        max_fin=Max(Coalesce('fecha_termino_real', 'fecha_termino_programado'))
    ).values('max_fin')

    queryset = OTE.objects.filter(
        query,     
        id_tipo_id=4,            
        estatus=1,
        importaciones_anexo__es_activo=True
    ).distinct()

    queryset = queryset.annotate(
        inicio_vigencia=Coalesce('fecha_inicio_real', 'fecha_inicio_programado'),
        fin_propio=Coalesce('fecha_termino_real', 'fecha_termino_programado'),
        fin_repro=Subquery(ultima_repro_fin)
    ).annotate(
        fin_vigencia=Case(
            When(fin_repro__gt=F('fin_propio'), then=F('fin_repro')),
            default=F('fin_propio')
        )
    ).filter(
        inicio_vigencia__lte=fecha_fin_mes,
        fin_vigencia__gte=fecha_inicio_mes
    )

    ids_ots = list(queryset.values_list('id', flat=True))
    
    reportes_data = ReporteDiario.objects.filter(
        id_reporte_mensual__id_ot_id__in=ids_ots,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio,
        id_sitio_id=id_sitio_int
    ).values(
        'id_reporte_mensual__id_ot_id', 
        'fecha__day',                   
        'id_estatus__descripcion'            
    )

    mapa_asistencia = {}
    for r in reportes_data:
        key = (r['id_reporte_mensual__id_ot_id'], r['fecha__day'])
        mapa_asistencia[key] = r['id_estatus__descripcion']

    reportes_mensuales = ReporteMensual.objects.filter(
        id_ot_id__in=ids_ots,
        mes=mes,
        anio=anio
    ).values('id_ot_id', 'archivo')
    
    mapa_archivos = {rm['id_ot_id']: rm['archivo'] for rm in reportes_mensuales}
    
    data_reportes = []
    
    for ot in queryset:
        dias_bloqueados = []
        vigencia_inicio = ot.inicio_vigencia
        vigencia_fin = ot.fin_vigencia
        
        if ot.requiere_patio and ot.id_patio == id_sitio_int:
            f_ini = ot.fecha_inicio_patio
            f_fin = ot.fecha_fin_patio
            
            if f_ini: vigencia_inicio = f_ini
            if f_fin: vigencia_fin = f_fin
            
            se_muestra = True
            
            if f_fin and f_fin < fecha_inicio_mes:
                se_muestra = False
            
            if f_ini and f_ini > fecha_fin_mes:
                se_muestra = False
            
            if not se_muestra:
                continue

            for d in range(1, ultimo_dia + 1):
                fecha_dia = date(anio, mes, d)
                if f_ini and fecha_dia < f_ini:
                    dias_bloqueados.append(d)
                elif f_fin and fecha_dia > f_fin:
                    dias_bloqueados.append(d)

        fila = {
            'id_ot': ot.id,
            'ot': ot.orden_trabajo,
            'desc': ot.descripcion_trabajo,
            'inicio_v': vigencia_inicio.isoformat() if vigencia_inicio else None,
            'fin_v': vigencia_fin.isoformat() if vigencia_fin else None,
            'archivo': mapa_archivos.get(ot.id,''),
            'dias_bloqueados': dias_bloqueados
        }

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
        id_sitio = data.get('id_sitio')

        if not filas:
            return JsonResponse({'exito': True, 'mensaje': 'Sin datos para guardar'})
        
        if not id_sitio:
            return JsonResponse({'exito': False, 'mensaje': 'El sitio es obligatorio para guardar reportes.'})

        sitio_obj = Sitio.objects.get(id=id_sitio)
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
                    for r in ReporteDiario.objects.filter(
                        id_reporte_mensual=reporte_mensual,
                        id_sitio=sitio_obj
                    )
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
                                bloqueado=False,
                                id_sitio=sitio_obj
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
    Retorna el Universo de Partidas para el Grid de Producción.
    """
    id_ot = request.GET.get('id_ot')
    mes = request.GET.get('mes')
    anio = request.GET.get('anio')
    tipo_tiempo = request.GET.get('tipo_tiempo', 'TE')
    id_sitio = request.GET.get('id_sitio') 

    if not id_ot or not mes or not anio:
        return JsonResponse([], safe=False)

    try:
        mes, anio = int(mes), int(anio)
        id_sitio_int = int(id_sitio) if id_sitio else None
    except ValueError:
        return JsonResponse([], safe=False)

    archivo_url = ''
    dias_bloqueados = []
    try:
        reporte = ReporteMensual.objects.filter(id_ot_id=id_ot, mes=mes, anio=anio).first()
        if reporte:
            dias_bloqueados = list(ReporteDiario.objects.filter(
                id_reporte_mensual=reporte,
                id_estatus_id=17,
                id_sitio_id=id_sitio_int
            ).values_list('fecha__day', flat=True))
            
            if reporte.archivo:
                archivo_url = reporte.archivo
    except Exception:
        pass

    try:
        ot_actual = OTE.objects.get(id=id_ot)
    except OTE.DoesNotExist:
        return JsonResponse([], safe=False)

    last_day = calendar.monthrange(anio, mes)[1]
    
    if ot_actual.requiere_patio and id_sitio_int and ot_actual.id_patio == id_sitio_int:
        f_ini = ot_actual.fecha_inicio_patio
        f_fin = ot_actual.fecha_fin_patio
        
        for d in range(1, last_day + 1):
            fecha_dia = date(anio, mes, d)
            esta_fuera_rango = False
            
            if f_ini and fecha_dia < f_ini:
                esta_fuera_rango = True
            
            if f_fin and fecha_dia > f_fin:
                esta_fuera_rango = True
            
            if esta_fuera_rango and d not in dias_bloqueados:
                dias_bloqueados.append(d)
    

    dias_bloqueados.sort()

    id_principal = ot_actual.ot_principal if ot_actual.ot_principal else ot_actual.id
    
    familia_ots_ids = list(OTE.objects.filter(
        Q(id=id_principal) | Q(ot_principal=id_principal),
        estatus=1
    ).values_list('id', flat=True))

    qs_partidas = PartidaAnexoImportada.objects.filter(
        importacion_anexo__ot_id__in=familia_ots_ids,
        importacion_anexo__es_activo=True
    ).select_related(
        'unidad_medida'
    )

    todas_partidas = list(qs_partidas)

    def sort_key_partidas(p):
        val_anexo = p.anexo.strip().upper() if p.anexo else "ZZZZ"
        raw_code = p.id_partida.strip()
        try:
            val_code = [int(part) for part in raw_code.split('.') if part.isdigit()]
        except:
            val_code = raw_code.split('.')
        
        return (val_anexo, val_code)

    todas_partidas.sort(key=sort_key_partidas)

    if not todas_partidas:
        return JsonResponse({'partidas': [], 'dias_bloqueados': dias_bloqueados, 'totales': {}})

    ids_totales_db = [p.id for p in todas_partidas]
    
    fecha_limite = date(anio, mes, last_day)

    qs_acumulado = Produccion.objects.filter(
        id_partida_anexo_id__in=ids_totales_db,
        fecha_produccion__lte=fecha_limite
    ).values('id_partida_anexo_id').annotate(vol_total=Sum('volumen_produccion')).order_by()

    mapa_acumulado_vol = {}
    for item in qs_acumulado:
        p_id = item['id_partida_anexo_id']
        vol = item['vol_total'] or 0.0
        mapa_acumulado_vol[p_id] = float(vol)

    partidas_consolidadas = {}
    mapa_id_a_key = {}
    total_aut_mn = 0.0
    total_aut_usd = 0.0
    total_acum_mn = 0.0
    total_acum_usd = 0.0

    for p in todas_partidas:
        anexo_clean = p.anexo.strip() if p.anexo else 'S/A'
        codigo_clean = p.id_partida.strip()
        desc_clean = p.descripcion_concepto.strip()
        
        key = (anexo_clean, codigo_clean, desc_clean)
        
        vol_registro = float(p.volumen_proyectado or 0)
        pu_mn = float(p.precio_unitario_mn or 0)
        pu_usd = float(p.precio_unitario_usd or 0)

        total_aut_mn += vol_registro * pu_mn
        total_aut_usd += vol_registro * pu_usd
        vol_hist = float(mapa_acumulado_vol.get(p.id, 0.0) or 0.0)
        total_acum_mn += vol_hist * pu_mn
        total_acum_usd += vol_hist * pu_usd

        if key not in partidas_consolidadas:
            partidas_consolidadas[key] = {
                'id_principal': p.id,
                'ids_agrupados': [p.id],
                'codigo': codigo_clean,
                'concepto': p.descripcion_concepto,
                'unidad': p.unidad_medida.clave if p.unidad_medida else 'N/A',
                'vol_total_proyectado': vol_registro,
                'pu_mn': pu_mn,   
                'pu_usd': pu_usd, 
                'anexo': anexo_clean,
                'archivo': archivo_url
            }
        else:
            partidas_consolidadas[key]['vol_total_proyectado'] += vol_registro
            partidas_consolidadas[key]['ids_agrupados'].append(p.id)
        
        mapa_id_a_key[p.id] = key

    resumen_produccion = Produccion.objects.filter(
        id_reporte_mensual__id_ot_id=id_ot,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio,
        id_partida_anexo_id__in=ids_totales_db,
        id_sitio_produccion_id = id_sitio_int
    ).values(
        'id_partida_anexo_id', 
        'fecha_produccion__day', 
        'tipo_tiempo', 
        'es_excedente', 
        'volumen_produccion'
    )

    produccion_mapa = {}
    
    for item in resumen_produccion:
        id_db = item['id_partida_anexo_id']
        key_consolidada = mapa_id_a_key.get(id_db)
        
        if not key_consolidada: continue
        
        dia = item['fecha_produccion__day']
        master_key = (key_consolidada, dia)
        
        if master_key not in produccion_mapa:
            produccion_mapa[master_key] = {'TE': 0.0, 'CMA': 0.0, 'es_excedente': False}
        
        t = item['tipo_tiempo'] 
        vol = float(item['volumen_produccion'])
        
        produccion_mapa[master_key][t] += vol
        
        if item['es_excedente']:
            produccion_mapa[master_key]['es_excedente'] = True

    resumen_programacion = PartidaProyectada.objects.filter(
        ot_id=id_ot,
        partida_anexo_id__in=ids_totales_db,
        fecha__year=anio,
        fecha__month=mes
    ).values('partida_anexo_id', 'fecha__day', 'volumen_programado')

    programacion_mapa = {}

    for item in resumen_programacion:
        id_db = item['partida_anexo_id']
        key_consolidada = mapa_id_a_key.get(id_db)
        if not key_consolidada: continue

        dia = item['fecha__day']
        master_key = (key_consolidada, dia)
        
        vol_prog = float(item['volumen_programado'] or 0)
        
        programacion_mapa[master_key] = programacion_mapa.get(master_key, 0.0) + vol_prog

    data_final = []
    total_ejec_mn = 0.0
    total_ejec_usd = 0.0

    for key, datos in partidas_consolidadas.items():
        
        suma_mes_visual = 0.0
        suma_prog_mes_visual = 0.0
        hay_excedente_visual = False
        
        fila_grid = {
            'id_partida_imp': datos['id_principal'],
            'codigo': datos['codigo'],
            'concepto': datos['concepto'],
            'unidad': datos['unidad'],
            'vol_total_proyectado': datos['vol_total_proyectado'],
            'acumulado_mes': 0.0,
            'acumulado_programado': 0.0,
            'archivo': datos['archivo'],
            'anexo': datos['anexo'],
            'monto_mn': 0.0,
            'monto_usd': 0.0
        }

        for d in range(1, 32):
            master_key = (key, d)
            
            info_dia = produccion_mapa.get(master_key)
            val_te = info_dia['TE'] if info_dia else 0.0
            val_cma = info_dia['CMA'] if info_dia else 0.0
            es_exc = info_dia['es_excedente'] if info_dia else False
            val_prog = programacion_mapa.get(master_key, 0.0)
            
            valor_visual = val_te if tipo_tiempo == 'TE' else val_cma
            
            if val_te == 0 and val_cma == 0 and val_prog == 0 and not es_exc:
                fila_grid[f'dia{d}'] = None
            else:
                fila_grid[f'dia{d}'] = {
                    'valor': valor_visual,
                    'programado': val_prog,
                    'es_excedente': es_exc,
                    'te_dia': val_te,
                    'cma_dia': val_cma
                }
            
            suma_mes_visual += val_te + val_cma
            suma_prog_mes_visual += val_prog
            if es_exc: hay_excedente_visual = True
        
        fila_grid['acumulado_mes'] = suma_mes_visual
        fila_grid['acumulado_programado'] = suma_prog_mes_visual
        fila_grid['estatus_gpu'] = 'BLOQUEADO' if hay_excedente_visual else 'AUTORIZADO'
        
        fila_monto_mn = suma_mes_visual * datos['pu_mn']
        fila_monto_usd = suma_mes_visual * datos['pu_usd']

        fila_grid['monto_mn'] = fila_monto_mn
        fila_grid['monto_usd'] = fila_monto_usd
        
        total_ejec_mn += fila_monto_mn
        total_ejec_usd += fila_monto_usd

        data_final.append(fila_grid)
    
    por_ejecutar_mn = total_aut_mn - total_acum_mn
    por_ejecutar_usd = total_aut_usd - total_acum_usd

    totales_financieros = {
        'aut_mn': total_aut_mn,
        'aut_usd': total_aut_usd,
        'ejec_mn': total_ejec_mn,
        'ejec_usd': total_ejec_usd,
        'acum_mn': total_acum_mn,
        'acum_usd': total_acum_usd,
        'resta_mn': por_ejecutar_mn,
        'resta_usd': por_ejecutar_usd
    }

    respuesta = {
        'partidas': data_final,
        'dias_bloqueados': dias_bloqueados,
        'totales': totales_financieros
    }
    return JsonResponse(respuesta)

@login_required
@require_http_methods(["POST"])
def guardar_produccion_masiva(request):
    """
    Guarda producción masiva corrigiendo el cálculo del acumulado en días bloqueados.
    """
    try:
        data = json.loads(request.body)
        id_ot = data.get('id_ot')
        mes, anio = int(data.get('mes')), int(data.get('anio'))
        filas = data.get('partidas', [])
        tipo_tiempo = data.get('tipo_tiempo', 'TE')
        id_sitio_reporte = data.get('id_sitio')

        if not filas:
            return JsonResponse({'exito': True, 'mensaje': 'Sin datos para guardar'})

        with transaction.atomic():

            sitio_obj = None
            if id_sitio_reporte:
                sitio_obj = Sitio.objects.filter(id=id_sitio_reporte).first()

            reporte_mensual, _ = ReporteMensual.objects.get_or_create(
                id_ot_id=id_ot, mes=mes, anio=anio, defaults={'id_estatus_id': 1}
            )

            dias_cerrados_set = set(ReporteDiario.objects.filter(
                id_reporte_mensual=reporte_mensual,
                id_estatus_id=17
            ).values_list('fecha__day', flat=True))

            ot_actual = OTE.objects.get(id=id_ot) 
            id_principal = ot_actual.ot_principal if ot_actual.ot_principal else ot_actual.id
            familia_ots = list(OTE.objects.filter(Q(id=id_principal) | Q(ot_principal=id_principal)).values_list('id', flat=True)) 
            
            ids_partidas_form = [f.get('id_partida_imp') for f in filas]
            partidas_db = PartidaAnexoImportada.objects.in_bulk(ids_partidas_form)
            
            codigos_en_batch = set(p.id_partida for p in partidas_db.values())
            mapa_autorizado = obtener_volumenes_consolidados(id_ot, list(codigos_en_batch))

            produccion_actual_qs = Produccion.objects.filter(
                id_reporte_mensual=reporte_mensual, 
                tipo_tiempo=tipo_tiempo,
                id_sitio_produccion_id = id_sitio_reporte
            )
            mapa_produccion_actual = {
                (p.id_partida_anexo_id, p.fecha_produccion.day): p 
                for p in produccion_actual_qs
            }

            raw_historia = Produccion.objects.filter(
                id_reporte_mensual__id_ot_id__in=familia_ots
            ).exclude(
                id_reporte_mensual=reporte_mensual
            ).values('id_partida_anexo__id_partida').annotate(total=Sum('volumen_produccion')) 
            
            mapa_historia_global = defaultdict(Decimal)
            for item in raw_historia:
                codigo_limpio = item['id_partida_anexo__id_partida'].strip()
                mapa_historia_global[codigo_limpio] += item['total'] or Decimal(0)

            raw_otros_tiempos = Produccion.objects.filter(
                id_reporte_mensual=reporte_mensual,
                id_partida_anexo_id__in=ids_partidas_form
            ).exclude(
                tipo_tiempo=tipo_tiempo
            ).values('id_partida_anexo_id').annotate(total=Sum('volumen_produccion')) 

            mapa_otros_tiempos = {
                item['id_partida_anexo_id']: item['total'] or Decimal(0) 
                for item in raw_otros_tiempos
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

                base_hist = sum(mapa_historia_global[v] for v in variantes if v in mapa_historia_global)
                base_otros = mapa_otros_tiempos.get(id_p, Decimal(0))
                
                running_total = base_hist + base_otros

                valores_dia = fila.get('valores', [])
                
                for idx, vol in enumerate(valores_dia):
                    dia = idx + 1
                    
                    prod_obj = mapa_produccion_actual.get((id_p, dia))
                    vol_db = prod_obj.volumen_produccion if prod_obj else Decimal(0)
                    
                    vol_input = Decimal(str(vol or 0))

                    if dia in dias_cerrados_set:
                        vol_para_calculo = vol_db
                    else:
                        vol_para_calculo = vol_input

                    running_total += vol_para_calculo
                    
                    es_excedente = round(running_total, 4) > vol_autorizado

                    if dia in dias_cerrados_set:
                        continue 

                    if prod_obj:
                        if (prod_obj.volumen_produccion != vol_para_calculo) or (prod_obj.es_excedente != es_excedente) or (prod_obj.id_sitio_produccion_id != sitio_obj):
                            prod_obj.volumen_produccion = vol_para_calculo
                            prod_obj.es_excedente = es_excedente
                            prod_obj.id_sitio_produccion = sitio_obj
                            a_actualizar.append(prod_obj)
                    
                    elif vol_para_calculo > 0:
                        a_crear.append(Produccion(
                            id_reporte_mensual=reporte_mensual,
                            id_partida_anexo=partida, 
                            fecha_produccion=date(anio, mes, dia),
                            volumen_produccion=vol_para_calculo,
                            tipo_tiempo=tipo_tiempo,
                            es_excedente=es_excedente,
                            id_estatus_cobro_id=1,
                            id_sitio_produccion=sitio_obj
                        ))

            if a_crear: 
                Produccion.objects.bulk_create(a_crear)
            if a_actualizar: 
                Produccion.objects.bulk_update(a_actualizar, ['volumen_produccion', 'es_excedente', 'id_sitio_produccion'])
        
        return JsonResponse({'exito': True, 'mensaje': 'Producción guardada correctamente.'})
    except Exception as e:
        import traceback
        traceback.print_exc()
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

    conceptos = ConceptoMaestro.objects.filter(
        Q(partida_ordinaria__icontains=query) | 
        Q(partida_extraordinaria__icontains=query) |
        Q(descripcion__icontains=query),
        activo=True
    ).select_related('unidad_medida')[:20]

    results = []
    for c in conceptos:
        codigo = c.partida_ordinaria if c.partida_ordinaria else c.partida_extraordinaria
        results.append({
            'id': c.id,
            'text': f"{codigo} - {c.descripcion} - {c.sub_anexo.clave_anexo if c.sub_anexo else 'S/A'}",
            'partida': codigo,
            'unidad': c.unidad_medida.clave if c.unidad_medida else 'N/A',
            'precio': float(c.precio_unitario_mn or 0),
            'precio_usd': float(c.precio_unitario_usd or 0)
        })
    
    return JsonResponse({'results': results})

@login_required
@require_http_methods(["POST"])
def vincular_partida_ot(request):
    """
    Agrega un producto del catálogo al Anexo de una OT específica.
    """

    id_ot = request.POST.get('id_ot')
    id_concepto = request.POST.get('id_producto') 
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

        concepto = ConceptoMaestro.objects.get(id=id_concepto)

        if not concepto:
            return JsonResponse({'exito': False, 'mensaje': 'Concepto no encontrado.'})
        
        codigo_partida = concepto.partida_ordinaria if concepto.partida_ordinaria else concepto.partida_extraordinaria

        if PartidaAnexoImportada.objects.filter(
            importacion_anexo=importacion, 
            id_partida=codigo_partida,
            descripcion_concepto=concepto.descripcion,
            anexo=concepto.sub_anexo.clave_anexo if concepto.sub_anexo else None,
        ).exists():
            return JsonResponse({'exito': False, 'mensaje': f'La partida {codigo_partida} con esta descripción ya existe en esta OT.'})


        ultimo_orden = PartidaAnexoImportada.objects.filter(importacion_anexo=importacion).count() + 1
        
        PartidaAnexoImportada.objects.create(
            importacion_anexo=importacion,
            id_partida=codigo_partida,
            descripcion_concepto=concepto.descripcion,
            unidad_medida=concepto.unidad_medida,
            volumen_proyectado=volumen,
            precio_unitario_mn=concepto.precio_unitario_mn,
            precio_unitario_usd=concepto.precio_unitario_usd,
            orden_fila=ultimo_orden,
            anexo=concepto.sub_anexo.clave_anexo if concepto.sub_anexo else None,
        )

        return JsonResponse({'exito': True, 'mensaje': 'Partida vinculada correctamente'})

    except Exception as e:
        return JsonResponse({'exito': False, 'mensaje': f'Error: {str(e)}'}, status=500)


@login_required
@require_http_methods(["POST"])
def guardar_archivo_mensual(request):
    """
    Guarda el enlace de archivo en el ReporteMensual
    """
    try:
        data = json.loads(request.body)
        
        id_ot = data.get('id_ot')
        mes = data.get('mes')
        anio = data.get('anio')
        url = data.get('archivo')
        
        if not all([id_ot, mes, anio]):
            return JsonResponse({
                'exito': False,
                'mensaje': 'Faltan datos obligatorios (OT, Mes o Año).'
            })

        if not url:
            return JsonResponse({
                'exito': False,
                'mensaje': 'La URL del archivo es obligatoria.'
            })

        with transaction.atomic():
            reporte, created = ReporteMensual.objects.get_or_create(
                id_ot_id=id_ot,
                mes=int(mes),
                anio=int(anio),
                defaults={
                    'id_estatus_id': 1
                }
            )

            reporte.archivo = url
            reporte.save()

        return JsonResponse({
            'exito': True,
            'mensaje': 'Evidencia vinculada al Reporte Mensual correctamente.',
            'archivo': reporte.archivo
        })

    except Exception as e:
        return JsonResponse({
            'exito': False,
            'mensaje': f'Error interno al guardar evidencia: {str(e)}'
        }, status=500)


@login_required
def obtener_guardias_mes(request):
    """ 
    Calcula matemáticamente quién está de guardia en el mes solicitado.
    """
    id_sitio = request.GET.get('id_sitio')
    try:
        mes = int(request.GET.get('mes'))
        anio = int(request.GET.get('anio'))
    except:
        return JsonResponse({'guardias': []})

    try:
        ciclo = CicloGuardia.objects.get(sitio_id=id_sitio)
    except CicloGuardia.DoesNotExist:
        return JsonResponse({'guardias': []})   

    fecha_inicio_mes = date(anio, mes, 1)
    if mes == 12:
        fecha_fin_mes = date(anio + 1, 1, 1) - timedelta(days=1)
    else:
        fecha_fin_mes = date(anio, mes + 1, 1) - timedelta(days=1)

    guardias_visuales = []
    bloque_actual = None 
    
    for dia in range(1, fecha_fin_mes.day + 1):
        fecha_actual = date(anio, mes, dia)
        
        delta = (fecha_actual - ciclo.fecha_inicio_super_a).days
            
        turno_idx = (delta // 14) % 2 
        super_activo = ciclo.super_a if turno_idx == 0 else ciclo.super_b
        
        if bloque_actual is None:
            bloque_actual = {
                'nombre': super_activo.nombre,
                'color': super_activo.color,
                'inicio': dia,
                'fin': dia
            }
        elif bloque_actual['nombre'] == super_activo.nombre:
            bloque_actual['fin'] = dia
        else:
            guardias_visuales.append(bloque_actual)
            bloque_actual = {
                'nombre': super_activo.nombre,
                'color': super_activo.color,
                'inicio': dia,
                'fin': dia
            }
            
    if bloque_actual:
        guardias_visuales.append(bloque_actual)

    return JsonResponse({'guardias': guardias_visuales})

@login_required
def obtener_supers_por_sitio(request):
    """ Retorna los supers asignados a un sitio """
    id_sitio = request.GET.get('id_sitio')
    supers = Superintendente.objects.filter(sitio_asignado_id=id_sitio, activo=True).values('id', 'nombre')
    return JsonResponse({'supers': list(supers)})

@login_required
@require_http_methods(["POST"])
def configurar_ciclo_guardia(request):
    """ Guarda o actualiza la configuración 14x14 del frente """
    data = json.loads(request.body)
    
    id_sitio = data.get('id_sitio')
    
    CicloGuardia.objects.update_or_create(
        sitio_id=id_sitio,
        defaults={
            'super_a_id': data.get('id_super_a'),
            'super_b_id': data.get('id_super_b'),
            'fecha_inicio_super_a': data.get('fecha_inicio_a')
        }
    )
    
    return JsonResponse({'exito': True})
