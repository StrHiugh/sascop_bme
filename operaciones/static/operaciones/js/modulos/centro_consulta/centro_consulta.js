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

function estadoInicialPanel() {
    $("#fecha_inicio").val("");
    $("#fecha_fin").val("");
    $("input[name='origen']").prop("checked", false);
    $("#chk_entregados").prop("checked", false);
    $("#chk_pendientes").prop("checked", false);
    $("#chk_buscar_por_frente").prop("checked", true);
    $("#filtro-frente").closest(".mb-3").show();
    $(".select2, .form-select").val(null).trigger("change");
    $("#filtro-buscar").val("");
    $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");

    const validator = $("#form-filtros-bi").data("validator");
    if (validator) {
        validator.resetForm();
        $(".group-checkboxes").removeClass("border border-danger rounded p-1");
        $(".origen-error").remove();
    }
    fn_gestionarVisibilidadUbicacion ();
}

function cargaInicialAutomatica() {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fmt = (d) => d.toISOString().split('T')[0];

    const datos_filtros = {
        "origenes": ["OT", "PTE", "PROD"],
        "check_entregados": true,
        "check_no_entregados": true,
        "fecha_inicio": fmt(primerDia),
        "fecha_fin": fmt(hoy),
        "lider_id": null,
        "cliente_id": null,
        "frente_id": null,
        "id_sitio": null,
        "buscar_por_frente": '1',
        "texto_busqueda": "",
        "nombre_documento": null,
        "estatus_proceso": null,
    };

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
            }
        },
        error: function (xhr) {
            console.error("Error en carga inicial:", xhr.responseText);
        }
    });
}

let tabla;

