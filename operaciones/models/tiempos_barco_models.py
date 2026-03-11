from django.db import models
from django.contrib.auth.models import User
from django.db.models import Sum


class ReporteDiarioEmbarcacion(models.Model):
    embarcacion = models.ForeignKey('Sitio', on_delete=models.CASCADE)
    fecha = models.DateField()
    representante = models.ForeignKey(User, on_delete=models.PROTECT, help_text="Usuario que elabora/firma el reporte")
    estado = models.CharField(max_length=20, choices=[
        ('Borrador', 'Borrador'), 
        ('Pre-Cierre', 'Pre-Cierre'), 
        ('Cerrado', 'Cerrado')
    ], default='Borrador')
    sin_arribos = models.BooleanField(default=False)
    archivo_pdf_url = models.URLField(blank=True, null=True)
    comentarios_generales = models.TextField(blank=True, null=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['embarcacion', 'fecha']
        db_table = 'reporte_diario_embarcacion'
        verbose_name = "Reporte Diario de Embarcación"
        verbose_name_plural = "Reportes Diarios de Embarcaciones"

    def __str__(self):
        return f"RD {self.embarcacion} - {self.fecha}"


class BitacoraTiempo(models.Model):
    reporte = models.ForeignKey(ReporteDiarioEmbarcacion, on_delete=models.CASCADE, related_name='tiempos')
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    actividad = models.CharField(max_length=255)

    class Meta:
        db_table = 'bitacora_tiempo'
        verbose_name = "Bitácora de Tiempo"
        verbose_name_plural = "Bitácoras de Tiempo"

    def __str__(self):
        return f"{self.hora_inicio} a {self.hora_fin} - {self.actividad}"


class InventarioDiario(models.Model):
    reporte = models.ForeignKey(ReporteDiarioEmbarcacion, on_delete=models.CASCADE, related_name='inventarios')
    tipo_recurso = models.CharField(max_length=50, choices=[('DIESEL', 'Diésel'), ('AGUA', 'Agua Dulce')])
    existencia_anterior = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    suministro = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    consumo = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'inventario_diario'
        verbose_name = "Inventario Diario"
        verbose_name_plural = "Inventarios Diarios"
    
    @property
    def trasiego_total(self):
        # TODO: Implementar cuando exista el modelo ValeTrasiego
        # total = self.vales_trasiego.aggregate(total=Sum('monto'))['total']
        # return total or 0
        return 0

    @property
    def existencia_actual(self):
        return (self.existencia_anterior + self.suministro) - (self.consumo + self.trasiego_total)

    def __str__(self):
        return f"{self.tipo_recurso} - Reporte #{self.reporte_id}"
