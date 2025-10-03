from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.shortcuts import redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import PTEHeader, PTEDetalle, OTE, Produccion, Paso, Tipo, Sitio
from django.http import JsonResponse
from django.core import serializers
from .models import PTEHeader

# Vista de login personalizada
@ensure_csrf_cookie 
def custom_login(request):
    """Vista para login"""
    if request.user.is_authenticated:
        return redirect('operaciones:index')
    
    if request.method == 'POST':
        # Manejo de reintento de login si la sesión expiró
        if request.POST.get('is_retry'):
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'La sesión ha expirado. Por favor, ingresa tus datos nuevamente.'
            })
            
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('operaciones:index')
        else:
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'Usuario o contraseña incorrectos.'
            })
    
    return render(request, 'operaciones/login.html')

@login_required(login_url='/accounts/login/')
def index(request):
    """Página principal del sistema"""
    # Estadísticas básicas para el dashboard
    total_ptes = PTEHeader.objects.count()
    total_otes = OTE.objects.count()
    total_produccion = Produccion.objects.count()
    
    context = {
        'total_ptes': total_ptes,
        'total_otes': total_otes,
        'total_produccion': total_produccion,
    }
    return render(request, 'operaciones/index.html', context)

@login_required(login_url='/accounts/login/')
def lista_pte(request):
    """Lista de todos los PTE"""
    ptes = PTEHeader.objects.all().order_by('-fecha_solicitud')
    return render(request, 'operaciones/pte/lista_pte.html', {'ptes': ptes})

@login_required(login_url='/accounts/login/')
def detalle_pte(request, pte_id):
    """Detalle de un PTE específico"""
    pte = get_object_or_404(PTEHeader, id=pte_id)
    detalles = pte.detalles.all().order_by('id_paso__orden')
    
    context = {
        'pte': pte,
        'detalles': detalles,
    }
    return render(request, 'operaciones/detalle_pte.html', context)

@login_required(login_url='/accounts/login/')
def lista_ote(request):
    """Lista de todas las OTE"""
    otes = OTE.objects.all().order_by('-fecha_inicio_programada')
    return render(request, 'operaciones/lista_ote.html', {'otes': otes})

@login_required(login_url='/accounts/login/')
def lista_produccion(request):
    """Lista de producción"""
    producciones = Produccion.objects.all().order_by('-fecha_produccion')
    return render(request, 'operaciones/lista_produccion.html', {'producciones': producciones})

# APIs para jQuery
@login_required(login_url='/accounts/login/')
def api_estadisticas(request):
    """API para estadísticas del dashboard"""
    total_ptes = PTEHeader.objects.count()
    total_otes = OTE.objects.count()
    total_produccion = Produccion.objects.count()
    
    # Calcular volumen total de producción
    from django.db.models import Sum
    volumen_total = Produccion.objects.aggregate(
        total=Sum('volumen_produccion')
    )['total'] or 0
    
    return JsonResponse({
        'total_ptes': total_ptes,
        'total_otes': total_otes,
        'total_produccion': total_produccion,
        'volumen_total': float(volumen_total)
    })

@login_required(login_url='/accounts/login/')
def api_ptes(request):
    """API para lista de PTE con paginación"""
    pagina = request.GET.get('pagina', 1)
    elementos_por_pagina = request.GET.get('elementos_por_pagina', 10)
    
    ptes_list = PTEHeader.objects.all().order_by('-fecha_solicitud')
    paginator = Paginator(ptes_list, elementos_por_pagina)
    
    try:
        ptes = paginator.page(pagina)
    except:
        ptes = paginator.page(1)
    
    ptes_data = []
    for pte in ptes:
        ptes_data.append({
            'id': pte.id,
            'oficio_pte': pte.oficio_pte,
            'descripcion_trabajo': pte.descripcion_trabajo,
            'fecha_solicitud': pte.fecha_solicitud.strftime('%Y-%m-%d'),
            'responsable_proyecto': pte.responsable_proyecto,
            'estatus': pte.estatus,
        })
    
    return JsonResponse({
        'ptes': ptes_data,
        'total_paginas': paginator.num_pages,
        'pagina_actual': ptes.number,
    })

@login_required(login_url='/accounts/login/')
def api_pte_detalle(request, pte_id):
    """API para detalle de un PTE específico"""
    pte = get_object_or_404(PTEHeader, id=pte_id)
    
    detalles_data = []
    for detalle in pte.detalles.all().order_by('id_paso__orden'):
        detalles_data.append({
            'paso_descripcion': detalle.id_paso.descripcion,
            'estatus_pte': detalle.estatus_pte,
            'fecha_entrega': detalle.fecha_entrega.strftime('%Y-%m-%d') if detalle.fecha_entrega else None,
            'comentario': detalle.comentario,
        })
    
    pte_data = {
        'id': pte.id,
        'oficio_pte': pte.oficio_pte,
        'descripcion_trabajo': pte.descripcion_trabajo,
        'fecha_solicitud': pte.fecha_solicitud.strftime('%Y-%m-%d'),
        'plazo_dias': pte.plazo_dias,
        'responsable_proyecto': pte.responsable_proyecto,
        'estatus': pte.estatus,
        'detalles': detalles_data,
    }
    
    return JsonResponse(pte_data)


def datatable_ptes(request):
    # Esta es una implementación básica - deberás adaptarla a tu modelo
    draw = int(request.GET.get('draw', 1))
    start = int(request.GET.get('start', 0))
    length = int(request.GET.get('length', 10))
    search_value = request.GET.get('search[value]', '')

    # Filtrado básico
    ptes = PTEHeader.objects.all()
    
    if search_value:
        ptes = ptes.filter(descripcion__icontains=search_value)
    
    total_records = ptes.count()
    ptes = ptes[start:start + length]
    
    data = []
    for pte in ptes:
        data.append({
            'id': pte.id,
            'codigo': pte.codigo,
            'descripcion': pte.descripcion,
            'estado': pte.estado,
            'fecha_inicio': pte.fecha_inicio.isoformat() if pte.fecha_inicio else None,
            'fecha_fin': pte.fecha_fin.isoformat() if pte.fecha_fin else None,
            'responsable': pte.responsable.nombre if pte.responsable else '',
            'avance': pte.avance or 0,
        })
    
    return JsonResponse({
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': total_records,
        'data': data
    })