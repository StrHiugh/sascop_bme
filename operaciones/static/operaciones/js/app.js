/*
 * __filename__   : app.js
 * __author__     : ARMANDO PERERA
 * __description__: JS gobal para el sistema BME SUBTEC
 * __version__    : 1.0.0
 * __app__        : BME SUBTEC
 */

let inactivityTimer;
$(document).ready(function() {
    if (typeof userAuthenticated !== 'undefined' && userAuthenticated) {
        startInactivityTimer();
    }
    let sidebarCollapsed = false;
    
    $('#btn-toggle-sidebar').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if ($(window).width() < 769) {
            toggleMobileSidebar();
        } else {
            toggleDesktopSidebar();
        }
    });
    
    function toggleMobileSidebar() {
        const sidebar = $('#left-panel');
        const overlay = $('.sidebar-overlay');
        
        if (sidebar.hasClass('sidebar-open')) {
            sidebar.removeClass('sidebar-open');
            overlay.removeClass('mobile-overlay');
        } else {
            sidebar.addClass('sidebar-open');
            $('body').append('<div class="sidebar-overlay mobile-overlay"></div>');
            
            $('.sidebar-overlay').click(function() {
                sidebar.removeClass('sidebar-open');
                $(this).remove();
            });
        }
        
        updateToggleIcon();
    }
    
    function toggleDesktopSidebar() {
        sidebarCollapsed = !sidebarCollapsed;
        
        if (sidebarCollapsed) {
            $('body').addClass('sidebar-collapsed');
            $('#left-panel').css('width', '60px');
            $('.main-content').css('margin-left', '0');
        } else {
            $('body').removeClass('sidebar-collapsed');
            $('#left-panel').css('width', '250px');
            $('.main-content').css('margin-left', '0');
        }
        
        updateToggleIcon();
    }
    
    function updateToggleIcon() {
        const toggleBtn = $('#btn-toggle-sidebar');
        const isMobile = $(window).width() < 769;
        const isOpen = $('#left-panel').hasClass('sidebar-open');
        
        if (isMobile) {
            if (isOpen) {
                toggleBtn.html('<i class="fas fa-times"></i>');
            } else {
                toggleBtn.html('<i class="fas fa-bars"></i>');
            }
        } else {
            if (sidebarCollapsed) {
                toggleBtn.html('<i class="fas fa-bars"></i>');
            } else {
                toggleBtn.html('<i class="fas fa-bars"></i>');
            }
        }
    }
    
    function activarMenuActual() {
        const currentUrl = window.location.pathname;
        
        $('.nav-link').removeClass('active');
        $('.nav-item.has-submenu').removeClass('active');
        
        let activeLink = $(`.nav-link[href="${currentUrl}"]`);
        
        if (!activeLink.length) {
            $('.nav-link').each(function() {
                const href = $(this).attr('href');
                if (href && currentUrl.startsWith(href) && href !== '/operaciones/') {
                    activeLink = $(this);
                    return false;  
                }
            });
        }
        
        if (activeLink.length) {
            activeLink.addClass('active');
            
            const submenuItem = activeLink.closest('.submenu .nav-item');
            if (submenuItem.length) {
                submenuItem.closest('.nav-item.has-submenu').addClass('active');
            }
        }
    }

    $(window).resize(function() {
        if ($(window).width() >= 769) {
            $('#left-panel').removeClass('sidebar-open');
            $('.sidebar-overlay').remove();
            updateToggleIcon();
        } else {
            updateToggleIcon();
        }
    });
    
    activarMenuActual();
    updateToggleIcon();
    
    window.togglePantallaCompleta = function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login_exitoso') === '1') {
        aviso("exito", "¡Bienvenido! Sesión iniciada correctamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get('session_expired') === '1') {
        aviso('advertencia', 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

function startInactivityTimer() {
    resetInactivityTimer();
    
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, function() {
            resetInactivityTimer();
        });
    });
    
    $(document).ajaxComplete(resetInactivityTimer);
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutPorInactividad, 7200000);
}

function logoutPorInactividad() {
    const isLoginPage = window.location.pathname.includes('login') || 
                        window.location.pathname === '/accounts/login/';
    
    if (!isLoginPage) {
        aviso('advertencia', 'Sesión expirada por inactividad. Serás redirigido al login.');
        
        setTimeout(function() {
            window.location.href = loginUrl + "?session_expired=1";
        }, 2000);
    }
}

window.limpiarTimerLogout = function() {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
    
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
    });
    
    return true;
};

document.addEventListener('DOMContentLoaded', function() {
    $('.nav-item.has-submenu .dropdown-toggle').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const parent = $(this).closest('.nav-item.has-submenu');
        const isActive = parent.hasClass('active');
        
        $('.nav-item.has-submenu').removeClass('active');
        
        if (!isActive) {
            parent.addClass('active');
        }
    });
    
    function activarSubmenuActual() {
        const currentUrl = window.location.pathname;
        $('.submenu .nav-link').each(function() {
            const linkUrl = $(this).attr('href');
            if (currentUrl === linkUrl) {
                $(this).addClass('active');
                $(this).closest('.nav-item.has-submenu').addClass('active');
            }
        });
    }
    activarSubmenuActual();
});