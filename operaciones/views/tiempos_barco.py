from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from ..models import Sitio


@login_required(login_url='/accounts/login/')
def lista_bitacoras_flota(request):
    """
    Renderiza el template principal del grid de Bitácoras de Flota.
    """
    # Embarcaciones = Sitios con ID 1 y 2
    embarcaciones = Sitio.objects.filter(id__in=[1, 2], activo=True)
    contexto = {
        'embarcaciones': embarcaciones
    }
    return render(request, 'operaciones/bitacora_flota/lista_bitacora.html', contexto)


@login_required(login_url='/accounts/login/')
def datatable_bitacoras(request):
    """
    Retorna el JSON para poblar el DataTable de jQuery de forma dinámica.
    """
    # TODO: Reemplazar mock data con consulta real a ReporteDiarioEmbarcacion
    # from ..models import ReporteDiarioEmbarcacion
    # qs = ReporteDiarioEmbarcacion.objects.all().select_related('embarcacion', 'representante')
    
    # Mock data para que el frontend funcione inicialmente
    data = [
        {
            "id": 1,
            "embarcacion": "BPD BLUE GIANT",
            "fecha": "2026-03-09",
            "representante": "Juan Pérez",
            "estado": "Borrador"
        }
    ]
    
    return JsonResponse({
        "data": data
    })
