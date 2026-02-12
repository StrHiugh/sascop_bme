import os
import io
import textwrap
import math
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.ticker as ticker
import numpy as np
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from email.mime.image import MIMEImage

from django.db.models import Count, Case, When, Value, CharField
from django.db.models.functions import Concat
from django.db import connection

# Imports para PDF
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as ImageRL, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib import colors
from scipy.interpolate import make_interp_spline
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as ImageRL, PageBreak, KeepTogether, Table, TableStyle

from operaciones.models import RegistroActividad

# Configuración del Backend de Matplotlib
plt.switch_backend("Agg")

# Configuración global de estilos
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
plt.rcParams["axes.titleweight"] = "bold"
plt.rcParams["axes.titlecolor"] = "#2c3e50"
plt.rcParams["axes.labelcolor"] = "#555555"
plt.rcParams["axes.edgecolor"] = "#dcdcdc"
plt.rcParams["grid.color"] = "#eaeaea"

# Colores globales
COLOR_CARGADOS = "#00a65a"
COLOR_NULOS = "#dd4b39"
COLOR_TEXTO_BLANCO = "#ffffff"


# ==========================================
#   HELPERS Y CONSULTAS SQL
# ==========================================

def fn_obtener_color_texto(hex_color):
   """Calcula si el texto debe ser blanco o negro según el fondo."""
   rgb = mcolors.hex2color(hex_color)
   luminancia = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]

   return "black" if luminancia > 0.5 else "white"

def ejecutar_query_sql(query, params=None, retornar_dict=True):
   with connection.cursor() as cursor:
      cursor.execute(query, params or ())
      if retornar_dict:
         columns = [col[0] for col in cursor.description]
         return [dict(zip(columns, row)) for row in cursor.fetchall()]
      else:
         return cursor.fetchall()

def fn_obtener_resumen_actividad_por_usuario(fecha_inicio, fecha_fin):
   sql = """
      WITH resumen_totales AS (
         SELECT
            usuario_id_id,
            COUNT(*) AS actividad_total
         FROM
            registro_actividad
         WHERE
            fecha >= '2026-02-02 00:00:00+00' AND
            fecha < '2026-02-11 23:59:59+00'
         GROUP BY
            usuario_id_id
         ORDER BY
            actividad_total DESC
         LIMIT 10
      )
      SELECT
         ra.usuario_id_id,
         COUNT(*) AS total_por_modulo,
         ra.tabla_log,
         CONCAT_WS(' ', au.first_name, au.last_name) AS nombre_usuario,
         CASE
            WHEN ra.tabla_log = 0 THEN 'PTE HEADER'
            WHEN ra.tabla_log = 1 THEN 'PTE DETALLE'
            WHEN ra.tabla_log = 4 THEN 'OT HEADER'
            WHEN ra.tabla_log = 5 THEN 'OT DETALLE'
            ELSE 'OTRO'
         END AS nombre_modulo
      FROM
         registro_actividad ra
      INNER JOIN auth_user au ON
         ra.usuario_id_id = au.id
      WHERE
         ra.usuario_id_id IN (
            SELECT
               usuario_id_id
            FROM
               resumen_totales
         ) AND
         ra.fecha >= '2026-02-02 00:00:00+00' AND
         ra.fecha < '2026-02-11 23:59:59+00'
      GROUP BY
         ra.usuario_id_id,
         ra.tabla_log,
         au.first_name,
         au.last_name
      ORDER BY (
         SELECT
            actividad_total
         FROM
            resumen_totales
         WHERE
            resumen_totales.usuario_id_id = ra.usuario_id_id
      ) DESC, total_por_modulo DESC;
   """
   return ejecutar_query_sql(sql)

def fn_obtener_resumen_pasos_cargados():
   sql = """
      SELECT
         COUNT(pte_detalle.archivo) AS archivos_cargados,
         COUNT(*) FILTER (WHERE pte_detalle.archivo IS NULL) AS archivos_nulos,
         COUNT(*) AS total_registros,
         pte_header.id_responsable_proyecto_id,
         CONCAT_WS(' ', responsable_proyecto.descripcion) AS nombre_usuario
      FROM
         pte_detalle
      INNER JOIN pte_header ON
         pte_header.id = id_pte_header_id
      INNER JOIN responsable_proyecto ON
         pte_header.id_responsable_proyecto_id = responsable_proyecto.id
      WHERE
         pte_detalle.estatus_paso_id != 14 AND pte_header.estatus !=0
      GROUP BY
         responsable_proyecto.id, pte_header.id_responsable_proyecto_id, nombre_usuario
      ORDER BY
         archivos_cargados DESC;
   """
   return ejecutar_query_sql(sql)

