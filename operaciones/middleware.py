# middleware.py
from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect

class SessionTimeoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Verificar última actividad
            last_activity = request.session.get('last_activity')
            if last_activity:
                idle_time = timezone.now().timestamp() - last_activity
                if idle_time > settings.SESSION_COOKIE_AGE:
                    # Sesión expirada
                    request.session.flush()
                    return redirect('operaciones:login?session_expired=1')
            
            # Actualizar última actividad
            request.session['last_activity'] = timezone.now().timestamp()
        
        response = self.get_response(request)
        return response