$(document).ready(function () {
    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[1, "desc"]],
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
        ajax: {
            url: urlDatatable,
            type: "GET",
            data: function (extra) {
                extra.filtro = $("#filtro-buscar").val();
                extra.estado = $("#slc-estado").val();
            }
        },
        createdRow: function (row, data, dataIndex) {
            // Si el estatus es -1 aplicar estilo especial
            if (data.estatus === -1 || data.estatus === 'Por definir') {
                $(row).addClass('fila-por-definir');
            }
        },
        columns: [
            {
                "data": null,
                "title": "",
                "width": "1%",
                "render": function (data, type, row) {
                    let ampliar = "";
                    ampliar = `<a class="table-icon detalle-pte" title="Ver detalles">
                                    <i class="fas fa-plus-square"></i>
                                </a>`;
                    return ampliar;
                },
                "orderable": false
            },
            {
                "data": "id",
                "title": "ID",
                "visible": false
            },
            {
                "data": "descripcion_tipo",
                "title": "Tipo"
            },
            {
                "data": "orden_trabajo",
                "title": "Folio OT"
            },
            {
                "data": "oficio_ot",
                "title": "Oficio OT"
            },
            {
                "data": "pte_padre",
                "title": "PTE proveniente"
            },
            {
                "data": "fecha_inicio_programada",
                "title": "Fecha de inicio"
            },
            {
                "data": "fecha_termino_programada",
                "title": "Fecha término"
            },
            {
                "data": "estatus_ot_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "render": function (data, type, row) {
                    const estatusClasses = {
                        'POR DEFINIR': 'bg-secondary',
                        'ASIGNADA': 'bg-primary',
                        'CANCELADA': 'bg-danger',
                        'DIFERIDA': 'bg-warning',
                        'EN EJECUCION': 'bg-info',
                        'SUSPENDIDA': 'bg-warning',
                        'TERMINADA': 'bg-success',
                        'POR CANCELAR': 'bg-danger'
                    };

                    // Si el estatus es 1 (activo), mostrar dropdown con estatus actual
                    if (row.estatus_numero === 1) {
                        return `
                            <div class="dropdown">
                                <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                        type="button" data-bs-toggle="dropdown" data-bs-display="static" 
                                        aria-expanded="false">
                                    ${data}
                                </button>
                                <ul class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto;">
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="5">ASIGNADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="8">EN EJECUCION</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="9">SUSPENDIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="7">DIFERIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="10">TERMINADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="11">POR CANCELAR</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" data-estatus="6">CANCELADA</a></li>
                                </ul>
                                <input type="hidden" class="ot-id" value="${row.id}">
                            </div>
                        `;
                    } else {
                        // Si es -1 (por definir), mostrar solo el badge
                        return `<button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} text-white w-100" 
                                        type="button" data-bs-toggle="dropdown" data-bs-display="static" 
                                        aria-expanded="false">
                                    ${data}
                                </button>`;
                    }
                }
            },
            {
                "data": null,
                "title": "Opciones",
                "class": "text-center",
                "width": "150px",
                "orderable": false,
                render: function (fila) {
                    let botones = `
                        <a class="table-icon editar_ot" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar_ot" title="Eliminar" data-id="${fila.id}">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
                    return botones;
                }
            }
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
        }
    });

    // Búsqueda por Enter
    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaPte.draw();
        }
    });

    // Mover select de length
    $("#tabla_length").detach().appendTo("#select-length");

    // Evento para editar PTE
    $("#tabla tbody").on("click", ".editar_ot", function () {
        const otID = $(this).data('id');
        abrirModalEditarOT(otID);
        window.tablaActiva = tablaPte.row($(this).parents('tr')).data() ? 
                    tablaPte: 
                    tablaReprogramaciones;
        window.ot_actual = otID;
    });

    // Evento para expandir detalles del OT y repros
    $(document).on("click", ".detalle-pte", function () {
        window.tablaActiva = tablaPte.row($(this).parents('tr')).data() ? 
                    tablaPte: 
                    tablaReprogramaciones;
        window.tablaTexto = tablaPte.row($(this).parents('tr')).data() ? 
                    "OT": 
                    "Reprogramacion";
        
        let tr = $(this).closest("tr");
        let row = window.tablaActiva.row(tr);
        let otId = row.data().id;

        // Cerrar detalles
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
            $(this).find('i').removeClass('fa-minus-square').addClass('fa-plus-square');

            // Si al cerrar hay tabla hija, destruirla
            if (window.tablaTexto === "OT") {
                const tablaReprogramacionesId = `#tabla-reprogramaciones_${otId}`;
                if ($.fn.DataTable.isDataTable(tablaReprogramacionesId)) {
                    $(tablaReprogramacionesId).DataTable().destroy();
                    $(tablaReprogramacionesId).empty();
                }
            }
        } else {
            // Abrir detalles
            $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
            row.child(fnHTMLTablaDetallePTE(otId)).show();

            // Inicializar DataTable de Reprogramaciones
            if (window.tablaTexto === "OT") {
                initTablaReprogramaciones(otId);
            }
        }
    });

    // Función para abrir modal de edición
    function abrirModalEditarOT(otID) {
        
        $("#formCrearOT")[0].reset();
        $("#modalCrearOTLabel").text("Editar OT");

        const $divOTPrincipal = $('#ot_principal').closest('.mb-3');
        const $divNumReprogramacion = $('#num_reprogramacion').closest('.mb-3');

        // Ocultar campos por defecto
        $divOTPrincipal.hide().attr('hidden', 'hidden');
        $divNumReprogramacion.hide().attr('hidden', 'hidden');
        $('#num_reprogramacion').val('').prop('disabled', true);
        $('#ot_principal').val('').prop('disabled', true);

        if ($('#ot_principal').hasClass('select2-hidden-accessible')) {
            $('#ot_principal').select2('destroy');
        }

        // Obtener datos del PTE
        BMAjax(urlObtenerDatos, { id: otID }, "GET")
            .done(function (datos) {
                const ot = datos.datos;

                // Llenar formulario con datos existentes
                $("#ot_id").val(ot.id);
                $("#orden_trabajo").val(ot.orden_trabajo);
                $("#oficio_solicitud").val(ot.oficio_solicitud);
                $("#descripcion_trabajo").val(ot.descripcion_trabajo);
                $("#id_embarcacion").val(ot.id_embarcacion_id);
                $("#plazo_dias").val(ot.plazo_dias);
                $("#id_tipo").val(ot.id_tipo_id);
                $("#total_homologado").val(ot.total_homologado);
                $("#oficio_ot").val(ot.oficio_ot);
                $("#comentario_general").val(ot.comentario);
                $("#responsable_cliente").val(ot.responsable_cliente);

                cargarResponsablesProyecto().done(function () {
                    $("#responsable_proyecto").val(ot.responsable_proyecto);
                });

                // Verificar si es reprogramación y habilitar campos
                const esReprogramacion = (ot.id_tipo_id === 5);

                if (esReprogramacion) {
                    // Mostrar campos de reprogramación
                    $divOTPrincipal.show().removeAttr('hidden');
                    $divNumReprogramacion.show().removeAttr('hidden');

                    $('#num_reprogramacion').val(ot.num_reprogramacion).prop('disabled', false);
                    $('#ot_principal').prop('disabled', false);
                    
                    cargarOTsPrincipales(ot.id).done(function() {
                        if (ot.ot_principal) {
                            $('#ot_principal').val(ot.ot_principal).trigger('change');
                        }
                    });
                }
                
                // Mostrar modal
                const modal = new bootstrap.Modal(document.getElementById('modalCrearOT'));
                modal.show();
            })
            .fail(function () {
                aviso("error", {
                    contenido: "Error al cargar los datos de la OT",
                });
            });
    }

    // Función para cargar responsables de proyecto
    function cargarResponsablesProyecto() {
        return $.ajax({
            url: urlObtenerResponsables,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const select = $('#responsable_proyecto');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un responsable</option>');

                if (data && data.length > 0) {
                    data.forEach(function (responsable) {
                        select.append(`<option value="${responsable.id}">${responsable.descripcion}</option>`);
                    });
                } else {
                    select.append('<option value="" disabled>No hay responsables disponibles</option>');
                }
            },
            error: function (xhr, status, error) {
                const select = $('#responsable_proyecto');
                select.empty().append('<option value="" disabled>Error al cargar responsables</option>');
            }
        });
    }

    //Funcion para guardar las ediciones
    $("#btnGuardarOT").off('click').on("click", function () {
        const otId = $("#ot_id").val();
        const formData = new FormData($("#formCrearOT")[0]);

        // Mostrar loading
        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');

        // Determinar URL y método
        const url = otId ? urlEditarOT : urlCrearPTE;
        const method = "POST";

        // Enviar datos
        $.ajax({
            url: url,
            type: method,
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.exito) {
                    aviso(response.tipo_aviso, response.detalles);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearOT'));
                    modal.hide();
                    window.tablaActiva.ajax.reload(null, false);

                } else {
                    aviso(response.tipo_aviso, response.detalles);
                }
            },
            error: function (xhr, status, error) {
                aviso("error", "Error al guardar el OT");
            },
            complete: function () {
                btn.prop('disabled', false).html(originalText);
            }
        });
    });

    //Funcion para eliminar
    $(document).on("click", ".eliminar_ot", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar esta OT?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function () {
                        const url = urlEliminarOT;
                        const method = "POST";
                        BMAjax(
                            url,
                            { id: id },
                            method
                        ).done(function (response) {
                            if (response.exito) {
                                tablaPte.ajax.reload();
                            }
                        });
                    }
                },
                {
                    texto: "Cancelar",
                    clase: "btn-light",
                    funcion: function () { return }
                }
            ]
        });
    });

    // Evento para cambiar tipo de OT (INICIAL/REPROGRAMACION)
    $(document).on('change', '#id_tipo', function () {
        const tipoSeleccionado = $(this).val();
        const esReprogramacion = (tipoSeleccionado === '5' || tipoSeleccionado === 'REPROGRAMACION');

        // SOLO LIMPIAR ELEMENTOS DE SELECT2 SI EXISTEN
        $('.select2-container').remove();
        $('#ot_principal').removeClass('select2-hidden-accessible');

        // Obtener los divs contenedores
        const $divOTPrincipal = $('#ot_principal').closest('.mb-3');
        const $divNumReprogramacion = $('#num_reprogramacion').closest('.mb-3');

        // Mostrar/ocultar los contenedores
        if (esReprogramacion) {
            $divOTPrincipal.show().removeAttr('hidden');
            $divNumReprogramacion.show().removeAttr('hidden');
            // $('#responsable_proyecto').removeAttr('disabled');
        } else {
            $divOTPrincipal.hide().attr('hidden', 'hidden');
            $divNumReprogramacion.hide().attr('hidden', 'hidden');
            // $('#responsable_proyecto').attr('disabled');
        }

        // Habilitar/deshabilitar campos según el tipo
        $('#num_reprogramacion').prop('disabled', !esReprogramacion);
        $('#ot_principal').prop('disabled', !esReprogramacion);

        // Limpiar campos si no es reprogramación
        if (!esReprogramacion) {
            $('#num_reprogramacion').val('');
            $('#ot_principal').val('');
        } else {
            // Si es reprogramación, cargar las OTs disponibles
            cargarOTsPrincipales(window.ot_actual);
        }
    });

    //Carga las ots principales y omite la que esta seleccionada
    function cargarOTsPrincipales(ot_id) {
        const selectOT = $('#ot_principal');
        // Mostrar estado de carga
        selectOT.empty().append('<option value="">Cargando OTs...</option>').prop('disabled', true);

        return $.ajax({
            url: urlObtenerOTPrincipal,
            type: 'GET',
            dataType: 'json',
            data: {
                ot_id: ot_id
            },
            success: function (response) {
                selectOT.empty();
                selectOT.append('<option value="" selected disabled>Seleccione una OT principal</option>');

                if (response && response.length > 0) {
                    response.forEach(function (ot) {
                        const id = ot.id || ot.ot_id;
                        const folio = ot.orden_trabajo || ot.folio || 'Sin folio';
                        selectOT.append(`<option value="${id}">${folio}</option>`);
                    });

                    // INICIALIZAR SELECT2 CON BÚSQUEDA
                    selectOT.select2({
                        placeholder: "Buscar OT por folio...",
                        allowClear: true,
                        width: '100%',
                        dropdownParent: $('#modalCrearOT .modal-content'),
                        language: {
                            noResults: function () {
                                return "No se encontraron OTs";
                            },
                            searching: function () {
                                return "Buscando...";
                            }
                        }
                    });

                } else {
                    selectOT.append('<option value="" disabled>No hay OTs disponibles</option>');
                }

                selectOT.prop('disabled', false);
            },
            error: function (xhr, status, error) {
                selectOT.empty();
                selectOT.append('<option value="" selected disabled>Error al cargar OTs</option>');
                selectOT.prop('disabled', false);
                aviso("error", "No se pudieron cargar las OTs principales");
            }
        });
    }

    // Evento para cambiar estatus de OT
    $(document).on('click', '.cambiar-estatus-option', function (e) {
        e.preventDefault();

        const nuevoEstatusId = $(this).data('estatus');
        const nuevoEstatusTexto = $(this).text().trim();
        const otId = $(this).closest('.dropdown').find('.ot-id').val();

        BMAjax(
            urlCambiarEstatusOT,
            {
                ot_id: otId,
                nuevo_estatus_id: nuevoEstatusId
            },
            "POST"
        ).done(function (response) {
            if (response.exito) {
                aviso("exito", "Estatus actualizado correctamente");
                tablaPte.ajax.reload(); // Recargar la tabla
            } else {
                aviso("error", response.detalles || "Error al cambiar el estatus");
            }
        }).fail(function () {
            aviso("error", "Error al cambiar el estatus");
        });
    });
});

