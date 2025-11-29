from django.db import models
from .catalogos_models import Estatus, ResponsableProyecto, Tipo, Frente, Cliente

class Paso(models.Model):
    descripcion = models.CharField(max_length=200)
    orden = models.CharField(blank=True, null=True, max_length=10)
    activo = models.BooleanField(default=True)
    importancia = models.FloatField(default=0)
    tipo = models.IntegerField(blank=True, null=True, default=1)
    comentario = models.TextField(blank=True, null=True)
    id_tipo_cliente = models.ForeignKey(Tipo, on_delete=models.CASCADE, null=True, blank=True)
    class Meta:
        db_table = 'paso'
        ordering = ['orden']

    def __str__(self):
        return f"{self.orden}. {self.descripcion}"

class PTEHeader(models.Model):
    ESTATUS_CHOICES = [
        (1, 'Activo'),
        (2, 'En Proceso'),
        (3, 'Terminado'),
        (4, 'Cancelado'),
    ]
    
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 1})
    oficio_pte = models.CharField(max_length=100)
    oficio_solicitud = models.CharField(max_length=100)
    descripcion_trabajo = models.TextField()
    fecha_solicitud = models.DateField(blank=True, null=True)
    fecha_entrega = models.DateField(blank=True, null=True)
    plazo_dias = models.FloatField()
    id_orden_trabajo = models.CharField(max_length=100, blank=True, null=True)
    id_responsable_proyecto = models.ForeignKey(ResponsableProyecto, on_delete=models.CASCADE, blank=True, null=True) ##QUITAR LUEGOOO
    total_homologado = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    estatus = models.IntegerField(choices=ESTATUS_CHOICES, default=1)
    prioridad = models.IntegerField(blank=True, null=True)
    id_cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'pte_header'

    def __str__(self):
        return self.oficio_pte

class PTEDetalle(models.Model):
    id_pte_header = models.ForeignKey(PTEHeader, on_delete=models.CASCADE, related_name='detalles')
    estatus_paso = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 4})
    id_paso = models.ForeignKey(Paso, on_delete=models.CASCADE)
    fecha_entrega = models.DateField(null=True, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_termino = models.DateField(null=True, blank=True)
    comentario = models.TextField(blank=True, null=True)
    archivo = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'pte_detalle'
        ordering = ['id_paso__orden']

    def __str__(self):
        return f"Detalle {self.id} - PTE {self.id_pte_header.oficio_pte}"