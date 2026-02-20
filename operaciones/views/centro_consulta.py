from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db import connection
from core.utils import ejecutar_query_sql
from ..models import *
import json

@login_required
def fn_centro_consulta(request):
    """
    Vista principal para el dashboard de Business Intelligence (BI).
    Renderiza el template estático inicialmente.
    """
    context = {}
    return render(request, 'operaciones/centro_consulta/centro_consulta.html', context)



@csrf_exempt
@require_http_methods(["POST"])
@login_required

def fn_api_busqueda_global(request):
    """
    Endpoint API para el Buscador Global BI (Optimizado para Server-Side de DataTables).
    """
    try:
        cuerpo_peticion = json.loads(request.body)
        salto_registros = int(cuerpo_peticion.get("start", 0))
        limite_registros = int(cuerpo_peticion.get("length", 10))
        numero_dibujo = int(cuerpo_peticion.get("draw", 1))
        resultados_paginados, total_filtrados = fn_ejecutar_busqueda_global(request, cuerpo_peticion, salto_registros, limite_registros)
        return JsonResponse({
            "draw": numero_dibujo,
            "recordsTotal": total_filtrados, 
            "recordsFiltered": total_filtrados,
            "data": resultados_paginados
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"estatus": "error", "mensaje": "JSON inválido"}, status=400)
    except Exception as error_servidor:
        print(f"Error en Buscador: {str(error_servidor)}")
        return JsonResponse({"estatus": "error", "mensaje": str(error_servidor)}, status=500)


