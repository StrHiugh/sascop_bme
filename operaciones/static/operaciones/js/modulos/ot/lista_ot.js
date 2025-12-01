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
                extra.estatus = $("#estatus").val();
                extra.tipo = $("#tipo").val() ? $("#tipo").val() : 4;
                extra.responsable_proyecto = $("#id_responsable_proyecto").val();
                extra.anio = $("#anio").val();
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
                "data": "fecha_inicio_real",
                "title": "Fecha de inicio"
            },
            {
                "data": "fecha_termino_real",
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
            tablaPte :
            tablaReprogramaciones;
        window.ot_actual = otID;
    });

    // Evento para expandir detalles del OT y repros
    $(document).on("click", ".detalle-pte", function () {
        window.tablaActiva = tablaPte.row($(this).parents('tr')).data() ?
            tablaPte :
            tablaReprogramaciones;
        window.tablaTexto = tablaPte.row($(this).parents('tr')).data() ?
            "OT" :
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

                const tablaDetalleId = `#tabla-detalle-ot_${otId}`;
                if ($.fn.DataTable.isDataTable(tablaDetalleId)) {
                    $(tablaDetalleId).DataTable().destroy();
                    $(tablaDetalleId).empty();
                }
            }
        } else {
            // Abrir detalles
            $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
            row.child(fnHTMLTablaDetallePTE(otId)).show();

            // Inicializar DataTable de Reprogramaciones y Detalles
            if (window.tablaTexto === "OT") {
                initTablaReprogramaciones(otId);
                initTablaDetalleOT(otId);
            } else if (window.tablaTexto === "Reprogramacion") {
                initTablaDetalleOT(otId);
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
                iniciarLoader();
                const ot = datos.datos;

                // Llenar formulario con datos existentes
                $("#ot_id").val(ot.id);
                $("#orden_trabajo").val(ot.orden_trabajo);
                $("#oficio_solicitud").val(ot.oficio_solicitud);
                $("#descripcion_trabajo").val(ot.descripcion_trabajo);
                $("#id_frente").val(ot.id_frente);
                $("#plazo_dias").val(ot.plazo_dias);
                $("#id_tipo").val(ot.id_tipo_id);
                $("#total_homologado").val(ot.total_homologado);
                $("#oficio_ot").val(ot.oficio_ot);
                $("#comentario_general").val(ot.comentario);
                $("#responsable_cliente").val(ot.responsable_cliente);
                $("#fecha_inicio_programado").val(ot.fecha_inicio_programado);
                $("#fecha_termino_programado").val(ot.fecha_termino_programado);
                $("#fecha_inicio_real").val(ot.fecha_inicio_real);
                $("#fecha_termino_real").val(ot.fecha_termino_real);
                $("#monto_mxn").val(ot.monto_mxn || "0.00");
                $("#monto_usd").val(ot.monto_usd || "0.00");
                $("#plazo_dias").val(ot.plazo_dias || "0");
                toggleFrenteFields().then(function () {
                    if (ot.id_embarcacion) $("#id_embarcacion").val(ot.id_embarcacion).trigger('change');
                    if (ot.id_patio) $("#id_patio").val(ot.id_patio).trigger('change');
                    if (ot.id_plataforma) $("#id_plataforma").val(ot.id_plataforma).trigger('change');
                    if (ot.id_intercom) $("#id_intercom").val(ot.id_intercom).trigger('change');
                });

                cargarResponsablesProyecto().done(function () {
                    $("#responsable_proyecto").val(ot.responsable_proyecto).trigger('change');
                });

                // Verificar si es reprogramación y habilitar campos
                const esReprogramacion = (ot.id_tipo_id === 5);

                if (esReprogramacion) {
                    // Mostrar campos de reprogramación
                    $divOTPrincipal.show().removeAttr('hidden');
                    $divNumReprogramacion.show().removeAttr('hidden');

                    $('#num_reprogramacion').val(ot.num_reprogramacion).prop('disabled', false);
                    $('#ot_principal').prop('disabled', false);

                    cargarOTsPrincipales(ot.id).done(function () {
                        if (ot.ot_principal) {
                            $('#ot_principal').val(ot.ot_principal).trigger('change');
                        }
                    });
                }

                // Mostrar modal
                setTimeout(() => {
                    finalizarLoader();
                }, 2000);
                const modal = new bootstrap.Modal(document.getElementById('modalCrearOT'));
                modal.show();
            })
            .fail(function () {
                aviso("error", {
                    contenido: "Error al cargar los datos de la OT",
                });
            });
    }

    function abrirModalSubirArchivo(datosPaso = null) {
        const modal = new bootstrap.Modal(document.getElementById('modalSubirArchivo'));
        const enlaceInput = document.getElementById('enlaceArchivoOt');
        if (datosPaso) {
            if (datosPaso.archivo) {
                enlaceInput.value = datosPaso.archivo;
            } else {
                enlaceInput.value = '';
            }

            window.pasoActual = datosPaso;
        } else {
            enlaceInput.value = '';
            window.pasoActual = null;
        }
        
        modal.show();
        setTimeout(() => {
            enlaceInput.focus();
        }, 500);
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
                    select.select2({
                        placeholder: "Buscar responsable de proyecto",
                        allowClear: true,
                        width: '100%',
                        dropdownParent: $('#modalCrearOT .modal-content'),
                        language: {
                            noResults: function () {
                                return "No se encontraron responsables";
                            },
                            searching: function () {
                                return "Buscando...";
                            }
                        }
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

        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');

        const url = otId ? urlEditarOT : urlCrearPTE;
        const method = "POST";

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

    // Panel de filtros
    $("#btn-panel-filtros").on("click", function () {
        // Mostrar el offcanvas de Bootstrap
        var filtrosOffcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        filtrosOffcanvas.show();
        cargarResponsablesProyectoModal();
    });

    // Aplicar filtros
    $("#aplicar-filtros").on("click", function () {
        // Obtener valores de los filtros
        var estatus = $("#estatus").val();
        var tipo = $("#tipo").val();
        var responsable = $("#id_responsable_proyecto").val();
        
        // Aplicar filtros a la DataTable
        tablaPte.draw();
        
        // Cerrar el panel
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
    });

    // Limpiar filtros
    $("#limpiar-filtros").on("click", function () {
        // Limpiar todos los selects
        $("#estatus").val("");
        $("#tipo").val("");
        $("#id_responsable_proyecto").val("");
        $("#anio").val("");
        
        // Redibujar la tabla sin filtros
        tablaPte.draw();
        
        // Cerrar el panel (opcional)
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
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

    function cargarResponsablesProyectoModal() {
        return $.ajax({
            url: urlObtenerResponsables,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const select = $('#id_responsable_proyecto');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un responsable</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(responsable) {
                        select.append(`<option value="${responsable.id}">${responsable.descripcion}</option>`);
                    });
                    select.select2({
                        placeholder: "Buscar responsable de proyecto",
                        allowClear: true,
                        width: '100%',
                        dropdownParent: $('#form-filtros'),
                        language: {
                            noResults: function () {
                                return "No se encontraron responsables";
                            },
                            searching: function () {
                                return "Buscando...";
                            }
                        }
                    });
                } else {
                    select.append('<option value="" disabled>No hay responsables disponibles</option>');
                }
            },
            error: function(xhr, status, error) {
                const select = $('#id_responsable_proyecto');
                select.empty().append('<option value="" disabled>Error al cargar responsables</option>');
            }
        });
    }

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
                        const folio = ot.oficio_ot || 'Sin folio';
                        selectOT.append(`<option value="${id}">${folio}</option>`);
                    });

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
                tablaPte.ajax.reload();
            } else {
                aviso("error", response.detalles || "Error al cambiar el estatus");
            }
        }).fail(function () {
            aviso("error", "Error al cambiar el estatus");
        });
    });

    // Evento para cambiar frente
    $('#id_frente').on('change', function () {
        toggleFrenteFields();
    });

    // Función para calcular fecha término basada en plazo días
    function calcularFechaTermino() {
        const fechaInicio = $('#fecha_inicio_programado').val();
        const plazoDias = parseInt($('#plazo_dias').val()) || 0;

        if (fechaInicio && plazoDias > 0) {
            const fechaInicioObj = new Date(fechaInicio);
            const fechaTerminoObj = new Date(fechaInicioObj);
            fechaTerminoObj.setDate(fechaTerminoObj.getDate() + plazoDias);

            // Formatear a YYYY-MM-DD para input date
            const year = fechaTerminoObj.getFullYear();
            const month = String(fechaTerminoObj.getMonth() + 1).padStart(2, '0');
            const day = String(fechaTerminoObj.getDate()).padStart(2, '0');
            const fechaTermino = `${year}-${month}-${day}`;

            $('#fecha_termino_programado').val(fechaTermino);
        }
    }

    // Evento cuando cambia la fecha de inicio programado
    $('#fecha_inicio_programado').on('change', function () {
        calcularFechaTermino();
    });

    // Evento cuando cambia el plazo en días (también actualiza si ya hay fecha inicio)
    $('#plazo_dias').on('input', function () {
        if ($('#fecha_inicio_programado').val()) {
            calcularFechaTermino();
        }
    });

    $(document).on('click', '.cambiar-estatus-paso-option', function(e) {
        e.preventDefault();
        
        const pasoId = $(this).closest('.dropdown').find('.paso-id').val();
        const nuevoEstatus = $(this).data('estatus');
        const textoEstatus = $(this).text().trim();
        const mostrarFechaEntrega = (nuevoEstatus == '3'); // COMPLETADO
        const dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');

        // Obtener datos de la fila actual
        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;
        let contenidoMensaje = `
            <div class="mb-3">
                <p>¿Estás seguro de cambiar el estatus a <strong>${textoEstatus}</strong>?</p>
                <div class="row">
        `;
        
        // Agregar campo de fecha solo si el estatus es 3 (COMPLETADO)
        if (mostrarFechaEntrega) {
            contenidoMensaje += `
                    <div class="mb-3 col-3">
                        <label for="fechaEntrega" class="form-label">Fecha de entrega:</label>
                        <input type="date" class="form-control" id="fechaEntrega" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
            `;
        }
        
        contenidoMensaje += `
                    <div class="mb-3 ${mostrarFechaEntrega ? 'col-3' : 'col-3'}">
                        <label for="comentarioCambio" class="form-label">Comentario:</label>
                        <textarea class="form-control" id="comentarioCambio" rows="1" placeholder="Agregar un comentario sobre este cambio..."></textarea>
                    </div>
                </div>
            </div>
        `;

        BMensaje({
            titulo: "Confirmación",
            subtitulo: contenidoMensaje,
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const comentario = $('#comentarioCambio').val().trim();
                        
                        // Validar fecha si es requerida
                        if (mostrarFechaEntrega) {
                            const fechaEntrega = $('#fechaEntrega').val();
                            if (!fechaEntrega) {
                                aviso("advertencia", "La fecha de entrega es obligatoria para el estatus COMPLETADO");
                                return;
                            }
                        }
                        
                        let log = new RegistroActividad(5, datosPaso.id, "ACTUALIZAR");
                        log.agregar_actividad({
                            nombre: "Actualizó",
                            valor_actual: textoEstatus,
                            valor_anterior: datosPaso.estatus_paso_texto || 'PENDIENTE',
                            detalle: `el estatus de: <b>${datosPaso.estatus_paso_texto || 'PENDIENTE'}</b> a: <b>${textoEstatus}</b>, del paso <b>${datosPaso.orden || ''} - ${datosPaso.desc_paso || ''}</b> de la OT: <b>${datosPaso.oficio_ot || ''}</b>`
                        });
                        
                        // Preparar datos para enviar
                        const datos = {
                            paso_id: pasoId,
                            nuevo_estatus: nuevoEstatus,
                            comentario: comentario,
                            registro_actividad: JSON.stringify(log.actividad), 
                            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                        };

                        // Agregar fecha de entrega solo si es COMPLETADO
                        if (mostrarFechaEntrega) {
                            datos.fecha_entrega = $('#fechaEntrega').val();
                        }

                        BMAjax(
                            urlCambiarEstatusPaso,
                            datos,
                            "POST"
                        ).done(function(response) {
                            if (response.exito) {
                                // Recargar la tabla de detalles
                                if (window.tablaDetalleActiva) {
                                    window.tablaDetalleActiva.ajax.reload(null, false);
                                }
                            } else {
                                aviso("error", response.detalles || "Error al actualizar el estatus");
                            }
                        }).fail(function() {
                            aviso("error", "Error al conectar con el servidor");
                        });
                    }
                },
                {
                    texto: "Cancelar", 
                    clase: "btn-light",
                    funcion: function() { return }
                }
            ]
        });
    });

    // Cambio de fechas
    $(document).on('change', '.fecha-paso-input', function () {
        const pasoId = $(this).data('id');
        const fecha = $(this).val();
        const tipo = $(this).data('tipo'); // 1: Inicio, 2: Termino, 3: Entrega
        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;

        let log = new RegistroActividad(5,datosPaso.id,"ACTUALIZAR");
        log.agregar_actividad({
            nombre:"Actualizó",
            valor_actual:fecha,
            valor_anterior:(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega,
            detalle:`la fecha de:<b> ${(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega}</b> a: <b>${fecha}
                ${(tipo=='1')?'de inicio':
                (tipo=='2')?'de término':'de entrega'} </b>
                del paso <b>${datosPaso.orden}</b> de la OT: <b>${datosPaso.oficio_ot}</b>`}) 
        
        BMAjax(
            urlActualizarFecha,
            {
                id_paso: pasoId,
                fecha: fecha,
                tipo: tipo,
                registro_actividad: JSON.stringify(log.actividad),

            },
            "POST"
        ).done(function (response) {
            if (response.exito) {

            } else {
            }
        });
    });

    // Subida de archivos
    $(document).on('click', '.ver-archivo', function () {
        const pasoId = $(this).data('id');
        const input = $(this).closest('div').find('.archivo-input')[0];
        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;
        abrirModalSubirArchivo(datosPaso);
        
    });

});

