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

class Categoria(models.Model):
    clave = models.CharField(max_length=20, null=True, blank=True)
    descripcion = models.CharField(max_length=600, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'cat_categoria'
        verbose_name = 'Categoría Técnica'

    def __str__(self):
        return f"{self.clave} - {self.descripcion}"

class SubCategoria(models.Model):
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='subcategorias', null=True, blank=True)
    clave = models.CharField(max_length=20, null=True, blank=True)
    descripcion = models.CharField(max_length=600, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'cat_subcategoria'
        unique_together = ['categoria', 'clave']

    def __str__(self):
        return f"{self.categoria.clave}.{self.clave} - {self.descripcion}"

class Clasificacion(models.Model):
    subcategoria = models.ForeignKey(SubCategoria, on_delete=models.CASCADE, related_name='clasificaciones', null=True, blank=True)
    clave = models.CharField(max_length=20, null=True, blank=True)
    descripcion = models.CharField(max_length=600, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'cat_clasificacion'
        unique_together = ['subcategoria', 'clave']

    def __str__(self):
        return f"{self.subcategoria.clave}.{self.clave} - {self.descripcion}"

class Contrato(models.Model):
    numero_contrato = models.CharField(max_length=100, unique=True, verbose_name="No. Contrato", null=True, blank=True)
    descripcion = models.TextField(null=True, blank=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_termino = models.DateField(null=True, blank=True)
    monto_mn = models.DecimalField(max_digits=20, decimal_places=2, default=0, null=True, blank=True)
    monto_usd = models.DecimalField(max_digits=20, decimal_places=2, default=0, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'contrato'

    def __str__(self):
        return f"{self.numero_contrato} - {self.descripcion}"

class AnexoContrato(models.Model):
    TIPO_ANEXO = [
        ('TECNICO', 'Anexo Técnico (Especificaciones)'),
        ('FINANCIERO', 'Anexo C (Lista de Precios)'),
        ('LEGAL', 'Legal/Administrativo'),
    ]
    
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='anexos_maestros')
    clave = models.CharField(max_length=100, null=True, blank=True)
    descripcion = models.CharField(max_length=100, null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_ANEXO, default='FINANCIERO')
    archivo = models.FileField(upload_to='contratos/anexos_maestros/', null=True, blank=True)
    monto_mn = models.DecimalField(max_digits=20, decimal_places=2, default=0, null=True, blank=True)
    monto_usd = models.DecimalField(max_digits=20, decimal_places=2, default=0, null=True, blank=True)
    activo = models.BooleanField(default=True)
    class Meta:
        db_table = 'contrato_anexo_maestro'

    def __str__(self):
        return f"{self.descripcion} ({self.contrato.numero_contrato})"

class SubAnexo(models.Model):
    anexo_maestro = models.ForeignKey(AnexoContrato, on_delete=models.CASCADE, related_name='sub_anexos')
    clave_anexo = models.CharField(max_length=50)
    descripcion = models.TextField()
    unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.CASCADE, null=True, blank=True)
    cantidad = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    precio_unitario_mn = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    precio_unitario_usd = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    importe_mn = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    importe_usd = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    class Meta:
        db_table = 'contrato_sub_anexo'
        ordering = ['clave_anexo']
        unique_together = ['anexo_maestro', 'clave_anexo']

    def __str__(self):
        return f"{self.clave_anexo} - {self.descripcion[:50]}..."

class ConceptoMaestro(models.Model):
    sub_anexo = models.ForeignKey(SubAnexo, on_delete=models.CASCADE, related_name='conceptos', null=True, blank=True)
    partida_ordinaria = models.CharField(max_length=50, null=True, blank=True)
    codigo_interno = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField()
    unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    precio_unitario_mn = models.DecimalField(max_digits=18, decimal_places=2, default=0, null=True, blank=True)
    precio_unitario_usd = models.DecimalField(max_digits=18, decimal_places=2, default=0, null=True, blank=True)
    id_tipo_partida = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 3})
    categoria = models.TextField(null=True, blank=True)
    subcategoria = models.TextField(null=True, blank=True)
    clasificacion = models.TextField(null=True, blank=True)

    #Esto aplica a PUEs separandolo por tipo de partida
    partida_extraordinaria = models.CharField(max_length=50, null=True, blank=True)
    pte_creacion = models.CharField(max_length=100, null=True, blank=True )
    ot_creacion = models.CharField(max_length=100, null=True, blank=True)
    fecha_autorizacion = models.DateField(null=True, blank=True)
    estatus = models.CharField(max_length=20, blank=True, null=True)

    comentario = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'contrato_concepto_maestro'
        indexes = [
            models.Index(fields=['partida_ordinaria']),
            models.Index(fields=['sub_anexo']),
        ]
        unique_together = ['sub_anexo', 'partida_ordinaria'] 

    def __str__(self):
        return f"{self.partida_ordinaria} ({self.sub_anexo.clave_anexo})"
        