@login_required
def fn_ejecutar_busqueda_global(request, payload, salto_bd, limite_bd):
    """
    Ejecuta el bloque SQL maestro dividido en dos pasos.
    Ahora recibe el 'request' por si necesitas registrar la actividad del usuario.
    """
    filtros = payload.get("filtros", {})

    origenes = filtros.get("origenes", [])
    lista_origenes = origenes if origenes else ["PTE", "OT", "PROD"]

    check_entregados = filtros.get("check_entregados")
    check_pendientes = filtros.get("check_no_entregados")

    filtro_entregado = 1 if check_entregados else (1 if not check_entregados and not check_pendientes else 0)
    filtro_no_entregado = 1 if check_pendientes else (1 if not check_entregados and not check_pendientes else 0)

    fecha_ini_input = filtros.get("fecha_inicio")
    fecha_fin_input = filtros.get("fecha_fin")
    filtro_fechas_activo = 1 if (fecha_ini_input and fecha_fin_input) else 0

    params = {
        "fecha_ini": fecha_ini_input if fecha_ini_input else "1900-01-01", 
        "fecha_fin": fecha_fin_input if fecha_fin_input else "2100-12-31",
        "lider_id": filtros.get("lider_id") if filtros.get("lider_id") else None,
        "cliente_id": filtros.get("cliente_id") if filtros.get("cliente_id") else None,
        "frente_id": filtros.get("frente_id") if filtros.get("frente_id") else None,
        "id_sitio": filtros.get("id_sitio") if filtros.get("id_sitio") else None,
        "nombre_doc": filtros.get("nombre_documento") if filtros.get("nombre_documento") else None,
        "estatus_proceso_id": filtros.get("estatus_proceso") if filtros.get("estatus_proceso") else None,
        "texto": f"%{filtros.get('texto_busqueda', '')}%",
        "filtro_entregado": filtro_entregado,
        "filtro_no_entregado": filtro_no_entregado,
        "buscar_por_frente": filtros.get("buscar_por_frente") if filtros.get("buscar_por_frente") else "1",
        "tipos_seleccionados": tuple(lista_origenes),
        "filtro_fechas_activo": filtro_fechas_activo,
        "limite_bd": limite_bd,
        "salto_bd": salto_bd
    }

    clausula_from_where = """
        FROM (
            -- [BLOQUE PTE]
            SELECT
                pd.id AS id_origen,
                'PTE' AS tipo,
                COALESCE(ph.oficio_pte, 'SIN FOLIO') AS folio,
                COALESCE(c.descripcion, 'CLIENTE NO ASIGNADO') AS cliente,
                COALESCE(rp.descripcion, 'SIN LÍDER') AS lider,
                'N/A' AS frente,
                NULL::integer AS id_sitio_oficial,
                'NO APLICA' AS sitio_oficial,
                NULL as sitio_pat_desc,
                NULL as sitio_emb_desc,
                NULL as sitio_plat_desc,
                COALESCE(p.descripcion, 'POR DEFINIR') AS documento,
                CASE
                    WHEN pd.fecha_entrega IS NULL
                        THEN
                            'NO ENTREGADO'
                    ELSE TO_CHAR(pd.fecha_entrega, 'DD/MM/YYYY')
                END AS fecha,
                COALESCE(pd.archivo, '') AS archivo,
                pd.fecha_entrega AS _fecha_sort,
                pd.estatus_paso_id AS _fid_estatus_paso,
                ph.id_cliente_id AS _fid_cliente,
                ph.id_responsable_proyecto_id AS _fid_lider,
                NULL::bigint AS _fid_frente,
                NULL::integer AS _fid_patio,
                NULL::integer AS _fid_embarcacion,
                NULL::integer AS _fid_plataforma
            FROM
                pte_detalle pd
            INNER JOIN pte_header ph ON
                pd.id_pte_header_id = ph.id
            LEFT JOIN cliente c ON
                ph.id_cliente_id = c.id
            LEFT JOIN responsable_proyecto rp ON
                ph.id_responsable_proyecto_id = rp.id
            LEFT JOIN paso p ON
                pd.id_paso_id = p.id
            WHERE
                ph.estatus != 0

            UNION ALL

            -- [BLOQUE OT]
            SELECT
                od.id AS id_origen,
                'OT' AS tipo,
                COALESCE(o.orden_trabajo, 'SIN OT') AS folio,
                COALESCE(c.descripcion, 'CLIENTE NO ASIGNADO') AS cliente,
                COALESCE(rp.descripcion, 'SIN LÍDER') AS lider,
                COALESCE(f.descripcion, 'SIN FRENTE') AS frente,
                CASE
                    WHEN o.id_frente_id = 1
                        THEN
                            o.id_patio
                    WHEN o.id_frente_id = 2
                        THEN
                            o.id_embarcacion
                    WHEN o.id_frente_id = 4
                        THEN o.id_plataforma
                    ELSE
                        NULL
                END AS id_sitio_oficial,
                CASE
                    WHEN o.id_frente_id = 1
                        THEN
                            COALESCE(s_pat.descripcion, 'SIN PATIO')
                    WHEN o.id_frente_id = 2
                        THEN
                            COALESCE(s_emb.descripcion, 'SIN EMBARCACION')
                    WHEN o.id_frente_id = 4
                        THEN
                            COALESCE(s_plat.descripcion, 'SIN PLATAFORMA')
                    ELSE 'SIN UBICACIÓN'
                END AS sitio_oficial,
                s_pat.descripcion as sitio_pat_desc,
                s_emb.descripcion as sitio_emb_desc,
                s_plat.descripcion as sitio_plat_desc,
                COALESCE(pot.descripcion, 'POR DEFINIR') AS documento,
                CASE
                    WHEN od.fecha_entrega IS NULL
                        THEN
                            'NO ENTREGADO'
                    ELSE
                        TO_CHAR(od.fecha_entrega, 'DD/MM/YYYY')
                END AS fecha,
                COALESCE(od.archivo, '') AS archivo,
                od.fecha_entrega AS _fecha_sort,
                od.estatus_paso_id AS _fid_estatus_paso,
                o.id_cliente_id AS _fid_cliente,
                o.id_responsable_proyecto_id AS _fid_lider,
                o.id_frente_id AS _fid_frente,
                o.id_patio AS _fid_patio,
                o.id_embarcacion AS _fid_embarcacion,
                o.id_plataforma AS _fid_plataforma
            FROM
                ot_detalle od
            INNER JOIN ot o ON
                od.id_ot_id = o.id
            LEFT JOIN cliente c ON
                o.id_cliente_id = c.id
            LEFT JOIN responsable_proyecto rp ON
                o.id_responsable_proyecto_id = rp.id
            LEFT JOIN frente f ON
                o.id_frente_id = f.id
            LEFT JOIN paso_ot pot ON
                od.id_paso_id = pot.id
            LEFT JOIN sitio s_pat ON
                o.id_patio = s_pat.id
            LEFT JOIN sitio s_emb ON
                o.id_embarcacion = s_emb.id
            LEFT JOIN sitio s_plat ON
                o.id_plataforma = s_plat.id
            WHERE
                o.estatus = 1
        ) AS T
        WHERE
            T.tipo IN %(tipos_seleccionados)s AND
            (%(lider_id)s IS NULL OR T._fid_lider = %(lider_id)s) AND
            (%(cliente_id)s IS NULL OR T._fid_cliente = %(cliente_id)s)AND
            (%(nombre_doc)s IS NULL OR T.documento = %(nombre_doc)s) AND
            (T.documento ILIKE %(texto)s OR T.folio ILIKE %(texto)s) AND
            (%(estatus_proceso_id)s IS NULL OR T._fid_estatus_paso = %(estatus_proceso_id)s) AND
            (CASE
                WHEN %(id_sitio)s IS NULL
                    THEN (%(frente_id)s IS NULL OR T._fid_frente = %(frente_id)s)
                WHEN %(buscar_por_frente)s = '1'
                    THEN
                        (T._fid_frente = %(frente_id)s AND
                        ((%(frente_id)s = 1 AND
                        T._fid_patio = %(id_sitio)s::int) OR (%(frente_id)s = 2 AND
                        T._fid_embarcacion = %(id_sitio)s::int) OR (%(frente_id)s = 4 AND
                        T._fid_plataforma = %(id_sitio)s::int)))
                ELSE
                    (T._fid_patio = %(id_sitio)s::int OR
                    T._fid_embarcacion = %(id_sitio)s::int OR
                    T._fid_plataforma = %(id_sitio)s::int)
            END)
            AND (
                (%(filtro_entregado)s = 1 AND
                LENGTH(TRIM(T.archivo)) > 5)
                OR
                (%(filtro_no_entregado)s = 1 AND
                (T.archivo IS NULL OR LENGTH(TRIM(T.archivo)) <= 5))
            )
            AND (
                %(filtro_fechas_activo)s = 0
                OR
                (T._fecha_sort BETWEEN %(fecha_ini)s::date AND
                %(fecha_fin)s::date)
            )
    """

    sql_conteo = f"""
    SELECT COUNT(*) AS total_registros
    {clausula_from_where}
    """

    sql_datos = f"""
    SELECT
        T.id_origen,
        T.tipo,
        T.folio,
        T.cliente,
        T.lider,
        T.frente,
        T._fid_estatus_paso AS estatus_paso_id,

        CASE
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_plataforma = %(id_sitio)s::int
                    THEN T._fid_plataforma
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_embarcacion = %(id_sitio)s::int
                    THEN
                        T._fid_embarcacion
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_patio = %(id_sitio)s::int
                    THEN
                        T._fid_patio
            ELSE
                T.id_sitio_oficial
        END AS id_sitio,

        CASE
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_plataforma = %(id_sitio)s::int
                    THEN
                        T.sitio_plat_desc
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_embarcacion = %(id_sitio)s::int
                    THEN
                        T.sitio_emb_desc
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_patio = %(id_sitio)s::int
                    THEN
                        T.sitio_pat_desc
            ELSE
                T.sitio_oficial
        END AS sitio,

        T.documento,
        T.fecha,
        T.archivo
    {clausula_from_where}
    ORDER BY
        T._fecha_sort ASC NULLS LAST
    LIMIT
        %(limite_bd)s OFFSET %(salto_bd)s;
    """

    resultado_conteo = ejecutar_query_sql(sql_conteo, params)
    total_filtrados = resultado_conteo[0]["total_registros"] if resultado_conteo else 0

    resultados_paginados = ejecutar_query_sql(sql_datos, params)

    return resultados_paginados, total_filtrados


