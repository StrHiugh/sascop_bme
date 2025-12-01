from django.db import models
from .catalogos_models import Sitio, Estatus, ResponsableProyecto, Tipo, Cliente
from .pte_models import PTEHeader

class OTE(models.Model): 
    id_tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 2})
    id_pte_header = models.ForeignKey(PTEHeader, on_delete=models.CASCADE)
    orden_trabajo = models.CharField(max_length=100)
    descripcion_trabajo = models.TextField()
    id_responsable_proyecto = models.ForeignKey(ResponsableProyecto, on_delete=models.CASCADE)
    responsable_cliente = models.CharField(max_length=200)
    oficio_ot = models.CharField(max_length=100)
    id_estatus_ot = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 2})
    fecha_inicio_programado = models.DateField(blank=True, null=True)
    fecha_inicio_real = models.DateField(blank=True, null=True)
    fecha_termino_programado = models.DateField(blank=True, null=True)
    fecha_termino_real = models.DateField(blank=True, null=True)
    estatus = models.IntegerField(default=1)
    num_reprogramacion = models.IntegerField(null=True, blank=True)
    ot_principal = models.IntegerField(null=True, blank=True)
    comentario = models.TextField(blank=True) 
    monto_mxn = models.DecimalField(decimal_places=6, max_digits=25, null=True, blank=True, default=0)
    monto_usd = models.DecimalField(decimal_places=6, max_digits=25, null=True, blank=True, default=0)
    id_frente = models.IntegerField(null=True, blank=True)
    id_embarcacion = models.IntegerField(null=True, blank=True)
    id_plataforma = models.IntegerField(null=True, blank=True)
    id_intercom = models.IntegerField(null=True, blank=True)
    id_patio = models.IntegerField(null=True, blank=True)
    plazo_dias = models.IntegerField(null=True, blank=True)
    id_cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, null=True, blank=True)
    class Meta:
        db_table = 'ot'

    @classmethod
    def con_sitios(cls, **filters):
        """
            Clase para filtar por sitio
        """
        ots = list(cls.objects.filter(**filters))
        
        if not ots:
            return ots
            
        sitio_ids = set()
        for ot in ots:
            if ot.id_embarcacion: sitio_ids.add(ot.id_embarcacion)
            if ot.id_plataforma: sitio_ids.add(ot.id_plataforma)
            if ot.id_intercom: sitio_ids.add(ot.id_intercom)
            if ot.id_patio: sitio_ids.add(ot.id_patio)
        
        sitios_dict = {}
        if sitio_ids:
            sitios_dict = {sitio.id: sitio for sitio in Sitio.objects.filter(id__in=sitio_ids)}
        
        for ot in ots:
            ot.embarcacion_obj = sitios_dict.get(ot.id_embarcacion)
            ot.plataforma_obj = sitios_dict.get(ot.id_plataforma) 
            ot.intercom_obj = sitios_dict.get(ot.id_intercom)
            ot.patio_obj = sitios_dict.get(ot.id_patio)

        return ots

    def __str__(self):
        return self.orden_trabajo

class PasoOt(models.Model):
    descripcion = models.CharField(max_length=200)
    orden = models.CharField(blank=True, null=True, max_length=10)
    activo = models.BooleanField(default=True)
    importancia = models.FloatField(default=0, blank=True, null=True)
    tipo = models.ForeignKey(Tipo, on_delete=models.CASCADE, blank=True, null=True, default=1, related_name='tipos_ot')
    comentario = models.TextField(blank=True, null=True)
    id_tipo_cliente = models.ForeignKey(Tipo, on_delete=models.CASCADE, null=True, blank=True, related_name='tipo_cliente')

    class Meta:
        db_table = 'paso_ot'
        ordering = ['orden']

    def __str__(self):
        return f"{self.orden}. {self.descripcion}"

class OTDetalle(models.Model):
    id_ot = models.ForeignKey(OTE, on_delete=models.CASCADE, related_name='detalles')
    estatus_paso = models.ForeignKey(Estatus, on_delete=models.CASCADE, limit_choices_to={'nivel_afectacion': 4})
    id_paso = models.ForeignKey(PasoOt, on_delete=models.CASCADE)
    fecha_entrega = models.DateField(null=True, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_termino = models.DateField(null=True, blank=True)
    comentario = models.TextField(blank=True, null=True)
    archivo = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'ot_detalle'
        ordering = ['id_paso__id']

    def __str__(self):
        return f"Detalle {self.id} - OT {self.id_ot.orden_trabajo}"

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