/*
 * __filename__   : app.js
 * __author__     : ARMANDO PERERA
 * __description__: JS gobal para el sistema BME SUBTEC
 * __version__    : 1.0.0
 * __app__        : BME SUBTEC
 */

// JavaScript global para BME SUBTEC
// Funcionalidad del Layout
$(document).ready(function() {
    // Estado del sidebar
    let sidebarCollapsed = false;
    
    // Toggle sidebar
    $('#btn-toggle-sidebar').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if ($(window).width() < 769) {
            // En móvil: toggle del overlay
            toggleMobileSidebar();
        } else {
            // En desktop: toggle colapsado/expandido
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
            
            // Cerrar sidebar al hacer clic en el overlay
            $('.sidebar-overlay').click(function() {
                sidebar.removeClass('sidebar-open');
                $(this).remove();
            });
        }
        
        // Cambiar ícono
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
    
    // Activar elemento del menú actual - VERSIÓN ESPECÍFICA
    function activarMenuActual() {
        const currentUrl = window.location.pathname;
        
        // Remover active de todos
        $('.nav-link').removeClass('active');
        
        // Mapeo específico de URLs
        const urlMappings = {
            '/operaciones/': 'a[href="/operaciones/"]', // Inicio
            '/operaciones/pte/': 'a[href="/operaciones/pte/"]', // PTE's
            '/operaciones/ote/': 'a[href="/operaciones/ote/"]', // OTE's
            '/operaciones/produccion/': 'a[href="/operaciones/produccion/"]' // Producción
        };
        
        // Buscar coincidencia exacta primero
        if (urlMappings[currentUrl]) {
            $(urlMappings[currentUrl]).addClass('active');
        } else {
            // Si no hay coincidencia exacta, buscar por patrones
            for (const [url, selector] of Object.entries(urlMappings)) {
                if (currentUrl.startsWith(url) && url !== '/operaciones/') {
                    $(selector).addClass('active');
                    break;
                }
            }
        }
    }


    // Cerrar sidebar móvil al redimensionar a desktop
    $(window).resize(function() {
        if ($(window).width() >= 769) {
            $('#left-panel').removeClass('sidebar-open');
            $('.sidebar-overlay').remove();
            updateToggleIcon();
        } else {
            updateToggleIcon();
        }
    });
    
    // Inicializar
    activarMenuActual();
    updateToggleIcon();
    
    // Pantalla completa
    window.togglePantallaCompleta = function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error al activar pantalla completa: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };
});

    // Manejo de menús desplegables
document.addEventListener('DOMContentLoaded', function() {
    // Toggle submenus
    $('.nav-item.has-submenu .dropdown-toggle').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const parent = $(this).closest('.nav-item.has-submenu');
        const isActive = parent.hasClass('active');
        
        // Cerrar todos los submenus
        $('.nav-item.has-submenu').removeClass('active');
        
        // Abrir el actual si no estaba activo
        if (!isActive) {
            parent.addClass('active');
        }
    });
    
    // Cerrar submenus al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.nav-item.has-submenu').length) {
            $('.nav-item.has-submenu').removeClass('active');
        }
    });
    
    // Activar item actual en submenu
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