// Funcion para guardar el archivo
function guardarEnlaceArchivo() {
    const enlace = $('#enlaceArchivoOt').val().trim();
    
    if (!enlace) {
        aviso("advertencia", "Por favor ingresa un enlace válido");
        $('#enlaceArchivoOt').focus();
        return;
    }
    
    // Validación de URL
    if (!enlace.startsWith('http://') && !enlace.startsWith('https://')) {
        aviso("advertencia", "La URL debe comenzar con http:// o https://");
        $('#enlaceArchivoOt').focus();
        $('#enlaceArchivoOt').select();
        return;
    }
    
    if (window.pasoActual) {
        $.ajax({
            url: urlGuardarArchivo,
            method: "POST",
            data: {
                csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
                paso_id: window.pasoActual.id,
                archivo: enlace
            },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", "Archivo guardado correctamente");
                    $('#modalSubirArchivo').modal('hide');
                    window.pasoActual = null;
                    if (window.tablaDetalleActiva) {
                        window.tablaDetalleActiva.ajax.reload(null, false);
                    }
                } else {
                    aviso("error", response.message || "Error al guardar el archivo");
                }
            },
            error: function() {
                aviso("error", "Error al guardar el archivo");
            }
        });
    }
}

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
                        <table id="tabla-detalle-ot_${otId}" class="table table-sm table-bordered table-hover w-100">
                        </table>
                    </div>
                    <div class="tab-pane fade" id="reprogramaciones_${otId}" role="tabpanel" aria-labelledby="reprogramaciones-tab_${otId}">
                        <table id="tabla-reprogramaciones_${otId}" class="table table-sm table-bordered table-hover w-100">
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else if (window.tablaTexto == "Reprogramacion") {
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
                         <table id="tabla-detalle-ot_${otId}" class="table table-sm table-bordered table-hover w-100">
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
}

