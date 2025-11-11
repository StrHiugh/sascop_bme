from django.db import models
from django.contrib.auth.models import User 
class RegistroActividad(models.Model):
    registro_id = models.IntegerField(null=True, blank=True)
    evento = models.TextField(null=True, blank=True)
    campo = models.TextField(blank=True, null=True)
    valor_anterior = models.TextField(blank=True, null=True)
    valor_actual = models.TextField(blank=True, null=True)
    afectacion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(blank=True, null=True)
    usuario_id = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    tabla_log = models.IntegerField(blank=True, null=True)
    detalle = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'registro_actividad'

    def __str__(self):
        return self.detalle
