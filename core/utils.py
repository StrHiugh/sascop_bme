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
   resultados = (
      RegistroActividad.objects
      .filter(fecha__range=[fecha_inicio, fecha_fin])
      .values("usuario_id_id", "tabla_log")
      .annotate(
         total_actividades=Count("id"),
         nombre_usuario=Concat(
            "usuario_id__first_name",
            Value(""),
            output_field=CharField()
         ),
         nombre_modulo=Case(
            When(tabla_log=0, then=Value("PTE HEADER")),
            When(tabla_log=1, then=Value("PTE DETALLE")),
            When(tabla_log=4, then=Value("OTE HEADER")),
            When(tabla_log=5, then=Value("OTE DETALLE")),
            default=Value("OTRO"),
            output_field=CharField(),
         )
      )
      .order_by("-total_actividades")[:10]
   )
   return resultados

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
         pte_detalle.estatus_paso_id != 14
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
         ot_detalle.estatus_paso_id != 14
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
      cantidad = fila["total_actividades"]

      if usuario not in datos_organizados:
         datos_organizados[usuario] = {}

      datos_organizados[usuario][tipo] = cantidad
      tipos_de_registro.add(tipo)

   lista_usuarios = list(datos_organizados.keys())
   lista_tipos = sorted(list(tipos_de_registro))
   nombres_ajustados = [textwrap.fill(nombre, width=12) for nombre in lista_usuarios]

   fig, ax = plt.subplots(figsize=(9, 5.5))
   acumulado_altura = [0] * len(lista_usuarios)
   colores = [
      "#2E86C1",
      "#E67E22",
      "#27AE60",
      "#8E44AD",
      "#C0392B"
   ]

   ancho_barra = 0.5
   cantidad_maxima_visual = 10

   for i, tipo in enumerate(lista_tipos):
      valores = [datos_organizados[u].get(tipo, 0) for u in lista_usuarios]
      color_actual = colores[i % len(colores)]

      barras = ax.bar(
         range(len(lista_usuarios)),
         valores,
         bottom=acumulado_altura,
         label=tipo,
         color=color_actual,
         width=ancho_barra
      )

      altura_total = max([sum(x) for x in zip(acumulado_altura, valores)]) if acumulado_altura else 10
      umbral = altura_total * 0.07
      color_txt = fn_obtener_color_texto(color_actual)

      for barra, valor in zip(barras, valores):
         if valor > 0 and valor >= umbral:
            cx = barra.get_x() + barra.get_width() / 2
            cy = barra.get_y() + barra.get_height() / 2
            ax.text(
               cx,
               cy,
               str(valor),
               ha="center",
               va="center",
               color=color_txt,
               fontsize=8,
               fontweight="bold"
            )

      acumulado_altura = [s + v for s, v in zip(acumulado_altura, valores)]

   ax.set_xlim(-0.5, cantidad_maxima_visual - 0.5)

   max_y = max(acumulado_altura) if acumulado_altura else 0
   ax.set_ylim(0, max_y * 1.15)

   ax.set_title(
      "Actividad por Usuario",
      pad=15,
      fontsize=11
   )

   ax.set_ylabel("Registros", fontsize=9)

   ax.yaxis.grid(
      True,
      linestyle="--",
      alpha=0.5,
      color="#CCCCCC"
   )
   ax.set_axisbelow(True)
   ax.spines["top"].set_visible(False)
   ax.spines["right"].set_visible(False)

   ax.legend(
      loc="upper right",
      frameon=True,
      fontsize=8
   )

   ax.set_xticks(range(len(lista_usuarios)))
   ax.set_xticklabels(
      nombres_ajustados,
      fontsize=8,
      rotation=0
   )

   plt.yticks(fontsize=8)
   plt.tight_layout()
   buffer = io.BytesIO()

   plt.savefig(
      buffer,
      format="png",
      bbox_inches="tight",
      dpi=110
   )

   buffer.seek(0)
   plt.close(fig)
   return buffer

def fn_crear_grafica_carga_archivos_pasos(nombres, cargados, nulos, titulo_grafica, porcentaje_fijo, mostrar_avance=False):
   """
   Gráfica de Carga de archivos correspondientes a cada paso.
   """
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

   ax.fill_between(
      x_smooth, y_smooth,
      color=COLOR_VERDE_AREA,
      alpha=0.6,
      zorder=1
   )
   ax.plot(
      x_smooth,
      y_smooth,
      color=COLOR_VERDE_LINEA,
      linewidth=2,
      zorder=2
   )
   ax.bar(
      x,
      cargados,
      color=COLOR_AZUL_BARRAS,
      width=0.6,
      zorder=3
   )

   max_val = max(totales) if totales else 1

   for i, (v_cargado, v_total) in enumerate(zip(cargados, totales)):
      ax.text(
         i,
         v_total + (max_val * 0.02),
         f"{v_total}",
         ha='center',
         va='bottom',
         fontsize=8,
         color="#555"
      )
      ax.text(
         i,
         v_cargado + (max_val * 0.01),
         f"{v_cargado}",
         ha='center',
         va='bottom',
         fontsize=8,
         color="#333",
         fontweight='bold'
      )

   if mostrar_avance:
      texto_box = f"{porcentaje_fijo:.2f}%\n% Avance Operativo"
      ax.text(0.98, 0.85, texto_box, transform=ax.transAxes, fontsize=13,
         fontweight='bold', ha='right', va='top',
         bbox=dict(facecolor='white', edgecolor='#dddddd', boxstyle='round,pad=0.6'))

   ax.set_title(f"PROGRESO DE CARGA HISTÓRICA\n{titulo_grafica}", pad=25, fontsize=12)
   ax.set_xticks(x)
   ax.set_xticklabels(nombres, fontsize=8)
   ax.yaxis.grid(True, linestyle='--', alpha=0.3)
   for spine in ["top", "right", "left"]: ax.spines[spine].set_visible(False)

   plt.tight_layout()
   buffer = io.BytesIO()
   plt.savefig(buffer, format="png", dpi=110)
   buffer.seek(0)
   plt.close(fig)
   return buffer

