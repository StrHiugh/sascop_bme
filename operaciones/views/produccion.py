from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from ..models import Producto, OTE, ImportacionAnexo, PartidaAnexoImportada, Produccion, ReporteMensual, Sitio
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

def ots_por_sitio_grid(request):
    """
    Lista las OTs activas en un sitio que TIENEN anexo importado.
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

    data_reportes = []
    for ot in queryset:
        data_reportes.append({
            'id_ot': ot.id,
            'ot': ot.orden_trabajo,
            'desc': ot.descripcion_trabajo,
            'inicio_v': ot.inicio_vigencia.isoformat() if ot.inicio_vigencia else None,
            'fin_v': ot.fin_vigencia.isoformat() if ot.fin_vigencia else None,
        })

    return JsonResponse({'reportes_diarios': data_reportes})

def obtener_volumenes_consolidados(id_ot_inicial, ids_partidas_codigos):
    """
    Calcula el volumen total autorizado sumando la OT inicial y todas sus reprogramaciones activas.
    """
    id_ots_repro = OTE.objects.filter(
        ot_principal=id_ot_inicial, 
        id_tipo_id=5,
        estatus=1
    ).values_list('id', flat=True)
    
    todas_las_ots = [id_ot_inicial] + list(id_ots_repro)
    
    partidas_query = PartidaAnexoImportada.objects.filter(
        importacion_anexo__ot_id__in=todas_las_ots,
        importacion_anexo__es_activo=True,
        id_partida__in=ids_partidas_codigos
    ).values('id_partida').annotate(total_vol=Sum('volumen_proyectado'))
    
    return {p['id_partida']: p['total_vol'] or 0 for p in partidas_query}


def obtener_partidas_produccion(request):
    """
    Retorna las partidas del Anexo C de una OT y su producción diaria.
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

    importacion = ImportacionAnexo.objects.filter(ot_id=id_ot, es_activo=True).first()
    if not importacion:
        return JsonResponse([], safe=False)

    partidas = PartidaAnexoImportada.objects.filter(
        importacion_anexo=importacion
    ).select_related('unidad_medida').order_by('orden_fila')
    
    resumen_produccion = Produccion.objects.filter(
        id_reporte_mensual__id_ot_id=id_ot,
        id_reporte_mensual__mes=mes,
        id_reporte_mensual__anio=anio,
        tipo_tiempo=tipo_tiempo
    ).values(
        'id_partida_anexo_id', 
        'fecha_produccion__day',
        'es_excedente'
    ).annotate(
        total_dia=Sum('volumen_produccion')
    )

    produccion_dict = {}
    for item in resumen_produccion:
        key = (item['id_partida_anexo_id'], item['fecha_produccion__day'])
        produccion_dict[key] = {
            'valor': float(item['total_dia']),
            'es_excedente': item['es_excedente']
        }

    data_produccion = []
    for p in partidas:
        fila = {
            'id_partida_imp': p.id,
            'codigo': p.id_partida,
            'concepto': p.descripcion_concepto,
            'unidad': p.unidad_medida.clave if p.unidad_medida else 'N/A',
            'vol_total_proyectado': float(p.volumen_proyectado) if p.volumen_proyectado else 0.0,
            'acumulado_otros_meses': 0.00, 
        }
        
        suma_mes = 0.0
        hay_excedente_en_fila = False 

        for d in range(1, 32):
            dato_celda = produccion_dict.get((p.id, d))
            
            if dato_celda:
                valor = dato_celda['valor']
                suma_mes += valor
                
                if dato_celda['es_excedente']:
                    hay_excedente_en_fila = True

                if valor == 0 and not dato_celda['es_excedente']:
                    fila[f'dia{d}'] = None
                else:
                    fila[f'dia{d}'] = dato_celda
            else:
                fila[f'dia{d}'] = None
            
        fila['acumulado_mes'] = suma_mes
        
        if hay_excedente_en_fila:
            fila['estatus_gpu'] = 'BLOQUEADO'
        else:
            fila['estatus_gpu'] = 'AUTORIZADO'
        
        data_produccion.append(fila)

    return JsonResponse(data_produccion, safe=False)