def fn_obtener_resumen_ot_pasos_cargados():
   sql = """
      SELECT
         COUNT(ot_detalle.archivo) AS archivos_cargados,
         COUNT(*) FILTER (WHERE ot_detalle.archivo IS NULL) AS archivos_nulos,
         COUNT(*) AS total_registros,
         ot.id_responsable_proyecto_id,
         CONCAT_WS(' ', responsable_proyecto.descripcion) AS nombre_usuario
      FROM
         ot_detalle
      INNER JOIN ot ON
         ot.id = id_ot_id
      INNER JOIN responsable_proyecto ON
         ot.id_responsable_proyecto_id = responsable_proyecto.id
      WHERE
         ot_detalle.estatus_paso_id != 14 AND ot.estatus !=0
      GROUP BY
         responsable_proyecto.id, ot.id_responsable_proyecto_id, nombre_usuario
      ORDER BY
         archivos_cargados DESC;
   """
   return ejecutar_query_sql(sql)


# ==========================================
#  GENERACIÓN DE GRÁFICAS
# ==========================================

def fn_generar_grafica_buffer(datos_queryset):
   datos_organizados = {}
   tipos_de_registro = set()

   for fila in datos_queryset:
      usuario = fila["nombre_usuario"]
      tipo = fila["nombre_modulo"]
      cantidad = fila["total_por_modulo"]
      if usuario not in datos_organizados:
         datos_organizados[usuario] = {}

      datos_organizados[usuario][tipo] = cantidad
      tipos_de_registro.add(tipo)

   lista_usuarios = list(datos_organizados.keys())
   lista_tipos = sorted(list(tipos_de_registro))
   nombres_ajustados = [textwrap.fill(nombre, width=15) for nombre in lista_usuarios]
   fig, ax = plt.subplots(figsize=(11, 5))
   acumulado_altura = [0] * len(lista_usuarios)
   colores = ["#2E86C1", "#E67E22", "#27AE60", "#8E44AD", "#C0392B"]

   for i, tipo in enumerate(lista_tipos):
      valores = [datos_organizados[u].get(tipo, 0) for u in lista_usuarios]
      ax.bar(range(len(lista_usuarios)), valores, bottom=acumulado_altura,
         label=tipo, color=colores[i % len(colores)], width=0.6)
      acumulado_altura = [s + v for s, v in zip(acumulado_altura, valores)]

   max_y_real = max(acumulado_altura) if acumulado_altura else 100
   for i, total in enumerate(acumulado_altura):
      if total > 0:
         ax.text(
            i,
            total + (max_y_real * 0.02),
            f"{total:,}",
            ha="center",
            va="bottom",
            fontsize=9,
            fontweight="bold",
            color="#333333"
         )

   ax.get_yaxis().set_major_formatter(ticker.StrMethodFormatter('{x:,.0f}'))

   ax.set_title("Resumen de Actividad por usuario", pad=25, fontsize=13)
   ax.legend(loc="upper right", fontsize=8, frameon=False)
   ax.set_xticks(range(len(lista_usuarios)))
   ax.set_xticklabels(nombres_ajustados, fontsize=8)
   for s in ["top", "right"]: ax.spines[s].set_visible(False)
   ax.yaxis.grid(True, linestyle="--", alpha=0.3)
   ax.set_ylim(0, max_y_real * 1.2)

   plt.tight_layout()
   buffer = io.BytesIO()
   plt.savefig(buffer, format="png", dpi=120)
   buffer.seek(0)
   plt.close(fig)
   return buffer

