from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.db.models import Q
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib import messages
from django.utils import timezone
from django.contrib.auth.views import LogoutView

@ensure_csrf_cookie 
def custom_login(request):
    """Vista para login que acepta username o email"""
    if request.user.is_authenticated:
        return redirect('core:dashboard')
    
    # Verificar si la sesión expiró
    session_expired = request.GET.get('session_expired')
    is_retry = request.POST.get('is_retry')
    
    if request.method == 'POST':
        if is_retry or session_expired:
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'La sesión ha expirado por inactividad. Por favor, ingresa tus datos nuevamente.'
            })
            
        username_or_email = request.POST.get('username')
        password = request.POST.get('password')
        
        # PRIMERO intentar autenticar normalmente (con username)
        user = authenticate(request, username=username_or_email, password=password)
        
        # SI FALLA, buscar por email
        if user is None:
            try:
                # Buscar usuario por email
                user_by_email = User.objects.get(email__iexact=username_or_email)
                # Intentar autenticar con el username real del usuario
                user = authenticate(request, username=user_by_email.username, password=password)
            except User.DoesNotExist:
                user = None
            except User.MultipleObjectsReturned:
                # Si hay múltiples usuarios con el mismo email, tomar el primero
                user_by_email = User.objects.filter(email__iexact=username_or_email).first()
                if user_by_email:
                    user = authenticate(request, username=user_by_email.username, password=password)
        
        if user is not None:
            login(request, user)
            # Establecer última actividad
            request.session['last_activity'] = timezone.now().timestamp()
            response = redirect('core:dashboard')
            response['Location'] += '?login_exitoso=1'
            return response
        else:
            return render(request, 'operaciones/login.html', {
                'login_error': True,
                'error_message': 'Usuario/email o contraseña incorrectos.'
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