function initTablaDetalleOT(otId) {
    window.tablaDetalleActiva = $(`#tabla-detalle-ot_${otId}`).DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        searching: false,
        paging: true,
        info: true,
        pageLength: 10,    // 10 registros por página
        lengthChange: false, // No permitir cambiar cantidad de registros
        dom: '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>', // Solo info y paginación
        language: {
            "lengthMenu": "",  // Ocultar texto de length menu
            "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
            "infoEmpty": "No hay registros",
            "infoFiltered": "",
            "paginate": {
                "first": "‹‹",
                "last": "››",
                "next": "›",
                "previous": "‹"
            }
        },
        ajax: {
            url: urlDatatableDetalleOT,
            type: "GET",
            data: {
                ot_id: otId
            }
        },
        columns: [
            { 
                data: "orden", 
                title: "Paso", 
                className: "text-center",
                width: "5%" 
            },
            { 
                data: "desc_paso", 
                title: "Descripción", 
                width: "35%" 
            },
            {
                data: "fecha_inicio",
                title: "Fecha inicio",
                className:"text-center",
                width: "5%",
                render: function (data, type, row) {
                    // Convertir DD/MM/YYYY a YYYY-MM-DD para el input date
                    let val = "";
                    if (data) {
                        let parts = data.split('/');
                        if (parts.length === 3) val = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    return `
                        <div class="fecha-selector-container">
                            <input type="date" 
                                class="form-control form-control-sm fecha-paso-input" 
                                data-id="${row.id}" 
                                data-tipo="1" 
                                ${[3, 14].includes(row.estatus_paso) ? 'disabled' : ''}
                                value="${val}">
                        </div>
                    `;
                }
            },
            {
                data: "fecha_termino",
                title: "Fecha término",
                className:"text-center",    
                width: "5%",
                render: function (data, type, row) {
                    let val = "";
                    if (data) {
                        let parts = data.split('/');
                        if (parts.length === 3) val = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    return `
                        <div class="fecha-selector-container">
                            <input type="date" 
                                class="form-control form-control-sm fecha-paso-input" 
                                data-id="${row.id}" 
                                data-tipo="2" 
                                ${[3, 14].includes(row.estatus_paso) ? 'disabled' : ''}
                                value="${val}">
                        </div>
                    `;
                }
            },
            {
                data: "fecha_entrega",
                title: "Fecha entrega",
                className:"text-center",    
                width: "10%",
                render: function (data, type, row) {
                    return data || ''
                }
            },
            {
                data: "comentario",
                title: "Comentario",
                width: "15%",
                orderable: false
            },
            {
                "data": "estatus_paso",
                "title": "Estatus", 
                "orderable": false,
                "className": "text-center",
                "width": "10%",
                "render": function(data, type, row) {
                    const estatusClasses = {
                        '1': 'bg-warning',      // PENDIENTE
                        '2': 'bg-primary',      // PROCESO
                        '3': 'bg-success',      // COMPLETADO
                        '4': 'bg-danger',       // CANCELADO
                        '14': 'bg-secondary'    // NO APLICA
                    };
                    
                    const estatusTextos = {
                        '1': 'PENDIENTE',
                        '2': 'PROCESO', 
                        '3': 'COMPLETADO',
                        '4': 'CANCELADO',
                        '14': 'NO APLICA'
                    };
                    
                    const textoActual = estatusTextos[data] || 'PENDIENTE';
                    const claseActual = estatusClasses[data] || 'bg-warning';
                    
                    return `
                        <div class="dropdown">
                            <button class="btn btn-sm ${claseActual} dropdown-toggle text-white w-100" 
                                    type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ${textoActual}
                            </button>
                            <ul class="dropdown-menu w-100">
                                <li><a class="dropdown-item cambiar-estatus-paso-option" data-estatus="1">PENDIENTE</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" data-estatus="2">PROCESO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" data-estatus="3">COMPLETADO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" data-estatus="4">CANCELADO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" data-estatus="14">NO APLICA</a></li>
                            </ul>
                            <input type="hidden" class="paso-id" value="${row.id}">
                        </div>
                    `;
                }
            },
            {
                "data": null,
                "title": "Opciones",
                "class": "text-center",
                "width": "120px",
                "orderable": false,
                "render": function(data, type, row) {
                    if (row.archivo && row.archivo.trim() !== '') {
                        // Codificar la URL para caracteres especiales
                        const urlCodificada = encodeURI(row.archivo);
                        const archivoAcortado = row.archivo.length > 30 ? 
                            row.archivo.substring(0, 30) + '...' : row.archivo;
                            
                        return `
                            <a class="table-icon ver-archivo" 
                                title="Cambiar archivo" 
                                data-id="${row.id}"  >
                                <i class="fas fa-upload text-secondary"></i>
                            </a>
                            <a class="table-icon ver-archivo-externo" 
                                href="${urlCodificada}" 
                                target="_blank" 
                                title="Abrir: ${archivoAcortado}"
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-id="${row.id}">
                                    <i class="fas fa-eye text-success"></i>
                            </a>
                        `;
                    } else {
                        // Si no tiene archivo, mostrar solo ícono de subir
                        return `
                            <a class="table-icon ver-archivo" title="Subir archivo" data-id="${row.id}">
                                <i class="fas fa-upload"></i>
                            </a>
                        `;
                    }
                }
            }
        ]
    });
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
                "data": "fecha_inicio_real",
                "title": "Fecha de inicio"
            },
            {
                "data": "fecha_termino_real",
                "title": "Fecha término"
            },
            {
                "data": "estatus_ot_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "width": "10%",
                "render": function (data, type, row) {
                    const estatusClasses = {
                        'POR DEFINIR': 'bg-secondary',
                        'ASIGNADA': 'bg-primary',
                        'CANCELADA': 'bg-danger',
                        'DIFERIDA': 'bg-warning',
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
                                <ul class="dropdown-menu w-100">
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
        language: {
            emptyTable: "No hay reprogramaciones registradas"
        }
    });
}

