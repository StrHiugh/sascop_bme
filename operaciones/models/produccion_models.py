from django.db import models
from .catalogos_models import Sitio, Estatus, UnidadMedida, Tipo
from .ote_models import OTE

class Producto(models.Model):
    id_partida = models.CharField(max_length=100)
    descripcion_concepto = models.TextField()
    anexo = models.CharField(max_length=100, blank=True, null=True)
    id_sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 1})
    id_tipo_partida = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    id_unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.CASCADE)
    precio_unitario_mn = models.DecimalField(max_digits=15, decimal_places=2)
    precio_unitario_usd = models.DecimalField(max_digits=15, decimal_places=2)
    activo = models.BooleanField(default=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'producto'

    def __str__(self):
        return f"{self.id_partida} - {self.descripcion_concepto}"

class ReporteMensual(models.Model):
    """
    Representa la 'Carpeta Mensual' de una OT.
    Agrupa todos los reportes diarios y de producción de un mes específico.
    """
    ESTATUS_REPORTE = [
        ('ABIERTO', 'Abierto'),
        ('CERRADO', 'Cerrado'),  # Bloquea edición completa
        ('FIRMADO', 'Firmado'),  # Validado administrativa y operativamente
    ]

    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='reportes_mensuales', blank=True, null=True)
    mes = models.IntegerField(help_text="Mes numérico (1-12)")
    anio = models.IntegerField(help_text="Año (Ej. 2025)")
    archivo = models.URLField(blank=True, null=True, verbose_name="Link Evidencia (Drive)")
    estatus_cierre = models.CharField(max_length=20, choices=ESTATUS_REPORTE, default='ABIERTO')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reporte_mensual_header'
        unique_together = ['id_ot', 'mes', 'anio']
        verbose_name = "Reporte Mensual"
        verbose_name_plural = "Reportes Mensuales"

    def __str__(self):
        return f"Reporte {self.id_ot.orden_trabajo} - {self.mes}/{self.anio}"

class ReporteDiario(models.Model):
    """
    Controla el estatus operativo del día para una OT.
    Alimenta el Grid de Asistencia.
    """
    ESTATUS_CHOICES = [
        ('OK', 'Completo (OK)'),
        ('FFP', 'Falta Firma PEP (FFP)'),
        ('FFC', 'Falta Firma CIA (FFC)'),
        ('S', 'Suspendida (S)'),
        ('BAJA', 'Baja por Equipo/Personal'),
        ('NA', 'No Aplica / Inactivo'),
        ('ELABORADO', 'Elaborado (Pendiente Firma)'),
    ]

    id_reporte_mensual = models.ForeignKey(ReporteMensual, on_delete=models.CASCADE, related_name='dias_estatus', blank=True, null=True)
    fecha = models.DateField()
    estatus = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='ELABORADO')
    comentario = models.CharField(max_length=255, blank=True, null=True, help_text="Observación breve del día")
    # Bloqueo individual por día (para evitar re-edición tras firma)
    bloqueado = models.BooleanField(default=False)

    class Meta:
        db_table = 'reporte_diario_detalle'
        unique_together = ['id_reporte_mensual', 'fecha']
        indexes = [models.Index(fields=['fecha'])]

    def __str__(self):
        return f"{self.fecha} - {self.estatus}"

class Produccion(models.Model):
    TIPO_TIEMPO_CHOICES = [
        ('TE', 'Tiempo Efectivo'),
        ('CMA', 'Costo Mínimo/Muerto'),
    ]

    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE)
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    fecha_produccion = models.DateField()
    volumen_produccion = models.DecimalField(max_digits=15, decimal_places=2)
    volumen_actual = models.DecimalField(max_digits=15, decimal_places=2)
    importe_mn = models.DecimalField(max_digits=15, decimal_places=2)
    importe_usd = models.DecimalField(max_digits=15, decimal_places=2)
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    id_tipo_produccion = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'tipo': 4},
                                        related_name='producciones_tipo')
    id_reporte_mensual = models.ForeignKey(ReporteMensual, on_delete=models.CASCADE, related_name='producciones', blank=True, null=True)
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'produccion'

    def __str__(self):
        return f"Producción {self.id} - OT {self.id_ot.orden_trabajo}"
    

class EstimacionHeader(models.Model):
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE)
    fecha_estimacion = models.DateField()
    fecha_desde = models.DateField()
    fecha_hasta = models.DateField()
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    total_volumen_producido = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_volumen_estimado = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_importe_mn = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_importe_usd = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'estimacion_header'

    def __str__(self):
        return f"Estimación {self.id} - OT {self.id_ot.orden_trabajo}"

class EstimacionDetalle(models.Model):
    id_estimacion_header = models.ForeignKey(EstimacionHeader, on_delete=models.CASCADE, related_name='detalles')
    id_produccion = models.ForeignKey(Produccion, on_delete=models.CASCADE)
    volumen_actual = models.DecimalField(max_digits=15, decimal_places=2)
    volumen_estimado = models.DecimalField(max_digits=15, decimal_places=2,default=0)
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    comentario_ajuste = models.TextField(blank=True)
    class Meta:
        db_table = 'estimacion_detalle'

    def __str__(self):
        return f"Detalle Estimación {self.id} - Prod {self.id_produccion.id}"