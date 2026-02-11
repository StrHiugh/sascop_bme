from django.core.management.base import BaseCommand
from django.utils import timezone
import datetime
from core.utils import (
   fn_obtener_resumen_actividad_por_usuario,
   fn_generar_grafica_buffer,
   fn_generar_pdf_reporte,
   fn_enviar_correo_template
)

class Command(BaseCommand):
   help = "Envía el reporte semanal de actividades automáticamente"
   def handle(self, *args, **kwargs):
      self.stdout.write("Iniciando proceso de envío de reporte semanal...")
      fecha_actual = timezone.now()
      fecha_fin_dt = fecha_actual - datetime.timedelta(days=1)
      fecha_inicio_dt = fecha_fin_dt - datetime.timedelta(days=6)

      # Descomentar en caso que quieran hacerse pruebas con fechas estaticas.
      # fecha_inicio_dt = datetime.datetime(2026, 2, 2)
      # fecha_fin_dt = datetime.datetime(2026, 2, 11)

      fecha_inicio_str = fecha_inicio_dt.strftime("%Y-%m-%d 00:00:00+00")
      fecha_fin_str = fecha_fin_dt.strftime("%Y-%m-%d 23:59:59+00")
      texto_periodo = f"{fecha_inicio_dt.strftime('%d/%m/%Y')} — {fecha_fin_dt.strftime('%d/%m/%Y')}"

      self.stdout.write(f"Periodo calculado: {texto_periodo}")

      lista_correos = [
         "gregorio021@outlook.com",
         "Jfcp@bluemarine.com.mx",
         "Svr@bluemarine.com.mx",
         "ejs@bluemarine.com.mx",
         "jesg@bluemarine.com.mx",
         "apg@bluemarine.com.mx",
         "rmg@bluemarine.com.mx",
         "gdg@bluemarine.com.mx",
         "Acch@bluemarine.com.mx",
         "afcv@bluemarine.com.mx",
         "jarpa@bluemarine.com.mx",
         "fbhp@bluemarine.com.mx",
         "jmrm@bluemarine.com.mx"
      ]

      datos_correo = {
         "nombre_usuario": "Equipo SASCOP",
         "link_sistema": "http://54.227.40.69/",
         "texto_periodo": texto_periodo
      }

      try:
         resultados = fn_obtener_resumen_actividad_por_usuario(fecha_inicio_str, fecha_fin_str)
         if not resultados:
            self.stdout.write(self.style.WARNING("No hay datos de actividad para este periodo."))
            return

         buffer_grafica = fn_generar_grafica_buffer(resultados)
         pdf_bytes = fn_generar_pdf_reporte(buffer_grafica, texto_periodo, resultados)
         buffer_grafica.close()

         adjunto_pdf = ("Reporte_Semanal_SASCOP.pdf", pdf_bytes, "application/pdf")

         exito = fn_enviar_correo_template(
            asunto=f"Resumen Semanal de Actividad: {texto_periodo}",
            ruta_template="core/correos/resumen_actividad.html",
            contexto=datos_correo,
            lista_destinatarios=lista_correos,
            archivo_adjunto=adjunto_pdf
         )

         if exito:
            self.stdout.write(self.style.SUCCESS(f"Correo enviado exitosamente a {len(lista_correos)} destinatarios."))
         else:
            self.stdout.write(self.style.ERROR("Falló el envío del correo."))

      except Exception as error:
         self.stdout.write(self.style.ERROR(f"Ocurrió un error crítico: {error}"))