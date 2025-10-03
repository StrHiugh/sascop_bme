from django.db import models

class Tipo(models.Model):
    CATEGORIA_CHOICES = [
        ('PTE', 'PTE'),
        ('OTE', 'OTE'),
        ('PARTIDA', 'PARTIDA'),
        ('PRODUCCION', 'PRODUCCION')
    ]
    
    descripcion = models.CharField(max_length=200)
    nivel_afectacion = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'tipo'
        unique_together = ['nivel_afectacion', 'descripcion']

    def __str__(self):
        return f"{self.descripcion} ({self.nivel_afectacion})"

class Sitio(models.Model):
    TIPO_SITIO_CHOICES = [
        ('TRABAJO', 'TRABAJO'),
        ('PARTIDA', 'PARTIDA'),
    ]
    
    descripcion = models.CharField(max_length=200)
    nivel_afectacion = models.CharField(max_length=20, choices=TIPO_SITIO_CHOICES)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'sitio'

    def __str__(self):
        return self.descripcion

class EstadoCobro(models.Model):
    descripcion = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'estado_cobro'

    def __str__(self):
        return self.descripcion

class Embarcacion(models.Model):
    descripcion = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'embarcacion'

    def __str__(self):
        return self.descripcion

class UnidadMedida(models.Model):
    descripcion = models.CharField(max_length=50)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'unidad_medida'

    def __str__(self):
        return self.descripcion