def fn_crear_grafica_carga_archivos_pasos(nombres, cargados, nulos, titulo_grafica, porcentaje_fijo, mostrar_avance=False):
   totales = [c + n for c, n in zip(cargados, nulos)]
   COLOR_AZUL_BARRAS = "#4fc3f7"
   COLOR_VERDE_LINEA = "#8bc34a"
   COLOR_VERDE_AREA = "#f1f8e9"

   fig, ax = plt.subplots(figsize=(11, 5.5))
   x = np.arange(len(nombres))

   if len(x) > 3:
      x_smooth = np.linspace(x.min(), x.max(), 300)
      spl = make_interp_spline(x, totales, k=3)
      y_smooth = np.maximum(spl(x_smooth), 0)
   else:
      x_smooth, y_smooth = x, totales

   ax.fill_between(x_smooth, y_smooth, color=COLOR_VERDE_AREA, alpha=0.6, zorder=1)
   ax.plot(x_smooth, y_smooth, color=COLOR_VERDE_LINEA, linewidth=2, zorder=2)
   ax.bar(x, cargados, color=COLOR_AZUL_BARRAS, width=0.6, zorder=3)

   ax.get_yaxis().set_major_formatter(ticker.StrMethodFormatter('{x:,.0f}'))

   max_val = max(totales) if totales else 1

   for i, (v_cargado, v_total) in enumerate(zip(cargados, totales)):
      ax.text(i, v_total + (max_val * 0.02), f"{v_total:,}", ha="center", va="bottom", fontsize=8, color="#555")
      ax.text(i, v_cargado + (max_val * 0.01), f"{v_cargado:,}", ha="center", va="bottom", fontsize=8, color="#333", fontweight="bold")

   if mostrar_avance:
      texto_box = f"{porcentaje_fijo:.2f}%\n% Avance Operativo"
      ax.text(0.98, 0.85, texto_box, transform=ax.transAxes, fontsize=13,
         fontweight="bold", ha="right", va="top",
         bbox=dict(facecolor="white", edgecolor="#dddddd", boxstyle="round,pad=0.6"))

   ax.set_title(f"PROGRESO DE CARGA HISTÓRICA\n{titulo_grafica}", pad=25, fontsize=12)
   ax.set_xticks(x)
   ax.set_xticklabels(nombres, fontsize=8)
   ax.yaxis.grid(True, linestyle="--", alpha=0.3)
   for spine in ["top", "right", "left"]: ax.spines[spine].set_visible(False)

   plt.tight_layout()
   buffer = io.BytesIO()
   plt.savefig(buffer, format="png", dpi=110)
   buffer.seek(0)
   plt.close(fig)
   return buffer

