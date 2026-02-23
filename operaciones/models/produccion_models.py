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
    id_sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, null=True, blank=True)
    class Meta:
        db_table = 'reporte_diario_detalle'
        unique_together = ['id_reporte_mensual', 'fecha', 'id_sitio']
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
    tipo_tiempo = models.CharField(max_length=3, choices=TIPO_TIEMPO_CHOICES, blank=True, null=True)
    es_excedente = models.BooleanField(default=False)
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    comentario = models.TextField(blank=True)
    id_sitio_produccion = models.ForeignKey(Sitio, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'produccion'
        unique_together = ['id_partida_anexo', 'fecha_produccion', 'tipo_tiempo', 'id_sitio_produccion']
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
    nota_bloqueo = models.TextField(blank=True, verbose_name="Observaciones", null=True)
    id_estimacion_detalle = models.ForeignKey('EstimacionDetalle', on_delete=models.SET_NULL, null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

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

class Superintendente(models.Model):
    nombre = models.CharField(max_length=150)
    sitio_asignado = models.ForeignKey('Sitio', on_delete=models.SET_NULL, null=True, blank=True)
    color = models.CharField(max_length=7, default="#3498db")
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'superintendente'

    def __str__(self):
        return self.nombre

class CicloGuardia(models.Model):
    """
    Define los cambios de guardia en base a la fecha de inicio inicial del super A 
    """
    sitio = models.OneToOneField('Sitio', on_delete=models.CASCADE)
    super_a = models.ForeignKey(Superintendente, on_delete=models.CASCADE, related_name='ciclos_a')
    super_b = models.ForeignKey(Superintendente, on_delete=models.CASCADE, related_name='ciclos_b')
    
    fecha_inicio_super_a = models.DateField(help_text="Fecha en que inició guardia el Super A")

    class Meta:
        db_table = 'guardias'

    def __str__(self):
        return f"Ciclo {self.sitio}: {self.super_a} / {self.super_b}"

class CronogramaVersion(models.Model):
    """
    La 'foto' del archivo .mpp importado.
    """
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='cronogramas')
    nombre_version = models.CharField(max_length=150)
    archivo_mpp = models.FileField(upload_to='operaciones/mpps/')
    fecha_carga = models.DateTimeField(auto_now_add=True)
    es_activo = models.BooleanField(default=True)
    fecha_inicio_proyecto = models.DateField(null=True, blank=True)
    fecha_fin_proyecto = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'importacion_cronograma'

class TareaCronograma(models.Model):
    """
    Desglose de tareas del Project.
    """
    version = models.ForeignKey(CronogramaVersion, on_delete=models.CASCADE, related_name='tareas')
    uid_project = models.IntegerField() 
    id_project = models.IntegerField() 
    wbs = models.CharField(max_length=50) 
    nombre = models.CharField(max_length=500)
    nivel_esquema = models.IntegerField(default=0) 
    es_resumen = models.BooleanField(default=False) 
    padre_uid = models.IntegerField(null=True, blank=True)
    fecha_inicio = models.DateField(null=True)
    fecha_fin = models.DateField(null=True)
    duracion_dias = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    porcentaje_mpp = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    porcentaje_completado = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    recursos = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'importacion_cronograma_tarea'
        indexes = [models.Index(fields=['version', 'uid_project'])]

class AvanceCronograma(models.Model):
    """
    La doble verdad: Real vs Cliente.
    Se separa de la tarea para no sobreescribir al re-importar versiones.
    """
    tarea = models.OneToOneField(TareaCronograma, on_delete=models.CASCADE, related_name='avance')
    porcentaje_real = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    porcentaje_cliente = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    comentario = models.TextField(blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'importacion_cronograma_avance'

class DependenciaTarea(models.Model):
    """
    Relaciones de precedencia entre tareas del cronograma.
    """
    version = models.ForeignKey(CronogramaVersion, on_delete=models.CASCADE, related_name='dependencias')
    tarea_predecesora_uid = models.IntegerField()
    tarea_sucesora_uid = models.IntegerField()
    tipo = models.CharField(max_length=2, default='FS', choices=[
        ('FS', 'Fin a Inicio'),
        ('SS', 'Inicio a Inicio'),
        ('FF', 'Fin a Fin'),
        ('SF', 'Inicio a Fin'),
    ])
    lag_dias = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        db_table = 'importacion_cronograma_dependencia'