@login_required
def obtener_frente_afectacion_dos(solicitud):
    try:
        frentes_listado = Frente.objects.filter(
            nivel_afectacion=2,
            activo=True
        )

        return JsonResponse([
            {
            "id": f.id,
            "descripcion": f.descripcion,
            "afectacion": f.nivel_afectacion,
            "comentario": f.comentario,
            "activo": f.activo
            } for f in frentes_listado
        ], safe=False) if frentes_listado.exists() else JsonResponse({
            "tipo_aviso": "error",
            "detalles": "No se encontraron frentes con afectación 2"
        }, status=404)

    except Exception as error_proceso:
        return JsonResponse({
            "tipo_aviso": "error",
            "detalles": f"Error en el servidor: {str(error_proceso)}"
        }, status=500)

@login_required
def obtener_estatus_afectacion_uno(request):
    try:
        estatus_listado = Estatus.objects.filter(
            nivel_afectacion=1,
            activo=True
        )

        if not estatus_listado.exists():
            return JsonResponse({
                "tipo_aviso": "error",
                "detalles": "No se encontraron estatus con nivel de afectacion uno"
            }, status=404)
        data = [
            {
                "id": f.id,
                "descripcion": f.descripcion,
                "nivel_afectacion": f.nivel_afectacion,
                "comentario": f.comentario,
                "activo": f.activo
            } for f in estatus_listado
        ]

        return JsonResponse(data, safe=False)

    except Exception as error_proceso:
        return JsonResponse({
            "tipo_aviso": "error",
            "detalles": f"Error en el servidor: {str(error_proceso)}"
        }, status=500)

