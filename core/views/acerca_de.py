from django.shortcuts import render
from django.contrib.auth.decorators import login_required
# Create your views here.

@login_required
def index(request):
    """Acerca de SASCOP"""
    context = {
        'modulo_actual': 'acerca_de'
    }
    return render(request, 'core/acerca_de/acerca_de.html', context)