from django.db import models
from django.contrib.gis.db import models as gis_models # IMPORTANTE: GeoDjango
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Sum

class ReporteDiarioEmbarcacion(models.Model):
    embarcacion = models.ForeignKey('operaciones.Sitio', on_delete=models.CASCADE)
    fecha = models.DateField()
    representante = models.ForeignKey(User, on_delete=models.PROTECT, help_text="Usuario que elabora/firma el reporte")
    estado = models.CharField(max_length=20, choices=[
        ('Borrador', 'Borrador'), 
        ('Pre-Cierre', 'Pre-Cierre'), 
        ('Cerrado', 'Cerrado')
    ], default='Borrador')
    sin_arribos = models.BooleanField(default=False)
    archivo_pdf = models.FileField(upload_to='tiempos_barco/reportes_diarios_flota/%Y/%m/', blank=True, null=True)
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
    estatus_operativo = models.CharField(max_length=50, default='Operando') 

    class Meta:
        db_table = 'bitacora_tiempo'
        verbose_name = "Bitácora de Tiempo"
        verbose_name_plural = "Bitácoras de Tiempo"

    def clean(self):
        if self.hora_inicio and self.hora_fin and self.hora_inicio >= self.hora_fin:
            raise ValidationError("La hora de inicio debe ser menor a la hora de fin.")

    def __str__(self):
        return f"{self.hora_inicio} a {self.hora_fin} - {self.actividad}"


class PosicionEmbarcacion(models.Model):
    """
    Guarda el histórico de coordenadas. 
    Nota SRS: El mapa en vivo debe leer de REDIS, esta tabla es para persistencia e histórico.
    """
    embarcacion = models.ForeignKey('operaciones.Sitio', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    punto = gis_models.PointField(srid=4326, help_text="Longitud y Latitud")
    velocidad_nudos = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        db_table = 'posicion_embarcacion'
        verbose_name = "Posición de Embarcación"
        verbose_name_plural = "Posiciones de Embarcaciones"

    def clean(self):
        if not self.punto or (self.punto.x == 0 and self.punto.y == 0):
            raise ValidationError("Coordenadas inválidas. No se permite la coordenada 0.0, 0.0")

    def __str__(self):
        return f"{self.embarcacion} - {self.timestamp}"


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
        # SRS Motor Transaccional: Se alimentará de "vales_aprobados.monto"
        return 0

    @property
    def existencia_actual(self):
        # SRS Cálculo Reactivo Balance: (Anterior + Sum) - (Cons + Trasiego)
        return (self.existencia_anterior + self.suministro) - (self.consumo + self.trasiego_total)

    def __str__(self):
        return f"{self.tipo_recurso} - Reporte #{self.reporte_id}"