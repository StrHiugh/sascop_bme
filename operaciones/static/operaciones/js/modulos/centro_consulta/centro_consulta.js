/* static/operaciones/js/modulos/centro_consulta/centro_consulta.js */

function badgeTipo(tipo) {
    const claseMapa = {
        'OT': 'badge-tipo-ot',
        'PTE': 'badge-tipo-pte',
        'PROD': 'badge-tipo-prod'
    };
    const claseColor = claseMapa[tipo] || 'badge-tipo-default';
    
    return `<span class="badge-tipo ${claseColor}">${tipo}</span>`;
}

function celdaFolio(row) {
    return `<div class="celda-contenedor">
                <div class="texto-principal">${row.folio}</div>
                <div class="texto-secundario">${row.cliente}</div>
            </div>`;
}

function celdaMeta(row) {
    const lider = row.lider || "Sin Líder";
    const frente = row.frente ? `Frente: ${row.frente}` : `Cliente: ${row.cliente}`;
    const htmlSitio = row.sitio
        ? `<div class="meta-sitio"><i class="fas fa-map-marker-alt"></i>${row.sitio}</div>` 
        : '';

    return `<div class="celda-contenedor">
                <div class="texto-lider">${lider}</div>
                <div class="texto-secundario">${frente}</div>
                ${htmlSitio}
            </div>`;
}

function formatFecha(s) {
    if (!s || s === 'NO ENTREGADO') return "—";

    if (s.includes('/')) {
        const partes = s.split('/');
        if (partes.length === 3) {
            const M = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
            const mesIndex = parseInt(partes[1]) - 1;
            return `${partes[0]}/${M[mesIndex]}/${partes[2]}`;
        }
    }
    return s;
}
function celdaAccion(row) {
   const flexClasses = "d-inline-flex align-items-center justify-content-center gap-1";
   const badgeStyle = "font-size: 0.75rem; min-width: 90px; padding: 5px 8px;";

   if (row.archivo !== "Sin archivo" && row.archivo.trim() !== '') {
       const esDescarga = /\.(xlsx|xls|csv|zip)$/i.test(row.archivo);
       const icono = esDescarga ? "fa-download" : "fa-eye";
       const label = esDescarga ? "Bajar" : "Ver";
       const atributos = esDescarga ? 'download' : 'target="_blank"';

       return `<a href="${row.archivo}" ${atributos} class="btn-accion-tabla activo text-decoration-none ${flexClasses}">
                <i class="fas ${icono}"></i>${label}
               </a>`;
   }

   if (row.estatus_paso_id == 14) {
       return `<span class="badge bg-secondary text-white fw-normal ${flexClasses}" style="${badgeStyle}">
                 <i class="fas fa-ban" style="font-size: 0.7rem;"></i>No aplica
               </span>`;
   }

   return `<span class="badge bg-transparent border text-muted fw-normal ${flexClasses}" style="${badgeStyle} color: #54565a !important; border-color: #ccc !important;">
             <i class="fas fa-clock" style="font-size: 0.7rem;"></i>Pendiente
           </span>`;
}
let tabla;

