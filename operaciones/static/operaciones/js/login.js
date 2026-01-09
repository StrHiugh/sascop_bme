$(document).ready(function() {
    if (typeof loginError !== 'undefined' && loginError) {
        aviso('error', errorMessage || 'Usuario o contraseña incorrectos.')
    }
    
    if (typeof userAuthenticated !== 'undefined' && userAuthenticated) {
        window.location.href = "{% url 'operaciones:index' %}";
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout_exitoso') === '1') {
        aviso('exito', 'Sesión cerrada correctamente.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }

    $('.login-form input').on('keypress', function(e) {
        if (e.which === 13) {
            $('.login-form').submit();
            return false; 
        }
    });

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
    
    $('.login-form').submit(function(e) {
        e.preventDefault();
        const form = this;
        const username = $('input[name="username"]').val();
        const password = $('input[name="password"]').val();
        
        if (!username || !password) {
            aviso('advertencia', 'Campos incompletos. Por favor, ingrese sus datos correctamente.');
            return false;
        }
        
        const button = $('.login-btn');
        const originalText = button.html();
        
        iniciarLoader();
        button.prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Iniciando sesión...
            `);
            
        setTimeout(function() {
            form.submit();
            finalizarLoader();
        }, 2000);
    });
    
    $('.recovery-btn').click(function(e) {
        e.preventDefault();
        const email = $('input[name="email"]').val();
        
        if (!email) {
            aviso('advertencia', 'Campos incompletos. Por favor, ingrese su correo electrónico.');
            return false;
        }
        
        const button = $(this);
        const originalText = button.html();
        button.plrop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Enviando...
        `);

        setTimeout(function() {
            button.prop('disabled', false);
            button.html(originalText);
            aviso('exito','Se ha enviado un correo con las instrucciones para recuperar su contraseña.');
            
            $('.info-recuperar-password').hide();
            $('.info-login-registro').show();
            $('input[name="email"]').val('');
        }, 2000);
    });
    
    $(document).ajaxError(function(event, xhr, settings, error) {
        if (xhr.status === 403 && xhr.responseText.includes('CSRF')) {
            aviso('error', 'La sesión ha expirado. Por favor, recarga la página e intenta nuevamente.');
            setTimeout(function() {
                window.location.reload();
            }, 3000);
        }
    });

    $('.form-input').focus(function() {
        $(this).css('border-color', '#434c5b');
        $(this).css('background-color', 'white');
    });
    
    $('.form-input').blur(function() {
        $(this).css('border-color', '#e9ecef');
        $(this).css('background-color', '#f8f9fa');
    });
    
    $('.login-btn, .recovery-btn').hover(
        function() {
            $(this).css('opacity', '0.9');
        },
        function() {
            $(this).css('opacity', '1');
        }
    );

});