def fn_agregar_seccion_pdf(
   elementos,
   estilos,
   datos,
   titulo_seccion
):
   estilo_encabezado = ParagraphStyle(
      "EncabezadoSeccion",
      parent=estilos["Heading2"],
      fontSize=14,
      textColor=colors.HexColor("#2c3e50"),
      spaceBefore=15,
      spaceAfter=10
   )

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
   total_paginas = math.ceil(len(nombres) / tamano_lote)

   for i in range(0, len(nombres), tamano_lote):
      l_nombres = nombres[i : i + tamano_lote]
      l_cargados = cargados[i : i + tamano_lote]
      l_nulos = nulos[i : i + tamano_lote]

      pagina_actual = (i // tamano_lote) + 1
      subtitulo = f"Detalle por Usuario (Parte {pagina_actual}/{total_paginas})"

      buffer_img = fn_crear_grafica_carga_archivos_pasos(
         l_nombres,
         l_cargados,
         l_nulos,
         subtitulo,
         porcentaje_global_sec,
         mostrar_avance=(i == 0)
      )

      img_rl = ImageRL(
         buffer_img,
         width=480,
         height=266
      )

      elementos.append(KeepTogether([img_rl, Spacer(1, 15)]))

      data_resumen = [
         [
            "Total Registros",
            "Cargados",
            "Pendientes"
         ],
         [
            f"{total_universo_sec:,}",
            f"{total_cargados_sec:,}",
            f"{total_nulos_sec:,}"
         ]
      ]

   data_resumen = [
      [
         "Total",
         "Cargados",
         "Pendientes"
      ],
      [
         f"{total_universo_sec:,}",
         f"{total_cargados_sec:,}",
         f"{total_nulos_sec:,}"
      ]
   ]

   tabla_resumen = Table(data_resumen, colWidths=[65, 60, 60])
   tabla_resumen.setStyle(TableStyle([
      ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8f9fa")),
      ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#444444")),
      ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
      ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
      ('FONTSIZE', (0, 0), (-1, -1), 8),
      ('GRID', (0, 0), (-1, -1), 0.3, colors.silver),
      ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
      ('TOPPADDING', (0, 0), (-1, -1), 2),
   ]))

   bloque_final = KeepTogether([
      Spacer(1, 10),
      Paragraph(f"<b>Totales {titulo_seccion}:</b>", estilos["Normal"]),
      Spacer(1, 3),
      tabla_resumen,
      Spacer(1, 15)
   ])

   elementos.append(bloque_final)

def fn_generar_pdf_reporte(imagen_actividad_buffer, texto_periodo):
   buffer_pdf = io.BytesIO()
   doc = SimpleDocTemplate(
      buffer_pdf,
      pagesize=letter,
      rightMargin=30,
      leftMargin=30,
      topMargin=30,
      bottomMargin=30
   )

   estilos = getSampleStyleSheet()
   elementos = []

   estilo_titulo = ParagraphStyle(
      "T",
      parent=estilos['Heading1'],
      fontSize=18,
      textColor=colors.HexColor("#2E86C1"),
      alignment=TA_CENTER,
      spaceAfter=10
   )
   estilo_sub = ParagraphStyle(
      "S",
      parent=estilos['Normal'],
      fontSize=12,
      textColor=colors.HexColor("#555"),
      alignment=TA_CENTER,
      spaceAfter=20
   )
   estilo_footer = ParagraphStyle(
      "F",
      parent=estilos['Normal'],
      fontSize=8,
      textColor=colors.gray,
      alignment=TA_RIGHT
   )

   elementos.append(Paragraph("Informe de Operaciones Semanal", estilo_titulo))
   elementos.append(Paragraph(f"Periodo: {texto_periodo}", estilo_sub))

   if imagen_actividad_buffer:
      img = ImageRL(
         imagen_actividad_buffer,
         width=500,
         height=300
      )
      elementos.append(img)

   elementos.append(Spacer(1, 15))
   elementos.append(PageBreak())
   datos_pte = fn_obtener_resumen_pasos_cargados()

   fn_agregar_seccion_pdf(
      elementos,
      estilos,
      datos_pte,
      "Avance de carga de Archivos correspondientes a los pasos en PTEs"
   )

   elementos.append(PageBreak())
   datos_ot = fn_obtener_resumen_ot_pasos_cargados()

   fn_agregar_seccion_pdf(
      elementos,
      estilos,
      datos_ot,
      "Avance de carga de Archivos correspondientes a los pasos en OTs"
   )

   elementos.append(Spacer(1,30))
   elementos.append(Paragraph("Generado por Sistema SASCOP", estilo_footer))

   doc.build(elementos)
   valor_pdf = buffer_pdf.getvalue()
   buffer_pdf.close()
   return valor_pdf

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