$(document).ready(function() {
    const panelElement = document.getElementById("panelFiltros");
    let offcanvasPanel = null;

    $("#chk_entregados, #chk_pendientes").prop("checked", true); 
    $("input[name='origen']").prop("checked", true);
    $("#orig_pro").prop("checked", false);
    $("#chk_buscar_por_frente").prop("checked", true);

    if (panelElement) {
        offcanvasPanel = new bootstrap.Offcanvas(panelElement);
        $("#btn-panel-filtros").on("click", function(e) {
            e.preventDefault();
            cargarCatalogo(urlObtenerResponsables, "#filtro-lider");
            cargarCatalogo(urlObtenerClientes, "#filtro-cliente");
            cargarCatalogo(urlObtenerFrentes, "#filtro-frente");
            cargarCatalogo(urlObtenerEstatus, "#filtro-estatus");
            cargarCatalogo(urlObtenerTiposDoc, "#filtro-tipo-doc");
            if ($("#filtro-sitio option").length <= 1) {
                const esJerarquia = $("#chk_buscar_por_frente").is(":checked");
                if (!esJerarquia) fn_gestionar_carga_sitios(null, false);
            }
            offcanvasPanel.show();
        });
    }

    $("#filtro-frente").on("change", function() {
        const idFrente = $(this).val();
        const esJerarquia = $("#chk_buscar_por_frente").is(":checked");
        $("#filtro-sitio").empty().append("<option value=''>Actualizando...</option>").trigger("change");

        if (esJerarquia) {
            if (idFrente) {
                fn_gestionar_carga_sitios(idFrente, true);
            } else {
                $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
                fn_asegurar_select2($("#filtro-sitio"));
            }
        } else {
            fn_gestionar_carga_sitios(null, false);
        }
    });

    $("#chk_buscar_por_frente").on("change", function() {
        const esJerarquia = $(this).is(":checked");
        const selectFrente = $("#filtro-frente");
        const contenedorFrente = selectFrente.closest(".mb-3");

        $("#filtro-sitio").empty().append("<option value=''>Actualizando...</option>").trigger("change");

        if (!esJerarquia) {
            contenedorFrente.slideUp();
            selectFrente.val(null).trigger('change.select2');
            fn_gestionar_carga_sitios(null, false);
        } else {
            contenedorFrente.slideDown();
            $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
            fn_asegurar_select2($("#filtro-sitio"));
        }
    });

    tabla = $("#tabla-resultados").DataTable({
        data: null,
        pageLength: 10,
        language: { url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },
        dom: "rtip",
        columns: [
            { title: "Origen", data: "tipo", width: "70px", className: "text-center align-middle", render: (d) => badgeTipo(d) },
            { title: "Folio / Proyecto", data: null, className: "align-middle", render: (d, t, row) => celdaFolio(row) },
            { title: "Metadatos (Líder/Frente)", data: null, className: "align-middle", render: (d, t, row) => celdaMeta(row) },
            { title: "Documento / Entregable", data: "documento", className: "align-middle" },
            { title: "Fecha", data: "fecha", width: "100px", className: "align-middle text-nowrap", render: (d) => formatFecha(d) },
            { title: "Acción", data: null, orderable: false, width: "70px", className: " text-center align-middle", render: (d, t, row) => celdaAccion(row) },
        ],
        drawCallback: function() {
            const i = this.api().page.info();
            $("#badge-registros").text(`Mostrando ${i.start + 1}–${Math.min(i.end, i.recordsDisplay)} de ${i.recordsDisplay} registros`);
        },
        initComplete: function() {
            $("#select-length").html($("#tabla-resultados_length").detach());
        }
    });

    $("#filtro-buscar").on("keyup", function(e) {
        if (e.key === "Enter" || !$(this).val()) tabla.search($(this).val()).draw();
    });

    $("#btn-ejecutar").on("click", function () {
        const btn = $(this);
        const originalText = btn.html();
        
        const datos_filtros = {
            "origenes": $("input[name='origen']:checked").map(function() { return $(this).val(); }).get(),
            "check_entregados": $("#chk_entregados").is(":checked"),
            "check_no_entregados": $("#chk_pendientes").is(":checked"),
            "fecha_inicio": $("#fecha_inicio").val(),
            "fecha_fin": $("#fecha_fin").val(),
            "lider_id": $("#filtro-lider").val(),
            "cliente_id": $("#filtro-cliente").val(),
            "frente_id": $("#filtro-frente").val(),
            "id_sitio": $("#filtro-sitio").val(),
            "buscar_por_frente": $("#chk_buscar_por_frente").is(":checked") ? '1' : '0',
            "texto_busqueda": $("#filtro-buscar").val(),
            "nombre_documento": $("#filtro-tipo-doc").val(),
            "estatus_proceso": $("#filtro-estatus").val(),
        };

        if (datos_filtros.origenes.length === 0) {
            alert("Selecciona al menos un Origen de Datos.");
            return;
        }

        btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin me-2"></i>Consultando...');

        $.ajax({
            url: urlBuscarDocumentos,
            type: "POST",
            data: JSON.stringify({ filtros: datos_filtros }),
            contentType: "application/json",
            headers: { "X-CSRFToken": csrfToken },
            success: function (response) {
                if (response.estatus === "ok") {
                    tabla.clear().rows.add(response.data).draw();
                    $("#badge-registros").text(response.total + " Registros");
                    if (offcanvasPanel) offcanvasPanel.hide();
                } else {
                    alert("Error: " + response.mensaje);
                }
            },
            error: function (xhr) {
                console.error(xhr.responseText);
                alert("Error al consultar el servidor.");
            },
            complete: function () {
                btn.prop("disabled", false).html(originalText);
            }
        });
    });

    $("#btn-limpiar-filtros").on("click", function() {
        document.getElementById("form-filtros-bi").reset();
        $('input[type="checkbox"]').prop("checked", false);
        $("input[name='origen']").prop("checked", true); 
        $("#chk_entregados, #chk_pendientes").prop("checked", true);

        $("#chk_buscar_por_frente").prop("checked", true);
        $("#filtro-frente").closest(".mb-3").slideDown(); 
        $(".select2, .form-select").val(null).trigger("change");
        $("#filtro-buscar").val("");
        tabla.clear().draw(); 

        $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
    });

    (function initDashboard() {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const formatoFecha = (d) => d.toISOString().split('T')[0];
        $("#fecha_inicio").val(formatoFecha(primerDia));
        $("#fecha_fin").val(formatoFecha(hoy));
        $("#btn-ejecutar").trigger("click");
    })();
});

