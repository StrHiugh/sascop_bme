from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import ensure_csrf_cookie

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