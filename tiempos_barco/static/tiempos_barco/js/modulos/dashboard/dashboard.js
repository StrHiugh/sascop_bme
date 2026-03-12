$(document).ready(function() {
    let embarcacionesData = {};
    let map = L.map('map-container').setView([19.3452, -91.8231], 6);
    let marcadoresActivos = [];

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM'
    }).addTo(map);

    let shipIcon = L.divIcon({
        html: `
            <div class="ship-marker-container">
                <div class="radar-pulse"></div>
                <i class="fa-solid fa-ship" style="color: #f05523; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); position: relative; z-index: 2;"></i>
            </div>
        `,
        className: 'custom-ship-icon',
        iconSize: [40, 40],   
        iconAnchor: [20, 20]  
    });


    function limpiarMarcadores() {
        marcadoresActivos.forEach(m => map.removeLayer(m));
        marcadoresActivos = [];
    }

    function agregarMarcador(data) {
        let tooltipContent = `
            <div style="text-align: center; line-height: 1.2;">
                <strong style="color: #20145f; font-size: 13px;">${data.nombre}</strong><br>
                <span style="font-size: 11px; color: #54565a;">
                    Lat: ${data.lat.toFixed(4)} | Lon: ${data.lng.toFixed(4)}
                </span>
            </div>
        `;

        let marker = L.marker([data.lat, data.lng], {icon: shipIcon})
            .addTo(map)
            .bindTooltip(tooltipContent, {
                permanent: false, 
                direction: 'top', 
                offset: [0, -10]
            });
        marcadoresActivos.push(marker);
    }

    function renderizarMapa() {
        let val = $('#dashboard_embarcacion').val();
        let text = $('#dashboard_embarcacion').find("option:selected").text().toUpperCase();
        
        limpiarMarcadores();

        if (val === 'todas') {
            $('#titulo-embarcacion').text('EMBARCACIONES');
            $('#tarjeta-coordenadas').fadeOut(200); 
            
            let limites = [];
            for (let id in embarcacionesData) {
                let barco = embarcacionesData[id];
                agregarMarcador(barco);
                limites.push([barco.lat, barco.lng]);
            }
            
            if (limites.length > 0 && !window.mapaIniciado) {
                map.fitBounds(limites, { padding: [50, 50], maxZoom: 8 });
                window.mapaIniciado = true;
            }

        } else {
            let data = embarcacionesData[val];
            if (!data) return;
            
            $('#titulo-embarcacion').text('EMBARCACIÓN: ' + text);
            $('#tarjeta-coordenadas').fadeIn(200);
            $('#val-lat').text('LAT: ' + data.lat.toFixed(4) + ' N');
            $('#val-lng').text('LON: ' + data.lng.toFixed(4) + ' W');

            agregarMarcador(data);
            
            let nuevaPosicion = new L.LatLng(data.lat, data.lng);
            
            if(!window.viendoBarcoUnico || window.ultimoBarcoVisto !== val) {
                map.flyTo(nuevaPosicion, 8, { animate: true, duration: 1.5 });
                window.viendoBarcoUnico = true;
                window.ultimoBarcoVisto = val;
            } else {
                map.panTo(nuevaPosicion); 
            }
        }
    }

    function cargarPosicionesDesdeBD() {
        $.ajax({
            url: urlPosicionesEmbarcacion,
            type: 'GET',
            dataType: 'json',
            success: function(respuestaJSON) {
                embarcacionesData = respuestaJSON;
                renderizarMapa();
            },
            error: function(err) {
                console.error("Error obteniendo posiciones:", err);
            }
        });
    }

    $('#dashboard_embarcacion').change(function() {
        window.viendoBarcoUnico = false;
        window.mapaIniciado = false;
        renderizarMapa(); 
    });

    cargarPosicionesDesdeBD();

    // Lógica para Expandir/Contraer ocultando el panel derecho
    // Lógica para Expandir/Contraer ocultando el panel derecho
    $('#btn-fullscreen-map').click(function() {
        let icon = $(this).find('i');
        let mapCol = $('#map-col');
        let sideCol = $('#side-panel-col');
        
        // Verificamos usando las clases de Bootstrap en lugar de :visible
        if (!sideCol.hasClass('d-none')) {
            // EXPANDIR MAPA
            // 1. Ocultamos el panel lateral quitando flex y poniendo d-none
            sideCol.removeClass('d-flex').addClass('d-none');
            // 2. Expandimos el mapa a 12 columnas
            mapCol.removeClass('col-lg-9').addClass('col-12');
            
            icon.removeClass('fa-expand').addClass('fa-compress');
            $(this).attr('title', 'Mostrar Panel Lateral');
            
            setTimeout(() => { map.invalidateSize(); }, 350);
        } else {
            // CONTRAER MAPA
            // 1. Regresamos el mapa a 9 columnas
            mapCol.removeClass('col-12').addClass('col-lg-9');
            
            icon.removeClass('fa-compress').addClass('fa-expand');
            $(this).attr('title', 'Expandir Mapa');
            
            // 2. TRUCO: Esperamos 300ms a que el mapa termine de encogerse 
            // antes de volver a pintar el panel. Así evitamos que se vaya hacia abajo.
            setTimeout(() => {
                sideCol.removeClass('d-none').addClass('d-flex');
                map.invalidateSize(); 
            }, 300);
        }
    });

});