function fn_gestionar_carga_sitios(idFrenteSeleccionado, esJerarquia) {
    const selectSitio = $("#filtro-sitio");
    // Mapea frente ejemplo: Tierra-Patio
    const mapeoIds = { "1": "3", "2": "6", "4": "7" };

    if (esJerarquia && !idFrenteSeleccionado) {
        selectSitio.empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
        fn_asegurar_select2(selectSitio);
        return;
    }

    const idParaMandar = mapeoIds[idFrenteSeleccionado] || idFrenteSeleccionado;
    const urlDestino = (esJerarquia) ? urlObtenerSitiosPorFrente : urlObtenerSitios;
    const datosPeticion = (esJerarquia) ? { "frente_id": idParaMandar } : {};

    $.ajax({
        url: urlDestino,
        type: "GET",
        data: datosPeticion,
        dataType: "json",
        success: function(datos) {
            const placeholder = (esJerarquia) ? "Todos los Sitios (Filtrado)" : "Todos los Sitios";
            selectSitio.empty().append(`<option value="">${placeholder}</option>`);

            if (datos && datos.length > 0) {
                datos.forEach(item => {
                    selectSitio.append(`<option value="${item.id}">${item.descripcion}</option>`);
                });
            } else if (esJerarquia) {
                selectSitio.empty().append("<option value=''>Sin sitios para este frente</option>");
            }
            selectSitio.trigger("change");
            fn_asegurar_select2(selectSitio);
        },
        error: function(xhr) {
            console.error("Error al procesar la carga de sitios:", xhr.statusText);
            fn_asegurar_select2(selectSitio);
        }
    });
}

function fn_asegurar_select2(selector) {
    const select = $(selector);
    if (!select.hasClass("select2-hidden-accessible")) {
        select.select2({
            placeholder: "Seleccione...",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#panelFiltros"),
            language: { noResults: () => "Sin resultados" }
        });
    }
}

function cargarCatalogo(url, selectorId) {
    const select = $(selectorId);
    if (select.find("option").length > 1) return;
    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function(data) {
            const placeholder = select.data("placeholder") || "Todos";
            select.empty().append(`<option value="">${placeholder}</option>`);
            if (data && data.length > 0) {
                data.forEach(item => {
                    select.append(`<option value="${item.id}">${item.descripcion}</option>`);
                });
            }
            fn_asegurar_select2(select);
        },
        error: function(xhr, status, error) {
            console.error(`Error cargando catálogo desde ${url}:`, error);
        }
    });
}