function toggleFrenteFields() {
    const frenteId = $('#id_frente').val();

    const $divEmbarcacion = $('#id_embarcacion').closest('.mb-3');
    const $divPlataforma = $('#id_plataforma').closest('.mb-3');
    const $divIntercom = $('#id_intercom').closest('.mb-3');
    const $divPatio = $('#id_patio').closest('.mb-3');

    // Ocultar todos primero
    $divEmbarcacion.attr('hidden', true);
    $divPlataforma.attr('hidden', true);
    $divIntercom.attr('hidden', true);
    $divPatio.attr('hidden', true);

    // Deshabilitar selects
    $('#id_embarcacion, #id_plataforma, #id_intercom, #id_patio').prop('disabled', true);

    let promises = [];

    if (frenteId == '1') { // BARCO
        $divEmbarcacion.removeAttr('hidden');
        $divPlataforma.removeAttr('hidden');
        $divIntercom.removeAttr('hidden');
        promises.push(cargarSitios(6, '#id_embarcacion'));
        promises.push(cargarSitios(7, '#id_plataforma'));
        promises.push(cargarSitios(5, '#id_intercom'));

    } else if (frenteId == '2') { // TIERRA
        $divPatio.removeAttr('hidden');
        $divPlataforma.removeAttr('hidden');
        $divIntercom.removeAttr('hidden');
        promises.push(cargarSitios(3, '#id_patio'));
        promises.push(cargarSitios(7, '#id_plataforma'));
        promises.push(cargarSitios(5, '#id_intercom'));

    } else if (frenteId == '3') { // CP / PS
        $divPlataforma.removeAttr('hidden');
        promises.push(cargarSitios(7, '#id_plataforma'));
    }

    return Promise.all(promises);
}

function cargarSitios(frenteId, selectorId) {
    const select = $(selectorId);
    select.empty().append('<option value="">Cargando...</option>');

    if (select.hasClass("select2-hidden-accessible")) {
        select.select2('destroy');
    }

    return $.ajax({
        url: urlObtenerSitiosPorFrente,
        type: 'GET',
        data: { frente_id: frenteId },
        success: function (data) {
            select.empty();
            select.append('<option value="" selected disabled>Seleccione una opción</option>');

            if (data && data.length > 0) {
                data.forEach(function (sitio) {
                    select.append(`<option value="${sitio.id}">${sitio.descripcion}</option>`);
                });
            } else {
                select.append('<option value="" disabled>No hay opciones disponibles</option>');
            }

            select.prop('disabled', false);

            select.select2({
                placeholder: "Buscar...",
                allowClear: true,
                width: '100%',
                dropdownParent: $('#modalCrearOT .modal-content'),
                language: {
                    noResults: function () { return "No se encontraron resultados"; },
                    searching: function () { return "Buscando..."; }
                }
            });
        },
        error: function () {
            select.empty().append('<option value="">Error al cargar</option>');
            aviso("error", "Error al cargar opciones del sitio");
        }
    });
}