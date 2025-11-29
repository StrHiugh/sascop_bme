from django.db import models

class Tipo(models.Model):
    TIPO_CHOICES = [
        ('1', 'PTE'),
        ('2', 'OT'),
        ('3', 'PARTIDA'),
        ('4', 'PRODUCCION')
    ]
    
    descripcion = models.CharField(max_length=200)
    nivel_afectacion = models.IntegerField(choices=TIPO_CHOICES, default=0)
    comentario = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'tipo'

    def __str__(self):
        return f"{self.descripcion} ({self.nivel_afectacion})"

class Frente(models.Model):
    descripcion = models.CharField(max_length=200)
    nivel_afectacion = models.IntegerField(blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'frente'

    def __str__(self):
        return self.descripcion

class Estatus(models.Model):
    TIPO_AFECTACION = [
        ('1', 'PTE'),
        ('2', 'OT'),
        ('3', 'COBRO'),
        ('4', 'PASOS PTE'),
        
    ]
    descripcion = models.CharField(max_length=100)
    nivel_afectacion = models.IntegerField(choices=TIPO_AFECTACION, default=0)
    comentario = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'cat_estatus'

    def __str__(self):
        return self.descripcion

class Sitio(models.Model):
    descripcion = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    id_frente = models.ForeignKey(Frente, on_delete=models.CASCADE, blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'sitio'

    def __str__(self):
        return self.descripcion

class UnidadMedida(models.Model):
    descripcion = models.CharField(max_length=50)
    clave = models.CharField(max_length=10)
    activo = models.BooleanField(default=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'unidad_medida'

    def __str__(self):
        return self.descripcion
    
class ResponsableProyecto(models.Model):
    descripcion = models.CharField(max_length=50)
    activo = models.BooleanField(default=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'responsable_proyecto'

    def __str__(self):
        return self.descripcion


class Cliente(models.Model):
    descripcion = models.CharField(max_length=100)
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, blank=True, null=True)
    activo = models.BooleanField(default=True)
    comentario = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'cliente'

    def __str__(self):
        return self.descripcion