$(document).ready(function () {
    const panelElement = document.getElementById("panelFiltros");
    let offcanvasPanel = null;

    estadoInicialPanel();
    tabla = $("#tabla-resultados").DataTable({
        data: null,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        dom: '<"row"<"col-sm-12 col-md-6"l>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
        language: {
            "lengthMenu": "_MENU_",
            "info": "Mostrando _END_ de _TOTAL_ registros.",
            "infoFiltered": "(filtrado de _MAX_ registros)",
            "paginate": {
                "previous": "‹",
                "next": "›"
            }
        },
        responsive: true,
        columns: [
            { title: "Origen",                  data: "tipo",      width: "70px",  className: "text-center align-middle", render: (d) => badgeTipo(d) },
            { title: "Folio / Proyecto",         data: null,                        className: "align-middle",             render: (d, t, row) => celdaFolio(row) },
            { title: "Metadatos (Líder/Frente)", data: null,                        className: "align-middle",             render: (d, t, row) => celdaMeta(row) },
            { title: "Documento / Entregable",   data: "documento",                 className: "align-middle" },
            { title: "Fecha",                    data: "fecha",     width: "100px", className: "align-middle text-nowrap", render: (d) => formatFecha(d) },
            { title: "Acción",                   data: null,        width: "70px",  className: "text-center align-middle", orderable: false, render: (d, t, row) => celdaAccion(row) },
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
        }
    });
    $("#tabla-resultados_length").detach().appendTo("#select-length");

    cargaInicialAutomatica();
    if (typeof $.validator !== "undefined") {
        $.validator.addMethod("minimoUnoChecked", function () {
            return $("input[name='origen']:checked:not(:disabled)").length > 0;
        }, "Selecciona al menos un origen de datos.");

        $("#form-filtros-bi").validate({
            ignore: [],
            errorClass: "text-danger small mt-1",
            rules: {
                origen: { minimoUnoChecked: true }
            },
            errorPlacement: function (error, element) {
                if (element.attr("name") === "origen") {
                    $(".origen-error").remove();
                    error.addClass("origen-error text-danger small mt-1 d-block");
                    $("input[name='origen']").closest(".group-checkboxes").after(error);
                } else {
                    error.insertAfter(element);
                }
            },
            highlight: function (element) {
                if ($(element).attr("name") === "origen") {
                    $(".group-origen").addClass("border border-danger rounded p-1");
                    setTimeout(function () {
                        $("input[name='origen']").removeAttr("aria-invalid");
                    }, 0);
                } else {
                    $(element).addClass("is-invalid");
                }
            },
            unhighlight: function (element) {
                if ($(element).attr("name") === "origen") {
                    $("input[name='origen']").removeAttr("aria-invalid");
                    $(".group-origen").removeClass("border border-danger rounded p-1");
                } else {
                    $(element).removeClass("is-invalid");
                }
            },
            invalidHandler: function (event, validator) {
                if (!validator.errorList.length) return;
                const firstError  = $(validator.errorList[0].element);
                const panel       = document.getElementById("panelFiltros");
                if (!panel) return;
                const panelBody   = panel.querySelector(".offcanvas-body");
                if (!panelBody) return;
                const relativePos = firstError.offset().top
                    - $(panelBody).offset().top
                    + panelBody.scrollTop;
                $(panelBody).animate({ scrollTop: relativePos - 20 }, 500);
            }
        });
    } else {
        console.warn("jQuery Validate no está disponible.");
    }

    if (panelElement) {
        offcanvasPanel = new bootstrap.Offcanvas(panelElement);
        $("#btn-panel-filtros").on("click", function (e) {
            e.preventDefault();
            cargarCatalogo(urlObtenerResponsables, "#filtro-lider");
            cargarCatalogo(urlObtenerClientes,     "#filtro-cliente");
            cargarCatalogo(urlObtenerFrentes,      "#filtro-frente");
            cargarCatalogo(urlObtenerEstatus,      "#filtro-estatus");
            cargarCatalogo(urlObtenerTiposDoc,     "#filtro-tipo-doc");
            if ($("#filtro-sitio option").length <= 1) {
                if (!$("#chk_buscar_por_frente").is(":checked")) fn_gestionar_carga_sitios(null, false);
            }
            offcanvasPanel.show();
        });
    }

    $("#filtro-frente").on("change", function () {
        const idFrente   = $(this).val();
        const esJerarquia = $("#chk_buscar_por_frente").is(":checked");
        $("#filtro-sitio").empty().append("<option value=''>Actualizando...</option>").trigger("change");

        if (esJerarquia) {
            if (idFrente) {
                fn_gestionar_carga_sitios(idFrente, true);
            } else {
                $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
                fnAsegurarSelect2($("#filtro-sitio"));
            }
        } else {
            fn_gestionar_carga_sitios(null, false);
        }
    });

    $("#chk_buscar_por_frente").on("change", function () {
        const esJerarquia     = $(this).is(":checked");
        const selectFrente    = $("#filtro-frente");
        const contenedorFrente = selectFrente.closest(".mb-3");
        $("#filtro-sitio").empty().append("<option value=''>Actualizando...</option>").trigger("change");

        if (!esJerarquia) {
            contenedorFrente.slideUp();
            selectFrente.val(null).trigger('change.select2');
            fn_gestionar_carga_sitios(null, false);
        } else {
            contenedorFrente.slideDown();
            $("#filtro-sitio").empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
            fnAsegurarSelect2($("#filtro-sitio"));
        }
    });

    $("#filtro-buscar").on("keyup", function (e) {
        if (e.key === "Enter" || !$(this).val()) tabla.search($(this).val()).draw();
    });

    $("#btn-ejecutar").on("click", function () {
        if ($("#form-filtros-bi").data("validator") && !$("#form-filtros-bi").valid()) return;
        if ($("input[name='origen']:checked").length === 0) {
            alert("Selecciona al menos un Origen de Datos.");
            return;
        }

        const btn          = $(this);
        const originalText = btn.html();
        const datos_filtros = {
            "origenes":        $("input[name='origen']:checked").map(function () { return $(this).val(); }).get(),
            "check_entregados":    $("#chk_entregados").is(":checked"),
            "check_no_entregados": $("#chk_pendientes").is(":checked"),
            "fecha_inicio":    $("#fecha_inicio").val(),
            "fecha_fin":       $("#fecha_fin").val(),
            "lider_id":        $("#filtro-lider").val(),
            "cliente_id":      $("#filtro-cliente").val(),
            "frente_id":       $("#filtro-frente").val(),
            "id_sitio":        $("#filtro-sitio").val(),
            "buscar_por_frente": $("#chk_buscar_por_frente").is(":checked") ? '1' : '0',
            "texto_busqueda":  $("#filtro-buscar").val(),
            "nombre_documento": $("#filtro-tipo-doc").val(),
            "estatus_proceso": $("#filtro-estatus").val(),
        };

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

    $("#btn-limpiar-filtros").on("click", function () {
        document.getElementById("form-filtros-bi").reset();
        estadoInicialPanel();
        tabla.clear().draw();
        $("#badge-registros").text("0 Registros");
        cargaInicialAutomatica();
    });

    $("input[name='origen']").on("change", function () {
        fn_gestionarVisibilidadUbicacion();
    });
});

function fn_gestionar_carga_sitios(idFrenteSeleccionado, esJerarquia) {
    const selectSitio = $("#filtro-sitio");
    const mapeoIds    = { "1": "3", "2": "6", "4": "7" };

    if (esJerarquia && !idFrenteSeleccionado) {
        selectSitio.empty().append("<option value=''>Seleccione un frente...</option>").trigger("change");
        fnAsegurarSelect2(selectSitio);
        return;
    }

    const idParaMandar  = mapeoIds[idFrenteSeleccionado] || idFrenteSeleccionado;
    const urlDestino    = esJerarquia ? urlObtenerSitiosPorFrente : urlObtenerSitios;
    const datosPeticion = esJerarquia ? { "frente_id": idParaMandar } : {};

    $.ajax({
        url: urlDestino,
        type: "GET",
        data: datosPeticion,
        dataType: "json",
        success: function (datos) {
            const primeraOpcion = selectSitio.find("option:first").detach();
            selectSitio.empty().append(primeraOpcion);

            const respuesta = datos || [];
            respuesta.forEach(item => {
                selectSitio.append(`<option value="${item.id}">${item.descripcion}</option>`);
            });

            fnAsegurarSelect2(selectSitio);
            selectSitio.trigger("change");
        },
        error: function (xhr) {
            console.error("Error al procesar la carga de sitios:", xhr.statusText);
            fnAsegurarSelect2(selectSitio);
        }
    });
}

const fnAsegurarSelect2 = (selector) => {
    const select = $(selector);
    if (!select.length) return;

    if (select.hasClass("select2-hidden-accessible")) {
        select.select2("destroy");
    }

    select.select2({
        width: "100%",
        dropdownParent: $("#panelFiltros"),
        language: { noResults: () => "Sin resultados" }
    });
};

const cargarCatalogo = (url, selectorId) => {
    const select = $(selectorId);
    if (select.find("option").length > 1) return;

    $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        success: function (datos) {
            const primeraOpcion = select.find("option:first").detach();
            select.empty().append(primeraOpcion);

            const respuesta = datos || [];
            respuesta.forEach(item => {
                select.append(`<option value="${item.id}">${item.descripcion}</option>`);
            });

            fnAsegurarSelect2(select);
        },
        error: function (xhr, status, error) {
            console.error(`Error cargando catálogo desde ${url}:`, error);
        }
    });
};

const fn_gestionarVisibilidadUbicacion = () => {
    const requiereUbicacion = $("#orig_ot").is(":checked") ? true : false;

    const contenedorFrente = $("#filtro-frente").closest(".mb-3");
    const contenedorSitio = $("#filtro-sitio").closest(".mb-3");
    const contenedorSwitch = $("#contenedor-switch-frente");

    if (requiereUbicacion) {
        contenedorFrente.slideDown();
        contenedorSitio.slideDown();
        contenedorSwitch.slideDown();
    } else {
        contenedorFrente.slideUp();
        contenedorSitio.slideUp();
        contenedorSwitch.slideUp();

        $("#filtro-frente").val(null).trigger("change.select2");
        $("#filtro-sitio").val(null).trigger("change.select2");
        $("#chk_buscar_por_frente").prop("checked", true);
    }
};