def fn_agregar_seccion_pdf(elementos, estilos, datos, titulo_seccion):
   estilo_encabezado = ParagraphStyle("EncabezadoSeccion", parent=estilos["Heading2"], fontSize=14, textColor=colors.HexColor("#2c3e50"), spaceBefore=15, spaceAfter=10)
   elementos.append(Paragraph(titulo_seccion, estilo_encabezado))
   elementos.append(Spacer(1, 5))

   total_cargados_sec = sum(fila["archivos_cargados"] for fila in datos)
   total_nulos_sec = sum(fila["archivos_nulos"] for fila in datos)
   total_universo_sec = total_cargados_sec + total_nulos_sec
   porcentaje_global_sec = (total_cargados_sec / total_universo_sec * 100) if total_universo_sec > 0 else 0

   nombres = [textwrap.fill(fila["nombre_usuario"], width=10) for fila in datos]
   cargados = [fila["archivos_cargados"] for fila in datos]
   nulos = [fila["archivos_nulos"] for fila in datos]

   if not nombres:
      elementos.append(Paragraph("No hay registros en este periodo.", estilos["Normal"]))
      return

   tamano_lote = 10

   for i in range(0, len(nombres), tamano_lote):
      l_nombres = nombres[i : i + tamano_lote]
      l_cargados = cargados[i : i + tamano_lote]
      l_nulos = nulos[i : i + tamano_lote]

      pagina_actual = (i // tamano_lote) + 1
      subtitulo = f"Detalle por Usuario (Parte {pagina_actual}/{math.ceil(len(nombres)/tamano_lote)})"

      buffer_img = fn_crear_grafica_carga_archivos_pasos(l_nombres, l_cargados, l_nulos, subtitulo, porcentaje_global_sec, mostrar_avance=(i == 0))
      elementos.append(KeepTogether([ImageRL(buffer_img, width=540, height=270), Spacer(1, 15)]))

   data_resumen = [
      ["Descripción", "Cargados", "Pendientes", "Total"],
      ["Totales de Sección", f"{total_cargados_sec:,}", f"{total_nulos_sec:,}", f"{total_universo_sec:,}"]
   ]

   tabla_resumen = Table(data_resumen, colWidths=[300, 80, 80, 80])
   tabla_resumen.setStyle(TableStyle([
      ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86C1")),
      ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
      ("ALIGN", (0, 0), (0, -1), "LEFT"),
      ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
      ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
      ("FONTSIZE", (0, 0), (-1, -1), 9),
      ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
      ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
      ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
      ("TOPPADDING", (0, 0), (-1, -1), 4),
   ]))

   elementos.append(KeepTogether([Spacer(1, 10), Paragraph(f"<b>Resumen {titulo_seccion}:</b>", estilos["Normal"]), Spacer(1, 5), tabla_resumen, Spacer(1, 15)]))

def fn_generar_pdf_reporte(
   imagen_actividad_buffer,
   texto_periodo,
   datos_queryset
):
   buffer_pdf = io.BytesIO()
   doc = SimpleDocTemplate(
      buffer_pdf,
      pagesize=letter,
      rightMargin=30,
      leftMargin=30,
      topMargin=30,
      bottomMargin=50
   )
   estilos = getSampleStyleSheet()
   elementos = []

   estilo_titulo = ParagraphStyle(
      "TituloPrincipal",
      parent=estilos["Heading1"],
      fontSize=20,
      textColor=colors.HexColor("#2E86C1"),
      alignment=TA_CENTER,
      spaceAfter=2
   )

   estilo_periodo = ParagraphStyle(
      "SubtituloPeriodo",
      parent=estilos["Normal"],
      fontSize=11,
      textColor=colors.HexColor("#555555"),
      alignment=TA_CENTER,
      spaceAfter=20
   )
   estilo_footer = ParagraphStyle(
      "FooterSascop",
      parent=estilos["Normal"],
      fontSize=8,
      textColor=colors.gray,
      alignment=TA_RIGHT
   )

   elementos.append(Paragraph("Informe de Operaciones Semanal", estilo_titulo))
   elementos.append(Paragraph(f"Periodo de actividades: <b>{texto_periodo}</b>", estilo_periodo))

   if imagen_actividad_buffer:
      elementos.append(
         ImageRL(
            imagen_actividad_buffer,
            width=540,
            height=270
         )
      )

   elementos.append(Spacer(1, 10))

   usuarios = list(dict.fromkeys([f["nombre_usuario"] for f in datos_queryset]))
   modulos = list(dict.fromkeys([f["nombre_modulo"] for f in datos_queryset]))

   headers = ["Nombre del Usuario"] + modulos
   data_tabla = [headers]

   for u in usuarios:
      fila = [u]
      for m in modulos:
         valor = next(
            (item["total_por_modulo"] for item in datos_queryset if item["nombre_usuario"] == u and item["nombre_modulo"] == m), 
            0
         )
         fila.append(f"{valor:,}")
      data_tabla.append(fila)

   ancho_nombre = 200
   ancho_restante = (540 - ancho_nombre) / len(modulos)
   col_widths = [ancho_nombre] + [ancho_restante] * len(modulos)

   tabla_act = Table(
      data_tabla,
      colWidths=col_widths
   )

   tabla_act.setStyle(
      TableStyle([
         ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86C1")),
         ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
         ("ALIGN", (0, 0), (0, -1), "LEFT"),
         ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
         ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
         ("FONTSIZE", (0, 0), (-1, -1), 8),
         ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
         ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
         ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
         ("TOPPADDING", (0, 0), (-1, -1), 4)
      ])
   )

   elementos.append(Paragraph("<b>Detalle de Interacciones por Módulo:</b>", estilos["Normal"]))
   elementos.append(Spacer(1, 10))
   elementos.append(tabla_act)

   elementos.append(PageBreak())
   fn_agregar_seccion_pdf(
      elementos,
      estilos,
      fn_obtener_resumen_pasos_cargados(),
      "Avance de carga de Archivos en PTEs"
   )

   elementos.append(PageBreak())
   fn_agregar_seccion_pdf(
      elementos,
      estilos,
      fn_obtener_resumen_ot_pasos_cargados(),
      "Avance de carga de Archivos en OTs"
   )

   elementos.append(Spacer(1, 40))
   elementos.append(Paragraph("Generado por Sistema SASCOP", estilo_footer))

   doc.build(elementos)
   return buffer_pdf.getvalue()

def fn_enviar_correo_template(
   asunto,
   ruta_template,
   contexto,
   lista_destinatarios,
   archivo_adjunto=None
):
   try:
      if not lista_destinatarios: return False

      mensaje_html = render_to_string(ruta_template, contexto)
      mensaje_plano = strip_tags(mensaje_html)
      origen = settings.DEFAULT_FROM_EMAIL

      email = EmailMultiAlternatives(
         subject=asunto,
         body=mensaje_plano,
         from_email=origen,
         to=lista_destinatarios
      )
      email.attach_alternative(mensaje_html, "text/html")
      email.mixed_subtype = 'related'
      ruta_logo_bme = os.path.join(
         settings.BASE_DIR,
         'operaciones',
         'static',
         'operaciones',
         'images',
         'logo_bmesubtec.png'
      )

      if os.path.exists(ruta_logo_bme):
         with open(ruta_logo_bme, 'rb') as f:
            img1 = MIMEImage(f.read())
            img1.add_header('Content-ID', '<logo_bme>')
            img1.add_header(
               'Content-Disposition',
               'inline',
               filename='logo_bmesubtec.png'
            )
            email.attach(img1)

      ruta_logo_sascop = os.path.join(
         settings.BASE_DIR,
         'operaciones',
         'static',
         'operaciones',
         'images',
         'SASCOP_LOGO.png'
      )

      if os.path.exists(ruta_logo_sascop):
         with open(ruta_logo_sascop, 'rb') as f:
            img2 = MIMEImage(f.read())
            img2.add_header('Content-ID', '<logo_sascop>')
            img2.add_header(
               'Content-Disposition',
               'inline',
               filename='SASCOP_LOGO.png'
            )
            email.attach(img2)

      if archivo_adjunto:
         nombre, contenido, mime = archivo_adjunto
         email.attach(nombre, contenido, mime)

      email.send(fail_silently=False)
      return True

   except Exception as error:
      print(f"Error enviando correo: {error}")
      return False

def fn_enviar_correo_template(
   asunto,
   ruta_template,
   contexto,
   lista_destinatarios,
   archivo_adjunto=None
):
   try:
      if not lista_destinatarios: return False

      mensaje_html = render_to_string(ruta_template, contexto)
      mensaje_plano = strip_tags(mensaje_html)
      origen = settings.DEFAULT_FROM_EMAIL

      email = EmailMultiAlternatives(
         subject=asunto,
         body=mensaje_plano,
         from_email=origen,
         to=lista_destinatarios
      )
      email.attach_alternative(mensaje_html, "text/html")
      email.mixed_subtype = 'related'
      ruta_logo_bme = os.path.join(
         settings.BASE_DIR,
         'operaciones',
         'static',
         'operaciones',
         'images',
         'logo_bmesubtec.png'
      )

      if os.path.exists(ruta_logo_bme):
         with open(ruta_logo_bme, 'rb') as f:
            img1 = MIMEImage(f.read())
            img1.add_header('Content-ID', '<logo_bme>')
            img1.add_header(
               'Content-Disposition',
               'inline',
               filename='logo_bmesubtec.png'
            )
            email.attach(img1)

      ruta_logo_sascop = os.path.join(
         settings.BASE_DIR,
         'operaciones',
         'static',
         'operaciones',
         'images',
         'SASCOP_LOGO.png'
      )

      if os.path.exists(ruta_logo_sascop):
         with open(ruta_logo_sascop, 'rb') as f:
            img2 = MIMEImage(f.read())
            img2.add_header('Content-ID', '<logo_sascop>')
            img2.add_header(
               'Content-Disposition',
               'inline',
               filename='SASCOP_LOGO.png'
            )
            email.attach(img2)

      if archivo_adjunto:
         nombre, contenido, mime = archivo_adjunto
         email.attach(nombre, contenido, mime)

      email.send(fail_silently=False)
      return True

   except Exception as error:
      print(f"Error enviando correo: {error}")
      return False