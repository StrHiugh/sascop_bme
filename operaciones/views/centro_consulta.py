from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from core.utils import ejecutar_query_sql
from ..models import *
import json

def fn_centro_consulta(request):
    """
    Vista principal para el dashboard de Business Intelligence (BI).
    Renderiza el template estático inicialmente.
    """
    context = {}
    return render(request, 'operaciones/centro_consulta/centro_consulta.html', context)



@csrf_exempt
@require_http_methods(["POST"])

def fn_api_busqueda_global(request):
    """
    Endpoint API para el Buscador Global BI.
    Recibe: JSON con { "origenes": [...], "filtros": {...} }
    Retorna: JSON con lista unificada de resultados.
    """
    try:
        payload = json.loads(request.body)
        resultados = fn_ejecutar_busqueda_global(payload)
        return JsonResponse({
            "estatus": "ok",
            "mensaje": "Búsqueda ejecutada correctamente",
            "data": resultados,
            "total": len(resultados)
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"estatus": "error", "mensaje": "JSON inválido"}, status=400)
    except Exception as e:
        print(f"Error en Buscador: {str(e)}")
        return JsonResponse({"estatus": "error", "mensaje": str(e)}, status=500)

def fn_ejecutar_busqueda_global(payload):
    """
    Orquestador de Búsqueda BI.
    Recibe los filtros del frontend y ejecuta la consulta unificada.
    """
    filtros = payload.get("filtros", {})

    # 1. Procesar lista de orígenes (PTE, OT, PROD)
    origenes = filtros.get('origenes', [])
    if not origenes:
        origenes = ['PTE', 'OT', 'PROD']

    # 2. Validación de Estatus de Entrega (Entregado vs Pendiente)
    check_entregados = filtros.get('check_entregados')
    check_pendientes = filtros.get('check_no_entregados')

    if not check_entregados and not check_pendientes:
        filtro_entregado = 1
        filtro_no_entregado = 1
    else:
        filtro_entregado = 1 if check_entregados else 0
        filtro_no_entregado = 1 if check_pendientes else 0

    # 3. Parámetros SQL
    params = {
        'fecha_ini': filtros.get('fecha_inicio') or '1900-01-01', 
        'fecha_fin': filtros.get('fecha_fin') or '2100-12-31',
        'lider_id': filtros.get('lider_id') or None,
        'cliente_id': filtros.get('cliente_id') or None,
        'frente_id': filtros.get('frente_id') or None,
        'id_sitio': filtros.get('id_sitio') or None,
        'nombre_doc': filtros.get('nombre_documento') or None,
        'estatus_proceso_id': filtros.get('estatus_proceso') or None,
        'texto': f"%{filtros.get('texto_busqueda', '')}%",
        'filtro_entregado': filtro_entregado,
        'filtro_no_entregado': filtro_no_entregado,
        'buscar_por_frente': filtros.get('buscar_por_frente') or '1',
        'tipos_seleccionados': tuple(origenes)
    }

    # =========================================================================
    # QUERY MAESTRA
    # =========================================================================
    sql = """
    SELECT
        T.id_origen,
        T.tipo,
        T.folio,
        T.cliente,
        T.lider,
        T.frente,
        T._fid_estatus_paso AS estatus_paso_id,

        -- LÓGICA DE VISUALIZACIÓN DE SITIO (Agnóstica vs Jerárquica)
        CASE
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_plataforma = %(id_sitio)s::int THEN T._fid_plataforma
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_embarcacion = %(id_sitio)s::int THEN T._fid_embarcacion
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_patio = %(id_sitio)s::int       THEN T._fid_patio
            ELSE T.id_sitio_oficial
        END AS id_sitio,

        CASE 
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_plataforma = %(id_sitio)s::int THEN T.sitio_plat_desc
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_embarcacion = %(id_sitio)s::int THEN T.sitio_emb_desc
            WHEN %(buscar_por_frente)s = '0' AND %(id_sitio)s IS NOT NULL AND T._fid_patio = %(id_sitio)s::int       THEN T.sitio_pat_desc
            ELSE T.sitio_oficial
        END AS sitio,

        T.documento,
        T.fecha,
        T.archivo

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
            NULL as sitio_pat_desc, NULL as sitio_emb_desc, NULL as sitio_plat_desc,
            COALESCE(p.descripcion, 'POR DEFINIR') AS documento,
            CASE WHEN pd.fecha_entrega IS NULL THEN 'NO ENTREGADO' ELSE TO_CHAR(pd.fecha_entrega, 'DD/MM/YYYY') END AS fecha,
            CASE WHEN pd.archivo IS NULL OR pd.archivo = '' THEN 'Sin archivo' ELSE pd.archivo END AS archivo,

            -- CAMPOS DE FILTRADO INTERNO
            pd.fecha_entrega AS _fecha_sort,
            pd.estatus_paso_id AS _fid_estatus_paso,  -- <--- IMPORTANTE: Estatus del paso PTE
            ph.id_cliente_id AS _fid_cliente,
            ph.id_responsable_proyecto_id AS _fid_lider,
            NULL::bigint AS _fid_frente,
            NULL::integer AS _fid_patio, NULL::integer AS _fid_embarcacion, NULL::integer AS _fid_plataforma

        FROM pte_detalle pd
        INNER JOIN pte_header ph ON pd.id_pte_header_id = ph.id
        LEFT JOIN cliente c ON ph.id_cliente_id = c.id
        LEFT JOIN responsable_proyecto rp ON ph.id_responsable_proyecto_id = rp.id
        LEFT JOIN paso p ON pd.id_paso_id = p.id

        -- SOLO PTEs ACTIVAS
        WHERE ph.estatus = 1

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
                WHEN o.id_frente_id = 1 THEN o.id_patio
                WHEN o.id_frente_id = 2 THEN o.id_embarcacion
                WHEN o.id_frente_id = 4 THEN o.id_plataforma
                ELSE NULL
            END AS id_sitio_oficial,
            CASE
                WHEN o.id_frente_id = 1 THEN COALESCE(s_pat.descripcion, 'SIN PATIO')
                WHEN o.id_frente_id = 2 THEN COALESCE(s_emb.descripcion, 'SIN EMBARCACION')
                WHEN o.id_frente_id = 4 THEN COALESCE(s_plat.descripcion, 'SIN PLATAFORMA')
                ELSE 'SIN UBICACIÓN'
            END AS sitio_oficial,
            s_pat.descripcion as sitio_pat_desc,
            s_emb.descripcion as sitio_emb_desc,
            s_plat.descripcion as sitio_plat_desc,
            COALESCE(pot.descripcion, 'POR DEFINIR') AS documento,
            CASE WHEN od.fecha_entrega IS NULL THEN 'NO ENTREGADO' ELSE TO_CHAR(od.fecha_entrega, 'DD/MM/YYYY') END AS fecha,
            CASE WHEN od.archivo IS NULL OR od.archivo = '' THEN 'Sin archivo' ELSE od.archivo END AS archivo,

            -- CAMPOS DE FILTRADO INTERNO
            od.fecha_entrega AS _fecha_sort,
            od.estatus_paso_id AS _fid_estatus_paso,
            o.id_cliente_id AS _fid_cliente,
            o.id_responsable_proyecto_id AS _fid_lider,
            o.id_frente_id AS _fid_frente,
            o.id_patio AS _fid_patio, o.id_embarcacion AS _fid_embarcacion, o.id_plataforma AS _fid_plataforma

        FROM ot_detalle od
        INNER JOIN ot o ON od.id_ot_id = o.id
        LEFT JOIN cliente c ON o.id_cliente_id = c.id
        LEFT JOIN responsable_proyecto rp ON o.id_responsable_proyecto_id = rp.id
        LEFT JOIN frente f ON o.id_frente_id = f.id
        LEFT JOIN paso_ot pot ON od.id_paso_id = pot.id
        LEFT JOIN sitio s_pat ON o.id_patio = s_pat.id
        LEFT JOIN sitio s_emb ON o.id_embarcacion = s_emb.id
        LEFT JOIN sitio s_plat ON o.id_plataforma = s_plat.id
        -- SOLO OTs ACTIVAS Y PASOS VALIDOS (NO CANCELADOS/NA)
        WHERE o.estatus = 1
    ) AS T

    WHERE
        T.tipo IN %(tipos_seleccionados)s
        AND (%(lider_id)s IS NULL OR T._fid_lider = %(lider_id)s)
        AND (%(cliente_id)s IS NULL OR T._fid_cliente = %(cliente_id)s)
        AND (%(nombre_doc)s IS NULL OR T.documento = %(nombre_doc)s)
        AND (T.documento ILIKE %(texto)s OR T.folio ILIKE %(texto)s)
        AND (%(estatus_proceso_id)s IS NULL OR T._fid_estatus_paso = %(estatus_proceso_id)s)

        -- LÓGICA DE SITIOS
        AND (CASE
            WHEN %(id_sitio)s IS NULL THEN
                (%(frente_id)s IS NULL OR T._fid_frente = %(frente_id)s)
            WHEN %(buscar_por_frente)s = '1' THEN
                (T._fid_frente = %(frente_id)s AND (
                    (%(frente_id)s = 1 AND T._fid_patio = %(id_sitio)s::int) OR
                    (%(frente_id)s = 2 AND T._fid_embarcacion = %(id_sitio)s::int) OR
                    (%(frente_id)s = 4 AND T._fid_plataforma = %(id_sitio)s::int)
                ))
            ELSE
                (T._fid_patio = %(id_sitio)s::int OR T._fid_embarcacion = %(id_sitio)s::int OR T._fid_plataforma = %(id_sitio)s::int)
        END)

        -- ESTATUS ENTREGA
        AND (
            (%(filtro_entregado)s = 1 AND T._fecha_sort BETWEEN %(fecha_ini)s::date AND %(fecha_fin)s::date)
            OR
            (%(filtro_no_entregado)s = 1 AND T._fecha_sort IS NULL)
        )

    ORDER BY T._fecha_sort ASC NULLS LAST;
    """
    return ejecutar_query_sql(sql, params)

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