@login_required
def obtener_catalogo_documentos_unificado(request):
    """
    Retorna una lista de descripciones de documentos
    activos de las tablas Paso (PTE) y PasoOT (OT) para modulo de consulta.
    """
    try:
        qs_pte = Paso.objects.filter(activo=True).values('descripcion')
        qs_ot = PasoOt.objects.filter(activo=True).values('descripcion')
        consulta_unificada = qs_pte.union(qs_ot).order_by('descripcion')
        resultados = [
            {
                "id": fila['descripcion'], 
                "descripcion": fila['descripcion']
            } 
            for fila in consulta_unificada
        ]

        return JsonResponse(resultados, safe=False)

    except Exception as e:
        print(f"Error obteniendo catálogo unificado: {str(e)}")
        return JsonResponse([], safe=False)

def fn_ejecutar_query_graficas(payload):
    filtros = payload.get("filtros", {})

    origenes = filtros.get("origenes", [])
    lista_origenes = origenes if origenes else ["PTE", "OT", "PROD"]

    check_entregados = filtros.get("check_entregados")
    check_pendientes = filtros.get("check_no_entregados")

    filtro_entregado = 1 if check_entregados else (1 if not check_entregados and not check_pendientes else 0)
    filtro_no_entregado = 1 if check_pendientes else (1 if not check_entregados and not check_pendientes else 0)

    fecha_ini_input = filtros.get("fecha_inicio")
    fecha_fin_input = filtros.get("fecha_fin")
    filtro_fechas_activo = 1 if (fecha_ini_input and fecha_fin_input) else 0
    texto_busqueda = filtros.get("texto_busqueda", "")

    params = {
        "fecha_ini": fecha_ini_input if fecha_ini_input else "1900-01-01", 
        "fecha_fin": fecha_fin_input if fecha_fin_input else "2100-12-31",
        "lider_id": filtros.get("lider_id") if filtros.get("lider_id") else None,
        "cliente_id": filtros.get("cliente_id") if filtros.get("cliente_id") else None,
        "frente_id": filtros.get("frente_id") if filtros.get("frente_id") else None,
        "id_sitio": filtros.get("id_sitio") if filtros.get("id_sitio") else None,
        "nombre_doc": filtros.get("nombre_documento") if filtros.get("nombre_documento") else None,
        "estatus_proceso_id": filtros.get("estatus_proceso") if filtros.get("estatus_proceso") else None,
        "texto": f"%{texto_busqueda}%",
        "filtro_entregado": filtro_entregado,
        "filtro_no_entregado": filtro_no_entregado,
        "buscar_por_frente": filtros.get("buscar_por_frente") if filtros.get("buscar_por_frente") else "1",
        "tipos_seleccionados": tuple(lista_origenes),
        "filtro_fechas_activo": filtro_fechas_activo
    }

    sql = """
    SELECT
        T.lider,
        T.tipo,
        T.documento,
        T.folio,
        T.frente,
        T.cliente,
        T._fid_estatus_paso AS estatus_paso_id,

        CASE
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_plataforma = %(id_sitio)s::int
                THEN
                    T.sitio_plat_desc
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_embarcacion = %(id_sitio)s::int
                THEN
                    T.sitio_emb_desc
            WHEN
                %(buscar_por_frente)s = '0' AND
                %(id_sitio)s IS NOT NULL AND
                T._fid_patio = %(id_sitio)s::int
            THEN
                T.sitio_pat_desc
            ELSE
                T.sitio_oficial
        END AS sitio,

        CASE
            WHEN T.archivo IS NOT NULL AND LENGTH(TRIM(T.archivo)) > 5
                THEN 1
                ELSE 0
        END AS tiene_archivo

    FROM (
        -- [BLOQUE PTE]
        SELECT
            pd.id AS id_origen,
            'PTE' AS tipo,
            COALESCE(ph.oficio_pte, 'SIN FOLIO') AS folio,
            COALESCE(c.descripcion, 'CLIENTE NO ASIGNADO') AS cliente,
            COALESCE(rp.descripcion, 'SIN LÍDER') AS lider,
            'N/A' AS frente,
            NULL::integer AS id_sitio_oficial,
            'NO APLICA' AS sitio_oficial,
            NULL as sitio_pat_desc,
            NULL as sitio_emb_desc,
            NULL as sitio_plat_desc,
            COALESCE(p.descripcion, 'POR DEFINIR') AS documento,
            COALESCE(pd.archivo, '') AS archivo,
            pd.fecha_entrega AS _fecha_sort,
            pd.estatus_paso_id AS _fid_estatus_paso,
            ph.id_cliente_id AS _fid_cliente,
            ph.id_responsable_proyecto_id AS _fid_lider,
            NULL::bigint AS _fid_frente,
            NULL::integer AS _fid_patio,
            NULL::integer AS _fid_embarcacion,
            NULL::integer AS _fid_plataforma
        FROM
            pte_detalle pd
        INNER JOIN pte_header ph ON
            pd.id_pte_header_id = ph.id
        LEFT JOIN cliente c ON
            ph.id_cliente_id = c.id
        LEFT JOIN responsable_proyecto rp ON
            ph.id_responsable_proyecto_id = rp.id
        LEFT JOIN paso p ON
            pd.id_paso_id = p.id
        WHERE
            ph.estatus != 0

        UNION ALL

        -- [BLOQUE OT]
        SELECT
            od.id AS id_origen,
            'OT' AS tipo,
            COALESCE(o.orden_trabajo, 'SIN OT') AS folio,
            COALESCE(c.descripcion, 'CLIENTE NO ASIGNADO') AS cliente,
            COALESCE(rp.descripcion, 'SIN LÍDER') AS lider,
            COALESCE(f.descripcion, 'SIN FRENTE') AS frente,
            CASE
                WHEN o.id_frente_id = 1
                    THEN o.id_patio
                WHEN o.id_frente_id = 2
                    THEN o.id_embarcacion
                WHEN o.id_frente_id = 4
                    THEN o.id_plataforma
                ELSE NULL
            END AS id_sitio_oficial,
            CASE
                WHEN o.id_frente_id = 1
                    THEN COALESCE(s_pat.descripcion, 'SIN PATIO')
                WHEN o.id_frente_id = 2
                    THEN COALESCE(s_emb.descripcion, 'SIN EMBARCACION')
                WHEN o.id_frente_id = 4
                    THEN COALESCE(s_plat.descripcion, 'SIN PLATAFORMA')
                ELSE 'SIN UBICACIÓN'
            END AS sitio_oficial,
            s_pat.descripcion as sitio_pat_desc,
            s_emb.descripcion as sitio_emb_desc,
            s_plat.descripcion as sitio_plat_desc,
            COALESCE(pot.descripcion, 'POR DEFINIR') AS documento,
            COALESCE(od.archivo, '') AS archivo,
            od.fecha_entrega AS _fecha_sort,
            od.estatus_paso_id AS _fid_estatus_paso,
            o.id_cliente_id AS _fid_cliente,
            o.id_responsable_proyecto_id AS _fid_lider,
            o.id_frente_id AS _fid_frente,
            o.id_patio AS _fid_patio,
            o.id_embarcacion AS _fid_embarcacion,
            o.id_plataforma AS _fid_plataforma
        FROM
            ot_detalle od
        INNER JOIN ot o ON
            od.id_ot_id = o.id
        LEFT JOIN cliente c ON
            o.id_cliente_id = c.id
        LEFT JOIN responsable_proyecto rp ON
            o.id_responsable_proyecto_id = rp.id
        LEFT JOIN frente f ON
            o.id_frente_id = f.id
        LEFT JOIN paso_ot pot ON
            od.id_paso_id = pot.id
        LEFT JOIN sitio s_pat ON
            o.id_patio = s_pat.id
        LEFT JOIN sitio s_emb ON
            o.id_embarcacion
            = s_emb.id
        LEFT JOIN sitio s_plat ON
            o.id_plataforma = s_plat.id
        WHERE
            o.estatus = 1
    ) AS T

    WHERE
        T.tipo IN %(tipos_seleccionados)s AND
        (%(lider_id)s IS NULL OR T._fid_lider = %(lider_id)s) AND
        (%(cliente_id)s IS NULL OR T._fid_cliente = %(cliente_id)s) AND
        (%(nombre_doc)s IS NULL OR T.documento = %(nombre_doc)s) AND
        (T.documento ILIKE %(texto)s OR T.folio ILIKE %(texto)s) AND
        (%(estatus_proceso_id)s IS NULL OR T._fid_estatus_paso = %(estatus_proceso_id)s)

        AND (CASE
            WHEN %(id_sitio)s IS NULL
                THEN (%(frente_id)s IS NULL OR T._fid_frente = %(frente_id)s)
            WHEN %(buscar_por_frente)s = '1'
                THEN
                    (T._fid_frente = %(frente_id)s AND
                    ((%(frente_id)s = 1 AND
                    T._fid_patio = %(id_sitio)s::int) OR (%(frente_id)s = 2 AND
                    T._fid_embarcacion = %(id_sitio)s::int) OR (%(frente_id)s = 4 AND
                    T._fid_plataforma = %(id_sitio)s::int)))
            ELSE
                (T._fid_patio = %(id_sitio)s::int OR
                T._fid_embarcacion = %(id_sitio)s::int OR
                T._fid_plataforma = %(id_sitio)s::int)
        END)

        AND (
            (%(filtro_entregado)s = 1 AND LENGTH(TRIM(T.archivo)) > 5)
            OR
            (%(filtro_no_entregado)s = 1 AND (T.archivo IS NULL OR LENGTH(TRIM(T.archivo)) <= 5))
        )

        AND (
            %(filtro_fechas_activo)s = 0
            OR
            (T._fecha_sort BETWEEN %(fecha_ini)s::date AND %(fecha_fin)s::date)
        )
    """
    return ejecutar_query_sql(sql, params)

