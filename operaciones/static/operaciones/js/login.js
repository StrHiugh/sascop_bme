// Funcionalidad para la página de login
$(document).ready(function() {
    // Verificar si hay error de login desde Django
    if (typeof loginError !== 'undefined' && loginError) {
        aviso('error', errorMessage || 'Usuario o contraseña incorrectos.');
    }
    
    // Verificar si el usuario ya está logueado (redirección desde Django)
    if (typeof userAuthenticated !== 'undefined' && userAuthenticated) {
        // Redirigir después de mostrar el mensaje
        window.location.href = "{% url 'operaciones:index' %}";
    }

    // Prevenir reenvío del formulario al usar el botón "atrás"
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }


    // Toggle entre login y recuperar contraseña
    $('.forgot-password-link').click(function(e) {
        e.preventDefault();
        $('.info-login-registro').hide();
        $('.info-recuperar-password').show();
    });
    
    $('.back-to-login-link').click(function(e) {
        e.preventDefault();
        $('.info-recuperar-password').hide();
        $('.info-login-registro').show();
    });
    
    $('#btn-close').click(function(e) {
        e.preventDefault();
        $('.info-recuperar-password').hide();
        $('.info-login-registro').show();
    });
    
    // Validación del formulario de login
    $('.login-form').submit(function(e) {
        const username = $('input[name="username"]').val();
        const password = $('input[name="password"]').val();

        if (!username || !password) {
            aviso('advertencia', 'Campos incompletos. Por favor, ingrese sus datos correctamente.');
            return false;
        }
        
        // Mostrar spinner solo si los campos están completos
        const button = $('.login-btn');
        const originalText = button.html();
        
        button.prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Iniciando sesión...
        `);
        
        // Timeout de seguridad para evitar spinner ciclado (10 segundos máximo)
        setTimeout(function() {
            button.prop('disabled', false).html(originalText);
        }, 2000);
    });
    
    // Validación del formulario de recuperación
    $('.recovery-btn').click(function(e) {
        e.preventDefault();
        const email = $('input[name="email"]').val();
        
        if (!email) {
            aviso('advertencia', 'Campos incompletos. Por favor, ingrese su correo electrónico.');
            return false;
        }
        
        // Mostrar spinner
        const button = $(this);
        const originalText = button.html();
        button.prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Enviando...
        `);

        // Simular envío de recuperación
        setTimeout(function() {
            // Restaurar botón
            button.prop('disabled', false);
            button.html(originalText);
            console.log(button.html())
            // Mostrar éxito
            aviso('exito','Se ha enviado un correo con las instrucciones para recuperar su contraseña.');
            
            // Regresar al login después de enviar
            $('.info-recuperar-password').hide();
            $('.info-login-registro').show();
            $('input[name="email"]').val('');
        }, 2000);
    });
    
    // Manejar específicamente el error CSRF
    $(document).ajaxError(function(event, xhr, settings, error) {
        if (xhr.status === 403 && xhr.responseText.includes('CSRF')) {
            aviso('error', 'La sesión ha expirado. Por favor, recarga la página e intenta nuevamente.');
            // Recargar la página para obtener un nuevo token CSRF
            setTimeout(function() {
                window.location.reload();
            }, 3000);
        }
    });

    // Animación simple de los inputs
    $('.form-input').focus(function() {
        $(this).css('border-color', '#434c5b');
        $(this).css('background-color', 'white');
    });
    
    $('.form-input').blur(function() {
        $(this).css('border-color', '#e9ecef');
        $(this).css('background-color', '#f8f9fa');
    });
    
    // Efecto hover simple en botones
    $('.login-btn, .recovery-btn').hover(
        function() {
            $(this).css('opacity', '0.9');
        },
        function() {
            $(this).css('opacity', '1');
        }
    );

});