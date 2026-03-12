from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required(login_url='/accounts/login/')
def index(request):
    """
    Renderiza la vista de Control de Suministros.
    """
    return render(request, 'tiempos_barco/suministros/index.html')
