import json
from functools import wraps
from operaciones.models import RegistroActividad
from django.utils import timezone
# Configuración de tablas para el log
TABLAS_LOG = [
    "PTE Header",                   # 0
    "PTE Detalle",                  # 1  
    "Paso",                         # 2
    "Tipo",                         # 3
    "OT",                           # 4
    "OT Detalle",                   # 5
    "Sitio",                        # 6
    "Estatus",                      # 7
    "Embarcacion",                  # 8
    "Unidad Medida",                # 9
    "Produccion",                   # 10
    "Producto",                     # 11
    "Responsable Proyecto",         # 12
]

IGNORAR_CAMPOS = ["csrfmiddlewaretoken", "registro_actividad"]

def registrar_actividad(view_func):
    """
    Decorador para registrar automáticamente las actividades realizadas en las vistas.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # 1. Ejecutamos la vista original primero para obtener la respuesta
        response = view_func(request, *args, **kwargs)
        
        if (request.method == 'POST' and 
            request.user.is_authenticated and
            hasattr(response, 'content')):
            
            try:
                response_data = json.loads(response.content)
                
                if response_data.get('exito'):
                    registro_data = None
                    if request.content_type == 'application/json':
                        try:
                            cuerpo_json = json.loads(request.body.decode('utf-8'))
                            registro_data = cuerpo_json.get('registro_actividad')
                        except json.JSONDecodeError:
                            pass
                    else:
                        registro_data = request.POST.get('registro_actividad')
                    if registro_data:
                        _procesar_registro_actividad(request, registro_data, response_data)
                        
            except (ValueError, json.JSONDecodeError):
                pass
                
        return response
    return _wrapped_view


def _procesar_registro_actividad(request, registro_data, response_data):
    """Procesa y guarda los registros de actividad en la base de datos."""
    if not registro_data or registro_data == "null":
        return
    
    try:
        registro_json = json.loads(registro_data)
        tabla_log = registro_json.get("tabla_log")
        evento_principal = registro_json.get("evento", "EDITAR")
        registro_id = registro_json.get("registro_id")
        cambios = registro_json.get("cambios", [])
        print ("llego aquii")
        if evento_principal in ["REGISTRAR", "REACTIVAR", "CREAR"]:
            registro_id = response_data.get('registro_id', registro_id)
        
        if not cambios:
            return
        
        registros_a_guardar = []
        
        for cambio in cambios:
            nombre_campo = cambio.get("nombre", "")
            
            if nombre_campo in IGNORAR_CAMPOS:
                continue
            
            registro = RegistroActividad(
                tabla_log=tabla_log,
                registro_id=registro_id,
                evento=cambio.get("evento", evento_principal),
                campo=nombre_campo,
                valor_anterior=cambio.get("valor_anterior", ""),
                valor_actual=cambio.get("valor_actual", ""),
                afectacion=_obtener_nombre_tabla(tabla_log),
                usuario_id_id=request.user.id,
                detalle=cambio.get("detalle", ""),
                fecha = timezone.localtime()
            )
            registros_a_guardar.append(registro)
        if registros_a_guardar:
            RegistroActividad.objects.bulk_create(registros_a_guardar)
            
    except Exception as e:
        return

def _obtener_nombre_tabla(tabla_log_id):
    """Obtiene el nombre legible de la tabla basado en su ID."""
    if 0 <= tabla_log_id < len(TABLAS_LOG):
        return TABLAS_LOG[tabla_log_id]
    return "Desconocido"