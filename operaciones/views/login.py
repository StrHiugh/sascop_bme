from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib import messages
from django.utils import timezone
from django.contrib.auth.views import LogoutView

@ensure_csrf_cookie 
def custom_login(request):
    """Vista para login"""
    if request.user.is_authenticated:
        return redirect('operaciones:index')
    
    # Verificar si la sesión expiró
    session_expired = request.GET.get('session_expired')
    is_retry = request.POST.get('is_retry')
    
    if request.method == 'POST':
        if is_retry or session_expired:
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'La sesión ha expirado por inactividad. Por favor, ingresa tus datos nuevamente.'
            })
            
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            # Establecer última actividad
            request.session['last_activity'] = timezone.now().timestamp()
            response = redirect('operaciones:index')
            response['Location'] += '?login_exitoso=1'
            return response
        else:
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'Usuario o contraseña incorrectos.'
            })
    
    # Contexto para template
    context = {}
    if session_expired:
        context.update({
            'login_error': True,
            'error_message': 'La sesión ha expirado por inactividad. Por favor, ingresa tus datos nuevamente.'
        })
    
    return render(request, 'operaciones/login.html', context)

class CustomLogoutView(LogoutView):
    """LogoutView personalizado que limpia la variable de sesión de actividad"""
    
    def dispatch(self, request, *args, **kwargs):
        # Limpiar la variable de sesión antes de hacer logout
        if 'last_activity' in request.session:
            del request.session['last_activity']
        
        # También limpiar cualquier otra variable de sesión relacionada
        request.session.save()
        
        return super().dispatch(request, *args, **kwargs)
    
    def get_next_page(self):
        """Redirigir al login con parámetro de logout exitoso"""
        next_page = super().get_next_page()
        # Agregar parámetro para identificar logout exitoso
        if next_page and 'login' in next_page:
            return f"{next_page}?logout_exitoso=1"
        elif next_page:
            return f"{next_page}?logout_exitoso=1"
        else:
            return "/accounts/login/?logout_exitoso=1"