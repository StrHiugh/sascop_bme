from django.db import models
from .catalogos_models import Sitio, Estatus, Embarcacion, UnidadMedida, Tipo
from .ote_models import OTE

class Producto(models.Model):
    ESTATUS_PUES_CHOICES = [
        (1, 'Activo'),
        (2, 'Inactivo'),
        (3, 'Suspendido'),
    ]
    id_partida = models.CharField(max_length=100)
    descripcion_concepto = models.TextField()
    anexo = models.CharField(max_length=100, blank=True)
    id_sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 'PARTIDA'})
    partida_extraordinaria = models.CharField(max_length=100, blank=True)
    id_unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.CASCADE)
    precio_unitario_mn = models.DecimalField(max_digits=15, decimal_places=2)
    precio_unitario_usd = models.DecimalField(max_digits=15, decimal_places=2)
    precio_pte = models.DecimalField(max_digits=15, decimal_places=2)
    precio_pte2 = models.DecimalField(max_digits=15, decimal_places=2)
    costo_directo = models.DecimalField(max_digits=15, decimal_places=2)
    estatus_pues = models.IntegerField(choices=ESTATUS_PUES_CHOICES, default=1)
    anexo_liberado = models.CharField(max_length=100, blank=True)
    estatus = models.BooleanField(default=True)
    comentario = models.TextField(blank=True)
    class Meta:
        db_table = 'producto'

    def __str__(self):
        return f"{self.id_partida} - {self.descripcion_concepto}"

class Produccion(models.Model):
    id_ote = models.ForeignKey(OTE, on_delete=models.CASCADE)
    id_sitio_trabajo = models.ForeignKey(Sitio, on_delete=models.CASCADE, related_name='producciones_trabajo', 
                                        limit_choices_to={'nivel_afectacion': 'TRABAJO'})
    id_tipo_partida = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'tipo': '3'}, 
                                        related_name='producciones_partida')
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    fecha_produccion = models.DateField()
    volumen_produccion = models.DecimalField(max_digits=15, decimal_places=2)
    importe_mn = models.DecimalField(max_digits=15, decimal_places=2)
    importe_usd = models.DecimalField(max_digits=15, decimal_places=2)
    id_estado_cobro = models.ForeignKey(Estatus, on_delete=models.CASCADE)
    id_tipo_produccion = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'tipo': '4'},
                                        related_name='producciones_tipo')
    id_embarcacion = models.ForeignKey(Embarcacion, on_delete=models.CASCADE)
    responsable_proyecto = models.CharField(max_length=200)
    id_sitio_partida = models.ForeignKey(Sitio, on_delete=models.CASCADE, related_name='producciones_partida',
                                        limit_choices_to={'nivel_afectacion': 'PARTIDA'})
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'produccion'

    def __str__(self):
        return f"Producción {self.id} - OTE {self.id_ote.orden_trabajo}"