from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from operaciones.models import Sitio
from tiempos_barco.models import PosicionEmbarcacion
from django.http import JsonResponse

@login_required(login_url='/accounts/login/')
def index(request):
    """
    Renderiza el Dashboard General de la Flota (Tiempos de Barco).
    """
    embarcaciones = Sitio.objects.filter(id__in=[1, 2], activo=True)
    contexto = {
        'embarcaciones': embarcaciones
    }
    return render(request, 'tiempos_barco/dashboard/index.html', contexto)

@login_required(login_url='/accounts/login/')
def posiciones_embarcacion(request):
    """
    Alimenta el mapa en tiempo real.
    """
    embarcaciones_activas = Sitio.objects.filter(id__in=[1, 2], activo=True)
    data = {}

    for emb in embarcaciones_activas:
        ultima_posicion = PosicionEmbarcacion.objects.filter(
            embarcacion=emb
        ).order_by('-timestamp').first()

        if ultima_posicion and ultima_posicion.punto:
            data[str(emb.id)] = {
                'lat': ultima_posicion.punto.y,
                'lng': ultima_posicion.punto.x,
                'nombre': emb.descripcion,
                'velocidad': float(ultima_posicion.velocidad_nudos)
            }
        else:
            data[str(emb.id)] = {
                'lat': 19.3452, 
                'lng': -91.8231, 
                'nombre': f"{emb.descripcion}",
                'velocidad': 0
            }

    return JsonResponse(data)