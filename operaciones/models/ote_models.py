from django.db import models
from .catalogos_models import Embarcacion, Estatus, ResponsableProyecto, Tipo
from .pte_models import PTEHeader
class OTE(models.Model):
    ESTATUS_OTE_CHOICES = [
        (1, 'Programada'),
        (2, 'En Proceso'),
        (3, 'Terminada'),
        (4, 'Cancelada'),
    ]    
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 2})
    id_pte_header = models.ForeignKey(PTEHeader, on_delete=models.CASCADE)
    orden_trabajo = models.CharField(max_length=100, unique=True)
    descripcion_trabajo = models.TextField()
    id_responsable_proyecto = models.ForeignKey(ResponsableProyecto, on_delete=models.CASCADE)
    responsable_cliente = models.CharField(max_length=200)
    oficio_ot = models.CharField(max_length=100)
    id_embarcacion = models.ForeignKey(Embarcacion, on_delete=models.CASCADE)
    id_estatus_ot = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 2})
    fecha_inicio_programada = models.DateField(blank=True, null=True)
    fecha_inicio_real = models.DateField(blank=True, null=True)
    fecha_termino_programada = models.DateField(blank=True, null=True)
    fecha_termino_real = models.DateField(blank=True, null=True)
    estatus = models.IntegerField(default=1)
    num_reprogramacion = models.IntegerField(null=True, blank=True)
    ot_principal = models.IntegerField(null=True, blank=True)
    comentario = models.TextField(blank=True) 

    class Meta:
        db_table = 'ot'

    def __str__(self):
        return self.orden_trabajo


class PartidaProyectada(models.Model):
    """
    Modelo para importar partidas proyectadas por OT desde Excel
    """
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='partidas_proyectadas')
    id_partida = models.CharField(max_length=100, verbose_name="ID Partida") 
    volumen_proyectado = models.DecimalField(max_digits=15, decimal_places=3, verbose_name="Volumen Proyectado")
    volumen_real = models.DecimalField(max_digits=15, decimal_places=3, verbose_name="Volumen Real")
    fecha_desde = models.DateField(verbose_name="Fecha Inicio Proyección")
    fecha_hasta = models.DateField(verbose_name="Fecha Fin Proyección")

    class Meta:
        db_table = 'partida_proyectada'
        verbose_name = 'Partida Proyectada'
        verbose_name_plural = 'Partidas Proyectadas'
        unique_together = ['id_ot', 'id_partida', 'fecha_desde']

    def __str__(self):
        return f"{self.id_ot.orden_trabajo} - {self.id_partida}"