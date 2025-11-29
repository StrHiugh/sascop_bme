from .pte_models import PTEHeader, PTEDetalle, Paso
from .catalogos_models import Tipo, Frente, Estatus, Sitio, UnidadMedida, ResponsableProyecto, Cliente
from .ote_models import OTE, PasoOt, OTDetalle
from .produccion_models import Produccion, Producto
from .registro_actividad_models import RegistroActividad
__all__ = [
    'PTEHeader', 'PTEDetalle', 'Paso', 'Tipo',
    'OTE', 'PasoOt', 'OTDetalle', 'Sitio', 'Estatus', 'Frente', 
    'UnidadMedida', 'Produccion', 'Producto', 'ResponsableProyecto', 'RegistroActividad','Cliente'
]