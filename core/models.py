from django.db import models

# Create your models here.
class Modulo(models.Model):
    """Sistema de módulos"""
    app_name = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    icono = models.CharField(max_length=50, default='apps')
    
    class Meta:
        db_table = 'core_modulo'
    
    def __str__(self):
        return self.nombre