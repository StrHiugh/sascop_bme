from django.db import models
from .catalogos_models import Sitio, Estatus, Embarcacion, UnidadMedida, Tipo
from .ote_models import OTE

class Producto(models.Model):
    id_partida = models.CharField(max_length=100)
    descripcion_concepto = models.TextField()
    anexo = models.CharField(max_length=100, blank=True)
    id_sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 1})
    id_tipo_partida = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    id_unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.CASCADE)
    precio_unitario_mn = models.DecimalField(max_digits=15, decimal_places=2)
    precio_unitario_usd = models.DecimalField(max_digits=15, decimal_places=2)
    estatus = models.BooleanField(default=True)
    comentario = models.TextField(blank=True)
    class Meta:
        db_table = 'producto'

    def __str__(self):
        return f"{self.id_partida} - {self.descripcion_concepto}"

class Produccion(models.Model):
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
    volumen_ajustado = models.DecimalField(max_digits=15, decimal_places=2)
    volumen_estimado = models.DecimalField(max_digits=15, decimal_places=2,default=0)
    id_estatus_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    comentario_ajuste = models.TextField(blank=True)
    class Meta:
        db_table = 'estimacion_detalle'

    def __str__(self):
        return f"Detalle Estimación {self.id} - Prod {self.id_produccion.id}"