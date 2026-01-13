from django.db import models
from .catalogos_models import Sitio, Estatus, UnidadMedida, Tipo, Frente
from .ote_models import OTE, PartidaAnexoImportada

class Producto(models.Model):
    id_partida = models.CharField(max_length=100)
    descripcion_concepto = models.TextField(null=True, blank=True)
    anexo = models.CharField(max_length=100, blank=True, null=True)
    id_sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 1}, null=True, blank=True)
    id_tipo_partida = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    id_unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.CASCADE)
    precio_unitario_mn = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    precio_unitario_usd = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    activo = models.BooleanField(default=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'producto'

    def __str__(self):
        return f"{self.id_partida} - {self.descripcion_concepto}"

class PartidaAnexo(models.Model):
    """
    Tabla de partida anexo. ESTA NO SE ESTA USANDO
    """
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='presupuesto_partidas')
    id_producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    volumen_autorizado = models.DecimalField(max_digits=15, decimal_places=4)

    class Meta:
        db_table = 'partida_anexo_ot'
        unique_together = ['id_ot', 'id_producto']

    def __str__(self):
        return f"OT {self.id_ot.orden_trabajo} - {self.id_producto.id_partida}: {self.volumen_autorizado}"



class ReporteMensual(models.Model):
    """
    Representa la 'Carpeta Mensual' de una OT.
    Agrupa todos los reportes diarios y de producción de un mes específico.
    """
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='reportes_mensuales', blank=True, null=True)
    mes = models.IntegerField(help_text="Mes numérico (1-12)")
    anio = models.IntegerField(help_text="Año (Ej. 2025)")
    archivo = models.URLField(blank=True, null=True, verbose_name="Link Evidencia (Drive)")
    id_estatus = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 5}, default=1, verbose_name="Estatus Cierre")
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
    id_reporte_mensual = models.ForeignKey(ReporteMensual, on_delete=models.CASCADE, related_name='dias_estatus', blank=True, null=True)
    fecha = models.DateField()
    id_estatus = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 6}, default=1, verbose_name="Estatus Operativo")
    comentario = models.CharField(max_length=255, blank=True, null=True, help_text="Observación breve del día")
    bloqueado = models.BooleanField(default=False)

    class Meta:
        db_table = 'reporte_diario_detalle'
        unique_together = ['id_reporte_mensual', 'fecha']
        indexes = [models.Index(fields=['fecha'])]

    def __str__(self):
        return f"{self.fecha} - {self.id_estatus}"

class Produccion(models.Model):
    TIPO_TIEMPO_CHOICES = [
        ('TE', 'Tiempo Efectivo'),
        ('CMA', 'Costo Mínimo Aplicado'),
    ]
    id_partida_anexo = models.ForeignKey(PartidaAnexoImportada, on_delete=models.PROTECT, related_name='registros_produccion', blank=True, null=True)
    id_reporte_mensual = models.ForeignKey(ReporteMensual, on_delete=models.CASCADE, related_name='producciones', blank=True, null=True)
    fecha_produccion = models.DateField()
    volumen_produccion = models.DecimalField(max_digits=15, decimal_places=6)
    # volumen_actual = models.DecimalField(max_digits=15, decimal_places=2)
    tipo_tiempo = models.CharField(max_length=3, choices=TIPO_TIEMPO_CHOICES, blank=True, null=True)
    es_excedente = models.BooleanField(default=False)
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'produccion'
        unique_together = ['id_partida_anexo', 'fecha_produccion', 'tipo_tiempo']
        indexes = [
            models.Index(fields=['fecha_produccion']),
            models.Index(fields=['id_partida_anexo']),
            models.Index(fields=['tipo_tiempo'])
        ]

    def __str__(self):
        return f"Producción {self.id} - OT {self.id_ot.orden_trabajo} - {self.fecha_produccion}"

class RegistroGPU(models.Model):
    """
    pro_registro_gpu (Espejo Administrativo y Evidencias).
    Solo se crea para C-2 y C-3.
    """
    id_produccion = models.OneToOneField(Produccion, on_delete=models.CASCADE, related_name='gpu')
    id_estatus = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 6}, verbose_name="Estatus GPU")
    archivo = models.URLField(max_length=500, blank=True, null=True, verbose_name="Link Evidencia Fotográfica")
    nota_bloqueo = models.TextField(blank=True, verbose_name="Alerta por Excedente/No Considerado")
    id_estimacion_detalle = models.ForeignKey('EstimacionDetalle', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'registro_generadores_pu'


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