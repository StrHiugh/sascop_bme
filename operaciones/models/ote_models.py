from django.db import models
from .catalogos_models import Tipo
from .pte_models import PTEHeader

class OTE(models.Model):
    ESTATUS_OTE_CHOICES = [
        (1, 'Programada'),
        (2, 'En Proceso'),
        (3, 'Terminada'),
        (4, 'Cancelada'),
    ]    
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'tipo': 'OTE'})
    id_oficio_pte = models.ForeignKey(PTEHeader, on_delete=models.CASCADE, to_field='oficio_pte', db_column='id_oficio_pte')
    orden_trabajo = models.CharField(max_length=100, unique=True)
    descripcion_trabajo = models.TextField()
    responsable_proyecto = models.CharField(max_length=200)
    responsable_cliente = models.CharField(max_length=200)
    oficio_ote = models.CharField(max_length=100)
    estatus_ote = models.IntegerField(choices=ESTATUS_OTE_CHOICES, default=1)
    fecha_inicio_programada = models.DateField()
    fecha_termino_programada = models.DateField()
    estatus = models.IntegerField(default=1)
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = 'ote'

    def __str__(self):
        return self.orden_trabajo