@login_required
def fn_api_obtener_dashboard(request):
    """
    Endpoint exclusivo para alimentar las gráficas de ECharts.
    """
    try:
        cuerpo_peticion = json.loads(request.body)
        registros_crudos = fn_ejecutar_query_graficas(cuerpo_peticion)
        datos_agrupados = fn_agrupar_datos_dashboard(registros_crudos)
        return JsonResponse({
            "estatus": "ok",
            "mensaje": "Dashboard calculado correctamente",
            "data": datos_agrupados
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"estatus": "error", "mensaje": "Formato JSON inválido"}, status=400)

    except Exception as error_servidor:
        print(f"Error en dashboard: {str(error_servidor)}")
        return JsonResponse({"estatus": "error", "mensaje": "Falla interna del servidor"}, status=500)

def fn_agrupar_datos_dashboard(registros_db):
    """
    Procesa los registros optimizados de la base de datos en una sola iteración
    para generar los 9 bloques de métricas del dashboard.
    """
    totales = {"cargados": 0, "pendientes": 0}
    origenes = {"PTE": 0, "OT": 0}
    lideres = {}
    documentos = {}
    clientes = {}
    estatus_embudo = {}
    frentes = {}
    sitios = {}
    folios = {}

    for fila in registros_db:

        lider = fila.get("lider", "SIN LÍDER")
        tipo = fila.get("tipo", "DESCONOCIDO")
        documento = fila.get("documento", "SIN DOCUMENTO")
        folio = fila.get("folio", "SIN FOLIO")
        frente = fila.get("frente", "SIN FRENTE")
        sitio = fila.get("sitio", "SIN SITIO")
        cliente = fila.get("cliente", "SIN CLIENTE")
        estatus_id = str(fila.get("estatus_paso_id", "0"))

        valor_archivo = fila.get("tiene_archivo", 0)
        es_cargado = True if valor_archivo == 1 else False

        totales["cargados"] += 1 if es_cargado else 0
        totales["pendientes"] += 0 if es_cargado else 1

        if tipo in origenes:
            origenes[tipo] += 1

        if lider not in lideres:
            lideres[lider] = {"cargados": 0, "pendientes": 0}
        lideres[lider]["cargados"] += 1 if es_cargado else 0
        lideres[lider]["pendientes"] += 0 if es_cargado else 1

        if documento not in documentos:
            documentos[documento] = {"cargados": 0, "pendientes": 0}
        documentos[documento]["cargados"] += 1 if es_cargado else 0
        documentos[documento]["pendientes"] += 0 if es_cargado else 1

        if cliente not in clientes:
            clientes[cliente] = {"cargados": 0, "pendientes": 0}
        clientes[cliente]["cargados"] += 1 if es_cargado else 0
        clientes[cliente]["pendientes"] += 0 if es_cargado else 1

        llave_estatus = f"Estatus {estatus_id}"

        if llave_estatus not in estatus_embudo:
            estatus_embudo[llave_estatus] = 0
        estatus_embudo[llave_estatus] += 1

        if tipo == "OT":
            if frente not in frentes:
                frentes[frente] = 0
            frentes[frente] += 1

            if sitio not in sitios:
                sitios[sitio] = 0
            sitios[sitio] += 1

        aplica_para_avance = False if documento == "NO APLICA" else True

        if aplica_para_avance:
            if folio not in folios:
                folios[folio] = {"cargados": 0, "pendientes": 0}
            folios[folio]["cargados"] += 1 if es_cargado else 0
            folios[folio]["pendientes"] += 0 if es_cargado else 1

    datos_procesados = {
        "totales_generales": totales,
        "distribucion_origenes": [{"origen": llave, "total": valor} for llave, valor in origenes.items()],
        "rendimiento_lideres": [{"nombre": llave, "cargados": valor["cargados"], "pendientes": valor["pendientes"]} for llave, valor in lideres.items()],
        "tipos_documentos": [{"documento": llave, "cargados": valor["cargados"], "pendientes": valor["pendientes"]} for llave, valor in documentos.items()],
        "estatus_clientes": [{"cliente": llave, "cargados": valor["cargados"], "pendientes": valor["pendientes"]} for llave, valor in clientes.items()],
        "embudo_estatus": [{"estatus": llave, "total": valor} for llave, valor in estatus_embudo.items()],
        "frentes_ot": [{"frente": llave, "total": valor} for llave, valor in frentes.items()],
        "sitios_ot": [{"sitio": llave, "total": valor} for llave, valor in sitios.items()],
        "avance_folios": [{"folio": llave, "cargados": valor["cargados"], "pendientes": valor["pendientes"]} for llave, valor in folios.items()]
    }

    return datos_procesados