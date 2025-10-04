from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from ..models import OTE

@login_required(login_url='/accounts/login/')
def lista_ote(request):
    """Lista de todas las OTE"""
    otes = OTE.objects.all().order_by('-fecha_inicio_programada')
    return render(request, 'operaciones/lista_ote.html', {'otes': otes})