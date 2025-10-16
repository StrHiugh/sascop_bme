from django.shortcuts import render
from django.contrib.auth.decorators import login_required
# Create your views here.

@login_required
def index(request):
    """Dashboard principal"""
    context = {
        'modulo_actual': 'dashboard'
    }
    return render(request, 'core/dashboard.html', context)