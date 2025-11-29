from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from ..models import RegistroActividad
from django.http import JsonResponse
from django.db.models import Q
import json
from django.utils import timezone
from django.contrib.auth.models import User 

@login_required(login_url='/accounts/login/')
def registro_actividad(request):
    """Index de registro de actividad"""
    return render(request, 'operaciones/registro_actividad/registro_actividad.html')

@login_required
def datatable_registro_actividad(request):
    """DataTable para registro de actividad global"""
    
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('filtro', '')
    
    # Parámetros de filtro
    usuario_id = request.GET.get('usuario_id')
    evento = request.GET.get('evento')
    afectacion = request.GET.get('afectacion')
    
    # Consulta
    registros = RegistroActividad.objects.select_related('usuario_id').all()
    
    # Aplicar filtros
    if search_value:
        registros = registros.filter(
            Q(valor_anterior__icontains=search_value) |
            Q(valor_actual__icontains=search_value) |
            Q(evento__icontains=search_value) |
            Q(afectacion__icontains=search_value) |
            Q(detalle__icontains=search_value) |
            Q(fecha__icontains=search_value) |
            Q(campo__icontains=search_value) |
            Q(usuario_id__first_name__icontains=search_value) |
            Q(usuario_id__last_name__icontains=search_value) |
            Q(usuario_id__email__icontains=search_value)
        )
    
    if usuario_id:
        registros = registros.filter(usuario_id_id=usuario_id)
    
    if evento:
        registros = registros.filter(evento=evento)
    
    if afectacion:
        registros = registros.filter(tabla_log=afectacion)
    
    # Ordenamiento
    order_column = request.GET.get('order[0][column]', '0')
    order_dir = request.GET.get('order[0][dir]', 'desc')
    
    column_map = {
        '0': 'id',
        '1': 'evento', 
        '2': 'afectacion',
        '3': 'detalle',
        '4': 'fecha',
        '5': 'usuario__first_name',
    }
    
    order_field = column_map.get(order_column, 'fecha')
    if order_dir == 'desc':
        order_field = f'-{order_field}'
    
    registros = registros.order_by(order_field)
    
    total_records = registros.count()
    registros_paginados = registros[start:start + length]
    
    # Preparar datos para DataTable
    data = []
    for registro in registros_paginados:
        fecha_local = timezone.localtime(registro.fecha) if registro.fecha else None
        data.append({
            'tabla': 'global',
            'tabla_log': registro.tabla_log,
            'id': registro.id,
            'valor_anterior': registro.valor_anterior or '',
            'valor_actual': registro.valor_actual or '',
            'evento': registro.evento,
            'afectacion': registro.afectacion or '',
            'detalle_evento': registro.detalle or '',
            'fecha_formateada': fecha_local.strftime('%d/%m/%Y %H:%M:%S') if fecha_local else '',
            'fecha': fecha_local.isoformat() if fecha_local else '',
            'campo': registro.campo or '',
            'usuario_id': registro.usuario_id.id,
            'nombre_completo': f"{registro.usuario_id.first_name or ''} {registro.usuario_id.last_name or ''}".strip(),
            'email': registro.usuario_id.email or ''
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': RegistroActividad.objects.count(),
        'recordsFiltered': total_records,
        'data': data
    })
    

@login_required(login_url='/accounts/login/')
def obtener_usuarios(request):
    """Obtener todos los usuarios activos"""
    try:
        usuarios = User.objects.filter(is_active=True).values(
            'id', 
            'username', 
            'first_name', 
            'last_name', 
            'email'
        )
        
        usuarios_list = []
        for usuario in usuarios:
            usuarios_list.append({
                'id': usuario['id'],
                'username': usuario['username'],
                'first_name': usuario['first_name'] or '',
                'last_name': usuario['last_name'] or '',
                'email': usuario['email'] or '',
                'descripcion': f"{usuario['first_name'] or ''} {usuario['last_name'] or ''} ({usuario['username']})".strip()
            })
        
        return JsonResponse(usuarios_list, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)