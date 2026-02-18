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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as ImageRL, PageBreak, KeepTogether, Table, TableStyle, CondPageBreak

# Configuración del Backend de Matplotlib
plt.switch_backend("Agg")

# Colores Institucionales
COLOR_FUERZA = "#f05523"
COLOR_SERIEDAD = "#20145f"
COLOR_CONFIANZA = "#51c2eb"
COLOR_DINAMISMO = "#fad91f"
COLOR_SOLIDEZ = "#54565a"

PALETA_SASCOP = [COLOR_FUERZA, COLOR_SOLIDEZ, COLOR_DINAMISMO, COLOR_CONFIANZA, COLOR_SERIEDAD]

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
            fecha >= %s AND
            fecha <= %s
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
            WHEN ra.tabla_log = 0 THEN 'Cabecera PTE'
            WHEN ra.tabla_log = 1 THEN 'Pasos PTE'
            WHEN ra.tabla_log = 4 THEN 'Cabecera OT'
            WHEN ra.tabla_log = 5 THEN 'Pasos OT'
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
         ra.fecha >= %s AND
         ra.fecha <= %s
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

   params = [fecha_inicio, fecha_fin, fecha_inicio, fecha_fin]
   return ejecutar_query_sql(sql, params)

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
         'logo_black_white_subtec.jpg'
      )

      if os.path.exists(ruta_logo_bme):
         with open(ruta_logo_bme, 'rb') as f:
            img1 = MIMEImage(f.read())
            img1.add_header('Content-ID', '<logo_bme>')
            img1.add_header(
               'Content-Disposition',
               'inline',
               filename='logo_black_white_subtec.jpg'
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
         'logo_black_white_subtec.jpg'
      )

      if os.path.exists(ruta_logo_bme):
         with open(ruta_logo_bme, 'rb') as f:
            img1 = MIMEImage(f.read())
            img1.add_header('Content-ID', '<logo_bme>')
            img1.add_header(
               'Content-Disposition',
               'inline',
               filename='logo_black_white_subtec.jpg'
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

def fn_dibujar_elementos_fijos(canvas, doc):
   """Dibuja el encabezado y pie de página institucional."""
   canvas.saveState()
   ancho, alto = letter

   canvas.setStrokeColor(colors.HexColor(COLOR_SERIEDAD))
   canvas.setLineWidth(1)
   canvas.line(50, 80, ancho - 50, 80)

   canvas.setFillColor(colors.HexColor(COLOR_SERIEDAD))
   canvas.setFont("Helvetica", 8)
   direccion = "Calle 1 Sur, Lote 1-B, Puerto de Isla del Carmen, Patio GARZPROM 2, Cd. Del Carmen, Campeche. Tel. +52 (938) 286 1241"
   canvas.drawCentredString(ancho / 2, 68, direccion)

   canvas.setFont("Helvetica-Bold", 9)
   canvas.drawCentredString(ancho / 2, 55, "www.bluemarine.com.mx")

   canvas.setFont("Helvetica-Oblique", 7)
   canvas.setFillColor(colors.gray)
   canvas.drawRightString(ancho - 50, 35, f"Generado automáticamente por SASCOP | Página {doc.page}")

   canvas.restoreState()

def fn_generar_grafica_buffer(datos_queryset):
   """Genera la gráfica de Resumen de Actividades por usuario."""
   datos_organizados = {}
   tipos_registro = set()

   mapeo_colores = {
      "Pasos PTE": COLOR_FUERZA,
      "Pasos OT": COLOR_SOLIDEZ,
      "Cabecera PTE": COLOR_CONFIANZA,
      "Cabecera OT": COLOR_DINAMISMO
   }

   for fila in datos_queryset:
      usuario = fila["nombre_usuario"]
      tipo = fila["nombre_modulo"]
      cantidad = fila["total_por_modulo"]
      if usuario not in datos_organizados:
         datos_organizados[usuario] = {}

      datos_organizados[usuario][tipo] = cantidad
      tipos_registro.add(tipo)

   lista_usuarios = list(datos_organizados.keys())
   lista_tipos = sorted(list(tipos_registro))
   nombres_ajustados = [textwrap.fill(nombre, width=15) for nombre in lista_usuarios]

   fig, ax = plt.subplots(figsize=(11, 5))
   acumulado_altura = [0] * len(lista_usuarios)

   for tipo in lista_tipos:
      valores = [datos_organizados[u].get(tipo, 0) for u in lista_usuarios]

      color_segmento = mapeo_colores.get(tipo, COLOR_SOLIDEZ)

      ax.bar(range(len(lista_usuarios)), valores, bottom=acumulado_altura,
         label=tipo, color=color_segmento, width=0.6)

      acumulado_altura = [s + v for s, v in zip(acumulado_altura, valores)]

   max_y = max(acumulado_altura) if acumulado_altura else 100
   ax.get_yaxis().set_major_formatter(ticker.StrMethodFormatter("{x:,.0f}"))

   ax.set_title("Resumen de Actividad por Usuario", pad=25, fontsize=12, color=COLOR_SERIEDAD, fontweight="bold")
   ax.legend(loc="upper right", fontsize=8, frameon=False)
   ax.set_xticks(range(len(lista_usuarios)))
   ax.set_xticklabels(nombres_ajustados, fontsize=8)

   for s in ["top", "right"]: ax.spines[s].set_visible(False)
   ax.yaxis.grid(True, linestyle="--", alpha=0.3)

   plt.tight_layout()
   buffer = io.BytesIO()
   plt.savefig(buffer, format="png", dpi=120)
   buffer.seek(0)
   plt.close(fig)

   return buffer

def fn_crear_grafica_carga_archivos_pasos(nombres, cargados, nulos, titulo_grafica, porcentaje_fijo, mostrar_avance=False):
   totales = [c + n for c, n in zip(cargados, nulos)]
   fig, ax = plt.subplots(figsize=(11, 6))
   x = np.arange(len(nombres))

   if len(x) > 3:
      x_smooth = np.linspace(x.min(), x.max(), 300)
      spl = make_interp_spline(x, totales, k=3)
      y_smooth = np.maximum(spl(x_smooth), 0)
      ax.fill_between(x_smooth, y_smooth, color=COLOR_DINAMISMO, alpha=0.15, zorder=1)
      ax.plot(x_smooth, y_smooth, color=COLOR_FUERZA, linewidth=2.5, zorder=2, label="Total esperado")

   ax.bar(x, cargados, color=COLOR_CONFIANZA, width=0.6, zorder=3, label="Archivos cargados")
   max_y = max(totales) if totales else 100

   for i, (c, t) in enumerate(zip(cargados, totales)):
      n = t if t > 0 else 1
      pct = (c / n) * 100

      ax.text(
         i, t + max_y * 0.015,
         f"{t:,}",
         ha="center", va="bottom",
         fontsize=7.5, fontweight="bold",
         color=COLOR_SERIEDAD,
      )

      ax.text(
         i, -max_y * 0.04,
         f"{c:,} ({pct:.0f}%)",
         ha="center", va="top",
         fontsize=6.8, fontweight="bold",
         color=COLOR_SERIEDAD,
         clip_on=False,
      )

   if mostrar_avance:
      fig.text(
         0.97, 0.97,
         f"Avance Operativo\n{porcentaje_fijo:.2f}%",
         fontsize=10, fontweight="bold",
         ha="right", va="top",
         color=COLOR_SERIEDAD,
         bbox=dict(facecolor="white", edgecolor=COLOR_CONFIANZA,
                     boxstyle="round,pad=0.45", linewidth=1.2)
      )

   ax.set_title(f"PROGRESO DE CARGA — {titulo_grafica}", pad=20, fontsize=12,
               color=COLOR_SERIEDAD, fontweight="bold")
   ax.set_xticks(x)
   ax.set_xticklabels(nombres, fontsize=8, color=COLOR_SOLIDEZ)
   ax.yaxis.grid(True, linestyle="--", alpha=0.3)
   ax.get_yaxis().set_major_formatter(ticker.StrMethodFormatter("{x:,.0f}"))
   for s in ["top", "right"]:
      ax.spines[s].set_visible(False)

   ax.legend(
      loc="upper center",
      bbox_to_anchor=(0.5, -0.18),
      ncol=2,
      fontsize=8,
      frameon=False,
   )

   ax.set_ylim(-max_y * 0.10, max_y * 1.22)

   plt.tight_layout()
   buffer = io.BytesIO()
   plt.savefig(buffer, format="png", dpi=110, bbox_inches="tight")
   buffer.seek(0)
   plt.close(fig)
   return buffer

def fn_agregar_seccion_pdf(elementos, estilos, datos, titulo_seccion):
   """Agrega secciones dividiendo usuarios en lotes de 10 por gráfica."""
   estilo_h2 = ParagraphStyle("H2", parent=estilos["Heading2"], fontSize=14,
      textColor=colors.HexColor(COLOR_SERIEDAD), spaceBefore=20, spaceAfter=10)

   elementos.append(CondPageBreak(200)) 
   elementos.append(Paragraph(f"<b>{titulo_seccion}</b>", estilo_h2))

   total_cargados = sum(f["archivos_cargados"] for f in datos)
   total_universo = total_cargados + sum(f["archivos_nulos"] for f in datos)
   porcentaje = (total_cargados / total_universo * 100) if total_universo > 0 else 0

   nombres = [textwrap.fill(f["nombre_usuario"], width=10) for f in datos]
   cargados = [f["archivos_cargados"] for f in datos]
   nulos = [f["archivos_nulos"] for f in datos]

   if not nombres:
      elementos.append(Paragraph("No hay registros en este periodo.", estilos["Normal"]))
      return

   tamano_lote = 10
   for i in range(0, len(nombres), tamano_lote):
      l_nombres = nombres[i : i + tamano_lote]
      l_cargados = cargados[i : i + tamano_lote]
      l_nulos = nulos[i : i + tamano_lote]

      pagina_lote = (i // tamano_lote) + 1
      subtitulo = f"{titulo_seccion} (Parte {pagina_lote}/{math.ceil(len(nombres)/tamano_lote)})"

      buffer_img = fn_crear_grafica_carga_archivos_pasos(l_nombres, l_cargados, l_nulos, subtitulo, porcentaje, mostrar_avance=(i == 0))
      elementos.append(KeepTogether([ImageRL(buffer_img, width=500, height=240, kind="proportional"), Spacer(1, 15)]))

   data_resumen = [
      ["Descripción", "Cargados", "Pendientes", "Total"],
      ["Totales de " + titulo_seccion, f"{total_cargados:,}", f"{total_universo-total_cargados:,}", f"{total_universo:,}"]
   ]

   tabla = Table(data_resumen, colWidths=[240, 80, 80, 80])
   tabla.setStyle(TableStyle([
      ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(COLOR_SOLIDEZ)),
      ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
      ("ALIGN", (1, 0), (-1, -1), "CENTER"),
      ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
      ("FONTSIZE", (0, 0), (-1, -1), 9),
   ]))
   elementos.append(KeepTogether([Paragraph(f"Resumen {titulo_seccion}:", estilos["Normal"]), Spacer(1, 5), tabla]))

def fn_generar_pdf_reporte(imagen_actividad_buffer, texto_periodo, datos_queryset):
   buffer_pdf = io.BytesIO()
   doc = SimpleDocTemplate(
      buffer_pdf,
      pagesize=letter,
      topMargin=30,
      bottomMargin=100, 
      leftMargin=45,
      rightMargin=45
   )

   estilos = getSampleStyleSheet()
   elementos = []

   ruta_logo = os.path.join(settings.BASE_DIR, "operaciones", "static", "operaciones", "images", "logo_black_white_subtec.jpg")
   if os.path.exists(ruta_logo):
      img = ImageRL(ruta_logo, width=130, height=65, kind="proportional")
      img.hAlign = "CENTER"
      elementos.append(img)
      elementos.append(Spacer(1, 10))

   estilo_h1 = ParagraphStyle("H1", parent=estilos["Heading1"], fontSize=18, textColor=colors.HexColor(COLOR_SERIEDAD), alignment=TA_CENTER)
   elementos.append(Paragraph("Informe Semanal de Actividad", estilo_h1))
   elementos.append(Paragraph(f"Periodo: {texto_periodo}", ParagraphStyle("Sub", alignment=TA_CENTER, textColor=colors.HexColor(COLOR_SOLIDEZ))))
   elementos.append(Spacer(1, 15))

   if imagen_actividad_buffer:
      elementos.append(ImageRL(imagen_actividad_buffer, width=500, height=240, kind="proportional"))
      elementos.append(Spacer(1, 15))

   usuarios = list(dict.fromkeys([f["nombre_usuario"] for f in datos_queryset]))
   modulos = list(dict.fromkeys([f["nombre_modulo"] for f in datos_queryset]))
   headers = ["Colaborador"] + modulos
   data_tabla = [headers]

   for u in usuarios:
      fila = [u]
      for m in modulos:
         valor = next((i["total_por_modulo"] for i in datos_queryset if i["nombre_usuario"] == u and i["nombre_modulo"] == m), 0)
         fila.append(f"{valor:,}")
      data_tabla.append(fila)

   tabla_act = Table(data_tabla, colWidths=[160] + [75] * len(modulos))
   tabla_act.setStyle(TableStyle([
      ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(COLOR_SOLIDEZ)),
      ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
      ("ALIGN", (1, 1), (-1, -1), "CENTER"),
      ("FONTSIZE", (0, 0), (-1, -1), 8),
      ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
      ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
   ]))
   elementos.append(KeepTogether([Paragraph("<b>Detalle de Operaciones SASCOP</b>", estilos["Normal"]), Spacer(1, 10), tabla_act]))

   from .utils import fn_obtener_resumen_pasos_cargados, fn_obtener_resumen_ot_pasos_cargados

   fn_agregar_seccion_pdf(elementos, estilos, fn_obtener_resumen_pasos_cargados(), "Avance de Carga PTEs")
   fn_agregar_seccion_pdf(elementos, estilos, fn_obtener_resumen_ot_pasos_cargados(), "Avance de Carga OTs")

   doc.build(elementos, onFirstPage=fn_dibujar_elementos_fijos, onLaterPages=fn_dibujar_elementos_fijos)
   return buffer_pdf.getvalue()