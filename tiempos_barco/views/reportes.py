from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required(login_url='/accounts/login/')
def index(request):
    """
    Renderiza la vista de Reportes PDF.
    """
    return render(request, 'tiempos_barco/reportes/index.html')
