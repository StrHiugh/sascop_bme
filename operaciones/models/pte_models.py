from django.db import models
from .catalogos_models import Tipo, Sitio

class Paso(models.Model):
    descripcion = models.CharField(max_length=200)
    orden = models.IntegerField()
    activo = models.BooleanField(default=True)

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
    
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'tipo': 'PTE'})
    oficio_pte = models.CharField(max_length=100, unique=True)
    oficio_solicitud = models.CharField(max_length=100)
    descripcion_trabajo = models.TextField()
    fecha_solicitud = models.DateField()
    plazo_dias = models.IntegerField()
    id_orden_trabajo = models.CharField(max_length=100)
    responsable_proyecto = models.CharField(max_length=200)
    estatus = models.IntegerField(choices=ESTATUS_CHOICES, default=1)

    class Meta:
        db_table = 'pte_header'

    def __str__(self):
        return self.oficio_pte

class PTEDetalle(models.Model):
    ESTATUS_PTE_CHOICES = [
        (1, 'Pendiente'),
        (2, 'En Proceso'),
        (3, 'Completado'),
        (4, 'Rechazado'),
    ]
    
    id_pte_header = models.ForeignKey(PTEHeader, on_delete=models.CASCADE, related_name='detalles')
    total_homologado = models.DecimalField(max_digits=15, decimal_places=2)
    estatus_pte = models.IntegerField(choices=ESTATUS_PTE_CHOICES, default=1)
    id_paso = models.ForeignKey(Paso, on_delete=models.CASCADE)
    fecha_entrega = models.DateField(null=True, blank=True)
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'pte_detalle'
        ordering = ['id_paso']

    def __str__(self):
        return f"Detalle {self.id} - PTE {self.id_pte_header.oficio_pte}"