// Función para generar HTML de la tabla de detalles
function fnHTMLTablaDetallePTE(otId) {
    if (window.tablaTexto == "OT") {
        return `
            <div class="detalle-ot-container p-3" style="background-color: #f8f9fa;">
                <ul class="nav nav-tabs" id="myTab_${otId}" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-dark" id="detalle-tab_${otId}" data-bs-toggle="tab" data-bs-target="#detalle_${otId}" type="button" role="tab" aria-controls="detalle" aria-selected="true">
                            <span class="text-dark">Detalle</span>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-secondary" id="reprogramaciones-tab_${otId}" data-bs-toggle="tab" data-bs-target="#reprogramaciones_${otId}" type="button" role="tab" aria-controls="reprogramaciones" aria-selected="false">
                            <span class="text-secondary">Reprogramaciones</span>
                        </button>
                    </li>
                </ul>
                <div class="tab-content p-3 border border-top-0 bg-white" id="myTabContent_${otId}">
                    <div class="tab-pane fade show active" id="detalle_${otId}" role="tabpanel" aria-labelledby="detalle-tab_${otId}">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Sección de detalles en construcción. Aquí se mostrarán los pasos del proceso.
                        </div>
                    </div>
                    <div class="tab-pane fade" id="reprogramaciones_${otId}" role="tabpanel" aria-labelledby="reprogramaciones-tab_${otId}">
                        <table id="tabla-reprogramaciones_${otId}" class="table table-sm table-bordered table-hover w-100">
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else if(window.tablaTexto == "Reprogramacion"){
        return `
            <div class="detalle-ot-container p-3" style="background-color: #f8f9fa;">
                <ul class="nav nav-tabs" id="myTab_${otId}" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-dark" id="detalle-tab_${otId}" data-bs-toggle="tab" data-bs-target="#detalle_${otId}" type="button" role="tab" aria-controls="detalle" aria-selected="true">
                            <span class="text-dark">Detalle</span>
                        </button>
                    </li>
                </ul>
                <div class="tab-content p-3 border border-top-0 bg-white" id="myTabContent_${otId}">
                    <div class="tab-pane fade show active" id="detalle_${otId}" role="tabpanel" aria-labelledby="detalle-tab_${otId}">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Sección de detalles en construcción. Aquí se mostrarán los pasos del proceso.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function initTablaReprogramaciones(otId) {
    window.tablaReprogramaciones = $(`#tabla-reprogramaciones_${otId}`).DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        searching: false,
        paging: false,
        info: false,
        ajax: {
            url: urlDatatable,
            type: "GET",
            data: function (d) {
                d.tipo = 5; // Reprogramacion
                d.ot_principal = otId;
            }
        },
        columns: [
            {
                "data": null,
                "title": "",
                "width": "1%",
                "render": function (data, type, row) {
                    let ampliar = "";
                    ampliar = `<a class="table-icon detalle-pte" title="Ver detalles">
                                    <i class="fas fa-plus-square"></i>
                                </a>`;
                    return ampliar;
                },
                "orderable": false
            },
            {
                "data": "id",
                "title": "ID",
                "visible": false
            },
            {
                "data": "descripcion_tipo",
                "title": "Tipo"
            },
            {
                "data": "orden_trabajo",
                "title": "Folio OT"
            },
            {
                "data": "oficio_ot",
                "title": "Oficio OT"
            },
            {
                "data": "pte_padre",
                "title": "PTE proveniente"
            },
            {
                "data": "fecha_inicio_programada",
                "title": "Fecha de inicio"
            },
            {
                "data": "fecha_termino_programada",
                "title": "Fecha término"
            },
            {
                "data": "estatus_ot_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "render": function (data, type, row) {
                    const estatusClasses = {
                        'POR DEFINIR': 'bg-secondary',
                        'ASIGNADA': 'bg-primary',
                        'CANCELADA': 'bg-danger',
                        'DIFERIDA': 'bg-warning',
                        'EN EJECUCION': 'bg-info',
                        'SUSPENDIDA': 'bg-warning',
                        'TERMINADA': 'bg-success',
                        'POR CANCELAR': 'bg-danger'
                    };

                    return `
                        <div class="dropdown">
                            <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                    type="button" data-bs-toggle="dropdown" data-bs-display="static" 
                                    aria-expanded="false">
                                ${data}
                            </button>
                            <ul class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto;">
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="5">ASIGNADA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="8">EN EJECUCION</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="9">SUSPENDIDA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="7">DIFERIDA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="10">TERMINADA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="11">POR CANCELAR</a></li>
                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="6">CANCELADA</a></li>
                            </ul>
                            <input type="hidden" class="ot-id" value="${row.id}">
                        </div>
                    `;
                }
            },
            {
                "data": null,
                "title": "Opciones",
                "class": "text-center",
                "width": "150px",
                "orderable": false,
                render: function (fila) {
                    let botones = `
                        <a class="table-icon editar_ot" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar_ot" title="Eliminar" data-id="${fila.id}">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
                    return botones;
                }
            }
        ],
        language: {
            emptyTable: "No hay reprogramaciones registradas"
        }
    });
}