@login_required
@require_http_methods(["POST"])
def guardar_produccion_masiva(request):
    """
    Guarda la matriz de producción
    """
    try:
        data = json.loads(request.body)
        id_ot = data.get('id_ot')
        mes = int(data.get('mes'))
        anio = int(data.get('anio'))
        filas = data.get('partidas', [])
        tipo_tiempo_batch = data.get('tipo_tiempo', 'TE')

        if not filas:
            return JsonResponse({'exito': True, 'mensaje': 'Sin datos para guardar'})

        with transaction.atomic():
            reporte_mensual, _ = ReporteMensual.objects.get_or_create(
                id_ot_id=id_ot, mes=mes, anio=anio,
                defaults={'id_estatus_id': 1}
            )

            ids_partidas = [f.get('id_partida_imp') for f in filas]
            partidas_db = PartidaAnexoImportada.objects.in_bulk(ids_partidas)

            producciones_existentes = Produccion.objects.filter(
                id_reporte_mensual=reporte_mensual,
                id_partida_anexo_id__in=ids_partidas,
                tipo_tiempo=tipo_tiempo_batch 
            )
            mapa_produccion = {
                (prod.id_partida_anexo_id, prod.fecha_produccion.day): prod 
                for prod in producciones_existentes
            }

            otros_tipos_query = Produccion.objects.filter(
                id_reporte_mensual=reporte_mensual,
                id_partida_anexo_id__in=ids_partidas
            ).exclude(
                tipo_tiempo=tipo_tiempo_batch
            ).values('id_partida_anexo').annotate(total=Sum('volumen_produccion'))
            
            mapa_otros_tipos = {o['id_partida_anexo']: o['total'] for o in otros_tipos_query}

            historicos_query = Produccion.objects.filter(
                id_partida_anexo_id__in=ids_partidas
            ).exclude(
                id_reporte_mensual=reporte_mensual
            ).values('id_partida_anexo').annotate(total=Sum('volumen_produccion'))
            
            mapa_historicos = {h['id_partida_anexo']: h['total'] for h in historicos_query}

            a_crear = []
            a_actualizar = []
            ids_a_borrar = []

            for fila in filas:
                id_partida = fila.get('id_partida_imp')
                valores_diarios = fila.get('valores', [])
                
                partida = partidas_db.get(id_partida)
                if not partida:
                    continue

                volumen_autorizado = partida.volumen_proyectado or 0
                
                base_acumulado = (mapa_historicos.get(id_partida) or 0) + (mapa_otros_tipos.get(id_partida) or 0)
                
                acumulado_actual = base_acumulado

                for index, volumen in enumerate(valores_diarios):
                    dia = index + 1
                    volumen_dec = Decimal(str(volumen))
                    
                    acumulado_actual += volumen_dec
                    
                    es_excedente_dia = acumulado_actual > volumen_autorizado
                    prod_obj = mapa_produccion.get((id_partida, dia))

                    if volumen_dec == 0:
                        if prod_obj:
                            ids_a_borrar.append(prod_obj.id)
                    else:
                        if prod_obj:
                            if prod_obj.volumen_produccion != volumen_dec or prod_obj.es_excedente != es_excedente_dia:
                                prod_obj.volumen_produccion = volumen_dec
                                prod_obj.es_excedente = es_excedente_dia
                                a_actualizar.append(prod_obj)
                        else:
                            fecha_prod = date(anio, mes, dia)
                            nuevo_obj = Produccion(
                                id_reporte_mensual=reporte_mensual,
                                id_partida_anexo=partida,
                                fecha_produccion=fecha_prod,
                                volumen_produccion=volumen_dec,
                                tipo_tiempo=tipo_tiempo_batch,
                                es_excedente=es_excedente_dia,
                                id_estatus_cobro_id=1
                            )
                            a_crear.append(nuevo_obj)

            if a_crear:
                Produccion.objects.bulk_create(a_crear)

            if a_actualizar:
                Produccion.objects.bulk_update(a_actualizar, ['volumen_produccion', 'es_excedente'])

        return JsonResponse({'exito': True, 'mensaje': f'Sábana de {tipo_tiempo_batch} guardada correctamente'})

    except Exception as e:
        return JsonResponse({'exito': False, 'mensaje': f'Error interno: {str(e)}'}, status=500)

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