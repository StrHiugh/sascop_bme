from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from ..models import Produccion

@login_required(login_url='/accounts/login/')
def lista_produccion(request):
    """Lista de producción"""
    producciones = Produccion.objects.all().order_by('-fecha_produccion')
    return render(request, 'operaciones/lista_produccion.html', {'producciones': producciones})