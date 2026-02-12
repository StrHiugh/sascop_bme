/*
 * __filename__   : lista_ot.js
 * __author__     : ARMANDO PERERA
 * __description__: JS la view de ordenes de trabajo
 * __version__    : 1.0.0
 * __app__        : BME SUBTEC
 */
let REGISTRO_ACTIVIDAD = new RegistroActividad(4,null,"REGISTRAR")

$(document).ready(function () {
    window.tablaOt = $("#tabla").DataTable({
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
                extra.sitio = $("#sitio").val();
            }
        },
        createdRow: function (row, data, dataIndex) {
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
                    if (row.estatus_numero === -1){
                        ampliar = "";
                    } else if (row.tiene_reprogramaciones) {
                        ampliar = `
                            <div class="position-relative">
                                <a class="table-icon detalle-pte position-relative" title="Ver detalles (${row.count_reprogramaciones} reprogramaciones)">
                                    <i class="fas fa-plus-square"></i>
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-circle text-white"
                                        style="font-size: 10px; width: 14px; height: 14px; padding: 0; line-height: 14px; background-color: #f05523;">
                                        ${row.count_reprogramaciones}
                                    </span>
                                </a>
                            </div>
                        `;
                    } else {
                        ampliar = `
                            <a class="table-icon detalle-pte" title="Ver detalles">
                                <i class="fas fa-plus-square"></i>
                            </a>
                        `;
                    }
                    
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
                "data": "orden_trabajo",
                "title": "Folio OT",
                "orderable": true,
            },
            {
                "data": "pte_padre",
                "title": "PTE proveniente",
                "orderable": true,
            },
            {
                "data": "fecha_inicio_real",
                "title": "Fecha de inicio real",
                "orderable": true,
                "type": "date",
            },
            {
                "data": "fecha_termino_real",
                "title": "Fecha término real",
                "orderable": true,
                "type": "date",
            },
            {
                "data": "progreso_final",
                "title": "Progreso",
                "width": "20%",
                "render": function(data, type, row) {
                    let color = '#95c93d'; 
                    if (data < 25) color = '#f05523'; 
                    else if (data < 75) color = '#fad91f'; 
                    
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    const tooltip = `Tiempo: ${row.progreso_tiempo}% | Pasos: ${row.progreso_pasos}%`;
                    
                    return `
                        <div title="${tooltip}" data-bs-toggle="tooltip">
                            <div class="progress" style="height: 18px; cursor: pointer;">
                                <div class="progress-bar" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%; background-color: ${color};" 
                                    aria-valuenow="${porcentaje}">
                                </div>
                            </div>
                            <div class="text-center mt-1" style="font-size: 13px;">
                                <span class="badge text-white" style="background-color: #95c93d;">${row.dias_transcurridos}/${row.plazo_total}dP</span>
                                <span class="badge text-white" style="background-color: #54565a;">${row.dias_transcurridos_real}/${row.plazo_total_real}dR</span>
                                <span class="ms-2">${porcentaje}%</span>
                                <span class="ms-2 text-muted">(${row.pasos_completados}/${row.total_pasos})</span>
                            </div>
                        </div>
                    `;
                },
                "orderable": true
            },
            {
                "data": "progreso_tiempo", 
                "title": "Progreso Tiempo",
                "visible": false,
                "render": function(data, type, row) {
                    let color = '#55c0e9'; 
                    
                    if (row.dias_restantes <= 7 && data < 100) color = '#f05523';
                    else if (row.dias_restantes <= 14) color = '#fad91f';       
                    
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    
                    return `
                        <div title="${row.dias_transcurridos} días transcurridos | ${row.dias_restantes} días restantes">
                            <div class="progress" style="height: 15px;">
                                <div class="progress-bar" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%; background-color: ${color};">
                                </div>
                            </div>
                            <div class="text-center" style="font-size: 10px;">
                                ${porcentaje}% | ${row.dias_restantes}d restantes
                            </div>
                        </div>
                    `;
                }
            },
            {
                "data": "progreso_pasos",
                "title": "Progreso Pasos", 
                "visible": false,
                "render": function(data, type, row) {
                    let color = '#95c93d'; 
                    if (data < 25) color = '#f05523'; 
                    else if (data < 75) color = '#fad91f'; 
                    
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    
                    return `
                        <div title="${row.pasos_completados} de ${row.total_pasos} pasos completados">
                            <div class="progress" style="height: 15px;">
                                <div class="progress-bar" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%; background-color: ${color};">
                                </div>
                            </div>
                            <div class="text-center" style="font-size: 10px;">
                                ${porcentaje}% | ${row.pasos_completados}/${row.total_pasos}
                            </div>
                        </div>
                    `;
                }
            },
            {
                "data": "estatus_ot_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "render": function (data, type, row) {
                    const estatusColors = {
                        'POR DEFINIR': '#54565a',            
                        'ASIGNADA': '#fad91f',               
                        'CANCELADA': '#f05523',              
                        'DIFERIDA': '#f05523',               
                        'EN EJECUCION': '#55c0e9',           
                        'SUSPENDIDA': '#54565a',             
                        'TERMINADA': '#95c93d',              
                        'POR CANCELAR': '#f05523'            
                    };

                    const btnColor = estatusColors[data] || '#54565a';

                    if (row.estatus_numero === 1) {
                        return `
                            <div class="dropdown">
                                <button class="btn btn-sm dropdown-toggle text-white w-100" 
                                        style="background-color: ${btnColor}; border-color: ${btnColor};"
                                        type="button" data-bs-toggle="dropdown" data-bs-display="static" 
                                        aria-expanded="false">
                                    ${data}
                                </button>
                                <ul class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto;">
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="5">ASIGNADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="8">EN EJECUCION</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="9">SUSPENDIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="7">DIFERIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="16">DIFERIDA(SIN INICIAR)</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="10">TERMINADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="11">POR CANCELAR</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="6">CANCELADA</a></li>
                                </ul>
                                <input type="hidden" class="ot-id" value="${row.id}">
                            </div>
                        `;
                    } else {
                        return `<button class="btn btn-sm text-white w-100" 
                                        style="background-color: ${btnColor}; border-color: ${btnColor};"
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
                "width": "70px",
                "orderable": false,
                render: function (fila) {
                    let botones = `
                        <a class="table-icon editar_ot" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                    `;
                    if (puedeEliminarOT) {
                        botones += `
                            <a class="table-icon eliminar_ot" title="Eliminar" data-id="${fila.id}">
                                <i class="fas fa-trash"></i>
                            </a>
                        `;
                    } else {
                        botones += `
                            <a class="table-icon disabled" title="Sin permisos para eliminar" 
                            style="opacity: 0.5; cursor: not-allowed; color: #6c757d;">
                                <i class="fas fa-trash"></i>
                            </a>
                        `;
                    }
                    return botones;
                }
            }
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
        }
    });

    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
        tablaOt.draw();
        }
    });

    $("#tabla_length").detach().appendTo("#select-length");

    $(document).on("click", ".crear-ot", function() {
        abrirModalCrearOT();
    });

    $("#tabla tbody").on("click", ".editar_ot", function () {
        const otID = $(this).data('id');
        abrirModalEditarOT(otID);
        window.tablaActiva =tablaOt.row($(this).parents('tr')).data() ?
            tablaOt :
            tablaReprogramaciones;
        window.ot_actual = otID;
    });

    $(document).on("click", ".detalle-pte", function () {
        window.tablaActiva =tablaOt.row($(this).parents('tr')).data() ?
            tablaOt :
            tablaReprogramaciones;
        window.tablaTexto =tablaOt.row($(this).parents('tr')).data() ?
            "OT" :
            "Reprogramacion";

        let tr = $(this).closest("tr");
        let row = window.tablaActiva.row(tr);
        let otId = row.data().id;

        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
            $(this).find('i').removeClass('fa-minus-square').addClass('fa-plus-square');

            const tablaImportacionesId = `#tabla-importaciones_${otId}`;
            if ($.fn.DataTable.isDataTable(tablaImportacionesId)) {
                $(tablaImportacionesId).DataTable().destroy();
                $(tablaImportacionesId).empty();
            }

            const tablaDetalleId = `#tabla-detalle-ot_${otId}`;
            if ($.fn.DataTable.isDataTable(tablaDetalleId)) {
                $(tablaDetalleId).DataTable().destroy();
                $(tablaDetalleId).empty();
            }
            if (window.tablaTexto === "OT") {
                const tablaReprogramacionesId = `#tabla-reprogramaciones_${otId}`;
                if ($.fn.DataTable.isDataTable(tablaReprogramacionesId)) {
                    $(tablaReprogramacionesId).DataTable().destroy();
                    $(tablaReprogramacionesId).empty();
                }
            }
        } else {
            $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
            row.child(fnHTMLTablaDetallePTE(otId)).show();

            if (window.tablaTexto === "OT") {
                initTablaReprogramaciones(otId);
                initTablaDetalleOT(otId);
                initTablaImportaciones(otId);
            } else if (window.tablaTexto === "Reprogramacion") {
                initTablaDetalleOT(otId);
                initTablaImportaciones(otId);
            }
        }
    });

    function abrirModalEditarOT(otID) {
        $("#formCrearOT")[0].reset();
        $("#modalCrearOTLabel").text("Editar OT");
        $('#id_tipo option').prop('disabled', false);
        $('#id_tipo').removeClass('pe-none bg-light');
        const $divOTPrincipal = $('#ot_principal').closest('.mb-3');
        const $divNumReprogramacion = $('#num_reprogramacion').closest('.mb-3');

        $divOTPrincipal.hide().attr('hidden', 'hidden');
        $divNumReprogramacion.hide().attr('hidden', 'hidden');
        $('#num_reprogramacion').val('').prop('disabled', true);
        $('#ot_principal').val('').prop('disabled', true);

        if ($('#ot_principal').hasClass('select2-hidden-accessible')) {
            $('#ot_principal').select2('destroy');
        }

        BMAjax(urlObtenerDatos, { id: otID }, "GET")
            .done(function (datos) {
                iniciarLoader();
                const ot = datos.datos;

                $("#ot_id").val(ot.id);
                $("#orden_trabajo").val(ot.orden_trabajo);
                $("#oficio_solicitud").val(ot.oficio_solicitud);
                $("#descripcion_trabajo").val(ot.descripcion_trabajo);
                $("#id_frente").val(ot.id_frente);
                $("#plazo_dias").val(ot.plazo_dias);
                $('#id_tipo').val('4').trigger('change'); 
                $('#id_tipo option[value="5"]').prop('disabled', true);
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
                    if (ot.id_plataforma) $("#id_plataforma").val(ot.id_plataforma).trigger('change');
                    if (ot.id_intercom) $("#id_intercom").val(ot.id_intercom).trigger('change');
                    if (ot.id_frente == '1') {
                        if (ot.id_patio) $("#id_patio").val(ot.id_patio).trigger('change');
                        $('#check_fase_patio').prop('checked', false).trigger('change');
                    } else {
                        if (ot.id_patio) {
                            $('#check_fase_patio').prop('checked', true).trigger('change');
                            $("#id_patio_fase").val(ot.id_patio).trigger('change');
                            
                            if (ot.fecha_inicio_patio) $("#fecha_inicio_patio").val(ot.fecha_inicio_patio);
                            if (ot.fecha_fin_patio) $("#fecha_fin_patio").val(ot.fecha_fin_patio);
                        } else {
                            $('#check_fase_patio').prop('checked', false).trigger('change');
                        }
                    }
                    if (ot.fecha_inicio_patio) $("#fecha_inicio_patio").val(ot.fecha_inicio_patio);
                    if (ot.fecha_fin_patio) $("#fecha_fin_patio").val(ot.fecha_fin_patio);
                });

                cargarResponsablesProyecto().done(function () {
                    $("#responsable_proyecto").val(ot.responsable_proyecto).trigger('change');
                });

                const esReprogramacion = (ot.id_tipo_id === 5);

                if (esReprogramacion) {
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

                setTimeout(() => {
                    finalizarLoader();
                    REGISTRO_ACTIVIDAD.registra_actuales("#formCrearOT");
                    REGISTRO_ACTIVIDAD.actualiza_registro_id(ot.id);
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

    function abrirModalCrearOT() {
        $("#formCrearOT")[0].reset();
        $("#ot_id").val(""); 
        $("#modalCrearOTLabel").text("Crear reprogramación");
        const $divOTPrincipal = $('#ot_principal').closest('.mb-3');
        const $divNumReprogramacion = $('#num_reprogramacion').closest('.mb-3');

        $divOTPrincipal.hide().attr('hidden', 'hidden');
        $divNumReprogramacion.hide().attr('hidden', 'hidden');
        $('#num_reprogramacion').val('').prop('disabled', true);
        $('#ot_principal').val('').prop('disabled', true).empty();
        $('#id_tipo option').prop('disabled', false); 
        $('#id_tipo').val('5').trigger('change'); 
        $('#id_tipo option[value="4"]').prop('disabled', true);
        $('#id_tipo').addClass('pe-none bg-light');
        $('#id_frente').val('').trigger('change'); 
        $('#id_embarcacion, #id_plataforma, #id_intercom, #id_patio').empty();
        $('#check_fase_patio').prop('checked', false).prop('disabled', false).trigger('change');
        cargarClientes();
        cargarResponsablesProyecto();
        cargarOTsPrincipales(null);
        const modalElement = document.getElementById('modalCrearOT');
        $(modalElement).one('shown.bs.modal', function () {
            setTimeout(() => {
                const $select = $('#ot_principal');
                const $container = $select.next('.select2-container');
                if (!$select.prop('disabled')) {
                    $select.select2('focus'); 
                }
                $container.addClass('resaltar-atencion');
                $select.one('select2:open change', function() {
                    $container.removeClass('resaltar-atencion');
                });
            }, 1000);
        });
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }

    $(document).on('change', '#ot_principal', function () {
        const idOtPadre = $(this).val();
        if (!idOtPadre) return;

        BMAjax(urlObtenerDatos, { id: idOtPadre }, "GET")
            .done(function (respuesta) {
                if (respuesta.exito) {
                    const ot = respuesta.datos;
                    $("#orden_trabajo").val(ot.orden_trabajo); 
                    $("#oficio_solicitud").val(ot.oficio_solicitud);
                    $("#descripcion_trabajo").val(ot.descripcion_trabajo);
                    $("#oficio_ot").val(ot.oficio_ot);
                    $("#comentario_general").val(ot.comentario);
                    $("#responsable_cliente").val(ot.responsable_cliente);
                    $("#monto_mxn").val(ot.monto_mxn || "0.00");
                    $("#monto_usd").val(ot.monto_usd || "0.00");
                    //$("#plazo_dias").val(ot.plazo_dias || "0");
                    if (ot.id_cliente) {
                        $("#id_cliente").val(ot.id_cliente).trigger('change');
                    }
                    if (ot.responsable_proyecto) {
                        if ($('#responsable_proyecto option[value="' + ot.responsable_proyecto + '"]').length > 0) {
                            $("#responsable_proyecto").val(ot.responsable_proyecto).trigger('change');
                        } else {
                            cargarResponsablesProyecto().done(function() {
                                $("#responsable_proyecto").val(ot.responsable_proyecto).trigger('change');
                            });
                        }
                    }
                    $("#id_frente").val(ot.id_frente).trigger('change');
                    toggleFrenteFields().then(function () {
                        if (ot.id_embarcacion) $("#id_embarcacion").val(ot.id_embarcacion).trigger('change');
                        if (ot.id_patio) $("#id_patio").val(ot.id_patio).trigger('change');
                        if (ot.id_plataforma) $("#id_plataforma").val(ot.id_plataforma).trigger('change');
                        if (ot.id_intercom) $("#id_intercom").val(ot.id_intercom).trigger('change');
                    });

                    aviso("exito", "Datos precargados desde la OT Principal.");

                } else {
                    aviso("advertencia", "No se pudieron obtener los datos de la OT Principal.");
                }
            })
            .fail(function () {
                aviso("error", "Error de conexión al buscar datos de la OT Principal.");
            })
            .always(function () {
            });
    });

    function cargarClientes() {
        return $.ajax({
            url: urlObtenerClientes,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const select = $('#id_cliente');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un cliente</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(cliente) {
                        select.append(`<option value="${cliente.id}">${cliente.descripcion}</option>`);
                    });
                } else {
                    select.append('<option value="" disabled>No hay clientes disponibles</option>');
                }
            },
            error: function(xhr, status, error) {
                const select = $('#id_cliente');
                select.empty().append('<option value="" disabled>Error al cargar clientes</option>');
            }
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

    $("#btnGuardarOT").off('click').on("click", function () {
        const otId = $("#ot_id").val();
        const formData = new FormData($("#formCrearOT")[0]);

        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');

        const url = otId ? urlEditarOT : urlCrearOTRepro;
        const method = "POST";

        REGISTRO_ACTIVIDAD._evento = otId ? "MODIFICAR" : "CREAR";
        if (REGISTRO_ACTIVIDAD._evento=="MODIFICAR"){
            REGISTRO_ACTIVIDAD.detecta_cambios("#formCrearOT");
            const agrega_detalle = e => ({...e, detalle: `de la OT: <b>${$("#orden_trabajo").val()}</b>`});
            REGISTRO_ACTIVIDAD.transforma_cambios(agrega_detalle);
            formData.append('registro_actividad', JSON.stringify(REGISTRO_ACTIVIDAD.actividad));
        }else{
            REGISTRO_ACTIVIDAD._cambios = [];
            REGISTRO_ACTIVIDAD.agregar_actividad({
                nombre:"Creó",
                valor_actual:"",
                valor_anterior:"",
                detalle:` ${$("#id_tipo option:selected").text()} con folio: ${$("#orden_trabajo").val()}`
            })
            formData.append('registro_actividad', JSON.stringify(REGISTRO_ACTIVIDAD.actividad));
        }   


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

    $("#btn-panel-filtros").on("click", function () {
        cargarClientes();
        var filtrosOffcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        filtrosOffcanvas.show();
        cargarResponsablesProyectoModal();
        obtenerSitios();
    });

    $("#aplicar-filtros").on("click", function () {
        var estatus = $("#estatus").val();
        var tipo = $("#tipo").val();
        var responsable = $("#id_responsable_proyecto").val();
        
        tablaOt.draw();
        
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
    });

    $("#limpiar-filtros").on("click", function () {
        $("#estatus").val("");
        $("#tipo").val("");
        $("#id_responsable_proyecto").val("").trigger('change');
        $("#id_cliente").val("").trigger('change');
        $("#anio").val("");
        $("#cliente").val("");
        tablaOt.draw();
        
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
    });

    $(document).on("click", ".eliminar_ot", function () {
        const id = $(this).data('id');
        let datos = tablaOt.row($(this).parents('tr')).data() ? 
                    tablaOt.row($(this).parents('tr')).data() : 
                    tablaReprogramaciones.row($(this).parents('tr')).data();
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar esta OT?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function () {
                        let log = new RegistroActividad(4,datos.id,"ELIMINAR");
                        log.agregar_actividad({
                            nombre:"Eliminó",
                            valor_actual:"",
                            valor_anterior:"",
                            detalle:`<b>una OT</b> con folio: <b>${datos.orden_trabajo}</b>`})

                        const url = urlEliminarOT;
                        const method = "POST";
                        BMAjax(
                            url,
                            { 
                                id: id,
                                registro_actividad: JSON.stringify(log.actividad),
                            },
                            method
                        ).done(function (response) {
                            if (response.exito) {
                                tablaOt.ajax.reload();
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

    $(document).on('change', '#id_tipo', function () {
        const tipoSeleccionado = $(this).val();
        const esReprogramacion = (tipoSeleccionado === '5' || tipoSeleccionado === 'REPROGRAMACION');

        $('.select2-container').remove();
        $('#ot_principal').removeClass('select2-hidden-accessible');

        const $divOTPrincipal = $('#ot_principal').closest('.mb-3');
        const $divNumReprogramacion = $('#num_reprogramacion').closest('.mb-3');

        if (esReprogramacion) {
            $divOTPrincipal.show().removeAttr('hidden');
            $divNumReprogramacion.show().removeAttr('hidden');
        } else {
            $divOTPrincipal.hide().attr('hidden', 'hidden');
            $divNumReprogramacion.hide().attr('hidden', 'hidden');
        }

        $('#num_reprogramacion').prop('disabled', !esReprogramacion);
        $('#ot_principal').prop('disabled', !esReprogramacion);

        if (!esReprogramacion) {
            $('#num_reprogramacion').val('');
            $('#ot_principal').val('');
        } else {
            cargarOTsPrincipales(window.ot_actual);
        }
    });

    $('#check_fase_patio').on('change', function() {
        const isChecked = $(this).is(':checked');
        const $contenedoresPatio = $('.contenedor-fase-patio');
        const $selectPatio = $('#id_patio_fase');

        if (isChecked) {
            $contenedoresPatio.removeAttr('hidden');
            $selectPatio.prop('required', true);
            
            // Cargar patios si está vacío
            if ($selectPatio.children('option').length <= 1) {
                cargarSitios(3, '#id_patio_fase'); 
            }
        } else {
            $contenedoresPatio.attr('hidden', true);
            $selectPatio.prop('required', false).val(null).trigger('change');
            $('#fecha_inicio_patio').val('');
            $('#fecha_fin_patio').val('');
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
    
    function obtenerSitios() {
        $.ajax({
            url: urlObtenerSitios,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const select = $('#sitio');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un sitio</option>');

                if (data && data.length > 0) {
                    data.forEach(function (sitio) {
                        select.append(`<option value="${sitio.id}">${sitio.descripcion}</option>`);
                    });
                    select.select2({
                        placeholder: "Buscar sitio",
                        allowClear: true,
                        width: '100%',
                        dropdownParent: $('#form-filtros'),
                        language: {
                            noResults: function () {
                                return "No se encontraron sitios";
                            },
                            searching: function () {
                                return "Buscando...";
                            }
                        }
                    });
                } else {
                    select.append('<option value="" disabled>No hay sitios disponibles</option>');
                }
            },
            error: function (xhr, status, error) {
                const select = $('#sitio');
                select.empty().append('<option value="" disabled>Error al cargar sitios</option>');
            }
        });
    }

    function cargarOTsPrincipales(ot_id) {
        const selectOT = $('#ot_principal');
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
                        const folio = ot.orden_trabajo || 'Sin folio';
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

    $(document).on('click', '.cambiar-estatus-option', function (e) {
        e.preventDefault();
        const $opcionClickeada = $(this);
        const $dropdownContainer = $opcionClickeada.closest('.dropdown');
        const $botonDropdown = $dropdownContainer.find('.dropdown-toggle');
        let datos = tablaOt.row($(this).parents('tr')).data() ? 
                    tablaOt.row($(this).parents('tr')).data() : 
                    tablaReprogramaciones.row($(this).parents('tr')).data();
        const nuevoEstatusId = $(this).data('estatus');
        const nuevoEstatusTexto = $(this).text().trim();
        const otId = $(this).closest('.dropdown').find('.ot-id').val();
        const mostrarFechaEntrega = (nuevoEstatusId == '10');
        let contenidoMensaje = `
            <div class="mb-3">
                <p>¿Estás seguro de cambiar el estatus de la OT a <strong>${nuevoEstatusTexto}</strong>?</p>
                <div class="row">
        `;

        if (mostrarFechaEntrega) {
            contenidoMensaje += `
                    <div class="mb-3 col-3">
                        <label for="fechaEntregaOt" class="form-label">Fecha de entrega:</label>
                        <input type="date" class="form-control" id="fechaEntregaOt" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
            `;
        }
        
        contenidoMensaje += `
                    <div class="mb-3 col-4">
                        <label for="comentarioCambioOt" class="form-label">Comentario:</label>
                        <textarea class="form-control" id="comentarioCambioOt" rows="1" placeholder="Agregar un comentario sobre este cambio..."></textarea>
                    </div>
                </div>
            </div>
        `;

        BMensaje({
            titulo: "Confirmar Cambio de Estatus",
            subtitulo: contenidoMensaje,
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const comentario = $('#comentarioCambioOt').val().trim();
                        let fechaEntrega = null;
                        if (mostrarFechaEntrega) {
                            fechaEntrega = $('#fechaEntregaOt').val();
                            if (!fechaEntrega) {
                                aviso("advertencia", "La fecha de entrega es obligatoria.");
                                return false;
                            }
                        }
                        let log = new RegistroActividad(4,datos.id,"ACTUALIZAR");
                        log.agregar_actividad({
                            nombre:"Actualizó",
                            valor_actual:nuevoEstatusTexto,
                            valor_anterior:datos.estatus,
                            detalle:`el estatus de: <b>${datos.estatus}</b> a: <b>${nuevoEstatusTexto}</b>, de la OT: <b>${datos.orden_trabajo}</b>`})   
                        
                        BMAjax(
                            urlCambiarEstatusOT,
                            {
                                ot_id: otId,
                                nuevo_estatus_id: nuevoEstatusId,
                                registro_actividad: JSON.stringify(log.actividad),
                                comentario: comentario, 
                                fecha_entrega: fechaEntrega,
                            },
                            "POST"
                        ).done(function (response) {
                            if (response.exito) {
                                aviso("exito", "Estatus actualizado correctamente");
                                actualizarEstatusOTEnTiempoReal($botonDropdown, nuevoEstatusTexto, nuevoEstatusId, fechaEntrega);
                                //tablaOt.ajax.reload(null, false);
                            } else {
                                aviso("error", res.detalles);
                            }
                        });
                    }
                },
                { texto: "Cancelar", clase: "btn-secondary", funcion: () => {} }
            ]
        });
    });

    $('#id_frente').on('change', function () {
        toggleFrenteFields();
    });

    function calcularFechaTermino() {
        const fechaInicio = $('#fecha_inicio_programado').val();
        const plazoDias = parseInt($('#plazo_dias').val()) || 0;

        if (fechaInicio && plazoDias > 0) {
            const fechaInicioObj = new Date(fechaInicio);
            const fechaTerminoObj = new Date(fechaInicioObj);
            fechaTerminoObj.setDate(fechaTerminoObj.getDate() + plazoDias);

            const year = fechaTerminoObj.getFullYear();
            const month = String(fechaTerminoObj.getMonth() + 1).padStart(2, '0');
            const day = String(fechaTerminoObj.getDate()).padStart(2, '0');
            const fechaTermino = `${year}-${month}-${day}`;

            $('#fecha_termino_programado').val(fechaTermino);
        }
    }

    $('#fecha_inicio_programado').on('change', function () {
        calcularFechaTermino();
    });

    $('#plazo_dias').on('input', function () {
        if ($('#fecha_inicio_programado').val()) {
            calcularFechaTermino();
        }
    });

    $(document).on('click', '.cambiar-estatus-paso-option', function(e) {
        e.preventDefault();
        const $opcionClickeada = $(this);
        const $dropdownContainer = $opcionClickeada.closest('.dropdown');
        const $botonDropdown = $dropdownContainer.find('.dropdown-toggle');

        const pasoId = $(this).closest('.dropdown').find('.paso-id').val();
        const nuevoEstatus = $(this).data('estatus');
        const textoEstatus = $(this).text().trim();
        const mostrarFechaEntrega = (nuevoEstatus == '3');  
        const dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');

        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;
        console.log(datosPaso)
        let contenidoMensaje = `
            <div class="mb-3">
                <p>¿Estás seguro de cambiar el estatus a <strong>${textoEstatus}</strong>?</p>
                <div class="row">
        `;
        
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
                        let fechaEntrega = null;
                        if (mostrarFechaEntrega) {
                            fechaEntrega = $('#fechaEntrega').val();
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
                        
                        const datos = {
                            paso_id: pasoId,
                            nuevo_estatus: nuevoEstatus,
                            comentario: comentario,
                            registro_actividad: JSON.stringify(log.actividad), 
                            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                        };

                        if (mostrarFechaEntrega) {
                            datos.fecha_entrega = $('#fechaEntrega').val();
                        }

                        BMAjax(
                            urlCambiarEstatusPaso,
                            datos,
                            "POST"
                        ).done(function(response) {
                            if (response.exito) {
                                if (window.tablaDetalleActiva) {
                                    actualizarEstatusPasoEnTiempoReal($botonDropdown, textoEstatus, nuevoEstatus, fechaEntrega, comentario);
                                    actualizarProgresoGeneralOT(datosPaso.id_ot)
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

    $(document).on('change', '.fecha-paso-input', function () {
        const pasoId = $(this).data('id');
        const fecha = $(this).val();
        const tipo = $(this).data('tipo');
        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;

        let log = new RegistroActividad(5,datosPaso.id,"ACTUALIZAR");
        log.agregar_actividad({
            nombre:"Actualizó",
            valor_actual:fecha,
            valor_anterior:(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega,
            detalle:`la fecha de:<b> ${(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega}</b> a: <b>${fecha}
                ${(tipo=='1')?'de inicio':
                (tipo=='2')?'de término':'de entrega'} </b>
                del paso <b>${datosPaso.orden}</b> de la OT: <b>${datosPaso.orden_trabajo}</b>`}) 
        
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

    $(document).on('click', '.ver-archivo', function () {
        const pasoId = $(this).data('id');
        const input = $(this).closest('div').find('.archivo-input')[0];
        let datosPaso = window.tablaDetalleActiva ? window.tablaDetalleActiva.row($(this).parents('tr')).data() : null;
        abrirModalSubirArchivo(datosPaso);
        
    });

    $(document).on('click', '.btn-importar-excel', function() {
        const otId = $(this).data('ot');
        abrirModalImportarAnexo(otId);
    });

    function abrirModalImportarAnexo(otId) {
        if ($('#modalImportarAnexo').length === 0) {
            const modalHTML = `
                <div class="modal fade" id="modalImportarAnexo" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="fas fa-file-excel text-secondary me-2"></i>Importar Anexo C</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="formImportarAnexo">
                                    <input type="hidden" name="ot_id" id="import_ot_id">
                                    <div class="mb-3">
                                        <label for="archivoAnexo" class="form-label">Seleccione el archivo Excel (.xlsx)</label>
                                        <input class="form-control" type="file" id="archivoAnexo" name="archivo" accept=".xlsx, .xls, .xlsm">
                                        <div class="text-muted text-12px mt-1 ms-1" style="font-size: 12px;">
                                            <i class="fas fa-info-circle"></i> Asegúrese que el archivo contenga las columnas: PARTIDA, CONCEPTO, UNIDAD, VOLUMEN PTE, P.U.M.N., P.U.USD
                                        </div>
                                    </div>
                                    <div class="alert alert-light border mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="checkSoloActualizar" name="solo_actualizar">
                                        <label class="form-check-label fw-bold" for="checkSoloActualizar">
                                            Actualizar Anexo/Proyección
                                        </label>
                                    </div>
                                    <div class="text-muted text-12px mt-1 ms-1">
                                        <small>
                                            <i class="fas fa-info-circle"></i> 
                                            Actívalo si ya cargaste el Anexo C y solo quieres actualizar el anexo existente o la sabana calendarizada con volúmenes proyectados.
                                            <br>
                                            Desactívalo para cargar un Anexo C o Sabana de recursos nuevo.
                                        </small>
                                    </div>
                                </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" id="btnGuardarImportacion">Importar</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            $('body').append(modalHTML);
        }
        $('#import_ot_id').val(otId);
        $('#archivoAnexo').val(''); 
        const modal = new bootstrap.Modal(document.getElementById('modalImportarAnexo'));
        modal.show();
    }

    $(document).on('click', '#btnGuardarImportacion', function(e) {
        e.preventDefault();
        const formData = new FormData($('#formImportarAnexo')[0]);
        const otId = $('#import_ot_id').val();
        const fileInput = $('#archivoAnexo')[0];
        const soloActualizar = $('#checkSoloActualizar').is(':checked');
        formData.append('csrfmiddlewaretoken', $('input[name="csrfmiddlewaretoken"]').val());
        formData.append('modo_actualizacion', soloActualizar ? 'true' : 'false');
        if (fileInput.files.length === 0) {
            aviso("advertencia", "Debe seleccionar un archivo");
            return;
        }

        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Verificando...');
        fetch(urlImportarAnexo, {
            method: 'POST',
            body: formData
        })
        .then(async response => {
            const contentType = response.headers.get('content-type') || '';
            const disposition = response.headers.get('content-disposition') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                return { tipo: 'json', data: data };
            } 
            else {
                const blob = await response.blob();
                return { tipo: 'file', blob: blob, disposition: disposition };
            }
        })
        .then(resultado => {
            if (resultado.tipo === 'json') {
                const res = resultado.data;
                if (res.exito) {
                    aviso(res.tipo_aviso || 'exito', res.detalles || "Importación completada");
                    $('#modalImportarAnexo').modal('hide');
                    const tablaId = `#tabla-importaciones_${otId}`;
                    if ($.fn.DataTable.isDataTable(tablaId)) {
                        $(tablaId).DataTable().ajax.reload();
                    }
                } else {
                    aviso(res.tipo_aviso || 'advertencia', res.detalles || "Error en la importación");
                }
            } 
            else if (resultado.tipo === 'file') {
                let filename = "Errores_Importacion.xlsx";
                if (resultado.disposition && resultado.disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(resultado.disposition);
                    if (matches != null && matches[1]) { 
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                const url = window.URL.createObjectURL(resultado.blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url); 
                aviso("advertencia", "Se encontraron inconsistencias. Se descargó el reporte de errores.");
            }
        })
        .catch(error => {
            aviso("error", "Error de comunicación con el servidor");
        })
        .finally(() => {
            btn.prop('disabled', false).html(originalText);
        });
    });
});

function guardarEnlaceArchivo() {
    const enlace = $('#enlaceArchivoOt').val().trim();
    const $btn = $('#btnGuardarEnlacePaso');
    if (!enlace) {
        aviso("advertencia", "Por favor ingresa un enlace válido");
        $('#enlaceArchivoOt').focus();
        return;
    }
    
    if (!enlace.startsWith('http://') && !enlace.startsWith('https://')) {
        aviso("advertencia", "La URL debe comenzar con http:// o https://");
        $('#enlaceArchivoOt').focus();
        $('#enlaceArchivoOt').select();
        return;
    }
    
    if (window.pasoActual) {
        $btn.blur();
    
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
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-secondary" id="importaciones-tab_${otId}" data-bs-toggle="tab" data-bs-target="#importaciones_${otId}" type="button" role="tab" aria-controls="importaciones" aria-selected="false">
                            <span class="text-secondary">Importacion anexo C inicial</span>
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
                    <div class="tab-pane fade" id="importaciones_${otId}" role="tabpanel" aria-labelledby="importaciones-tab_${otId}">
                        <div class="actions-toolbar mb-2 d-flex justify-content-end">
                            <button class="btn btn-sm btn-primary btn-importar-excel shadow-sm" data-ot="${otId}">
                                <i class="fas fa-file-upload me-2"></i>Importar Anexo C inicial
                            </button>
                        </div>
                        <table id="tabla-importaciones_${otId}" class="table table-sm table-bordered table-hover w-100">
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
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-secondary" id="importaciones-tab_${otId}" data-bs-toggle="tab" data-bs-target="#importaciones_${otId}" type="button" role="tab" aria-controls="importaciones" aria-selected="false">
                            <span class="text-secondary">Importacion anexo C modificado</span>
                        </button>
                    </li>
                </ul>
                <div class="tab-content p-3 border border-top-0 bg-white" id="myTabContent_${otId}">
                    <div class="tab-pane fade show active" id="detalle_${otId}" role="tabpanel" aria-labelledby="detalle-tab_${otId}">
                        <table id="tabla-detalle-ot_${otId}" class="table table-sm table-bordered table-hover w-100">
                        </table>
                    </div>
                    <div class="tab-pane fade" id="importaciones_${otId}" role="tabpanel" aria-labelledby="importaciones-tab_${otId}">
                        <div class="actions-toolbar mb-2 d-flex justify-content-end">
                            <button class="btn btn-sm btn-primary btn-importar-excel shadow-sm" data-ot="${otId}">
                                <i class="fas fa-file-upload me-2"></i>Importar Anexo C modificado
                            </button>
                        </div>
                        <table id="tabla-importaciones_${otId}" class="table table-sm table-bordered table-hover w-100">
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
        pageLength: 10,    
        lengthChange: false, 
        dom: '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>', 
        language: {
            "lengthMenu": "",  
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
                    const estatusColors = {
                        '1': '#fad91f',   
                        '2': '#55c0e9',   
                        '3': '#95c93d',   
                        '4': '#f05523',   
                        '14': '#54565a'   
                    };
                    
                    const estatusTextos = {
                        '1': 'PENDIENTE',
                        '2': 'PROCESO', 
                        '3': 'COMPLETADO',
                        '4': 'CANCELADO',
                        '14': 'NO APLICA'
                    };
                    const textoActual = estatusTextos[data] || 'PENDIENTE';
                    const colorActual = estatusColors[data] || '#fad91f';
                    
                    return `
                        <div class="dropdown">
                            <button class="btn btn-sm dropdown-toggle text-white w-100" 
                                    style="background-color: ${colorActual}; border-color: ${colorActual};"
                                    type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ${textoActual}
                            </button>
                            <ul class="dropdown-menu w-100">
                                <li><a class="dropdown-item cambiar-estatus-paso-option" href="#" data-estatus="1">PENDIENTE</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" href="#" data-estatus="2">PROCESO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" href="#" data-estatus="3">COMPLETADO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" href="#" data-estatus="4">CANCELADO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-paso-option" href="#" data-estatus="14">NO APLICA</a></li>
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
                        const urlCodificada = encodeURI(row.archivo);
                        const archivoAcortado = row.archivo.length > 30 ? 
                            row.archivo.substring(0, 30) + '...' : row.archivo;
                            
                        return `
                            <a class="table-icon ver-archivo" 
                                title="Cambiar archivo" 
                                data-id="${row.id}">
                                <i class="fas fa-upload text-secondary"></i>
                            </a>
                            <a class="table-icon ver-archivo-externo" 
                                href="${urlCodificada}" 
                                target="_blank" 
                                title="Abrir: ${archivoAcortado}"
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-id="${row.id}">
                                <i class="fas fa-eye" style="color: #f05523;"></i>
                            </a>
                        `;
                    } else {
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
                d.tipo = 5; 
                d.ot_principal = otId;
            }
        },
        createdRow: function (row, data, dataIndex) {
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
                "data": "num_reprogramacion",
                "title": "No.",
                "width": "20px"
            },
            {
                "data": "orden_trabajo",
                "title": "Folio OT"
            },
            {
                "data": "oficio_ot",
                "title": "Oficio OT",
                "width": "20%"
            },
            {
                "data": "fecha_inicio_real",
                "title": "Fecha de inicio real"
            },
            {
                "data": "fecha_termino_real",
                "title": "Fecha término real"
            },
            {
                "data": "progreso_final",
                "title": "Progreso",
                "width": "20%",
                "render": function(data, type, row) {
                    let color = '#95c93d'; 
                    if (data < 25) color = '#f05523';      
                    else if (data < 75) color = '#fad91f'; 
                    
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    const tooltip = `Tiempo: ${row.progreso_tiempo}% | Pasos: ${row.progreso_pasos}%`;
                    
                    return `
                        <div title="${tooltip}" data-bs-toggle="tooltip">
                            <div class="progress" style="height: 18px; cursor: pointer;">
                                <div class="progress-bar" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%; background-color: ${color};" 
                                    aria-valuenow="${porcentaje}">
                                </div>
                            </div>
                            <div class="text-center mt-1" style="font-size: 13px;">
                                <span class="badge text-white" style="background-color: #95c93d;">${row.dias_transcurridos}/${row.plazo_total}dP</span>
                                <span class="badge text-white" style="background-color: #54565a;">${row.dias_transcurridos_real}/${row.plazo_total_real}dR</span>
                                <span class="ms-2">${porcentaje}%</span>
                                <span class="ms-2 text-muted">(${row.pasos_completados}/${row.total_pasos})</span>
                            </div>
                        </div>
                    `;
                },
                "orderable": true
            },
            {
                "data": "estatus_ot_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "width": "5%",
                "render": function (data, type, row) {
                    // Mapa de colores para Estatus de OT
                    const estatusColors = {
                        'POR DEFINIR': '#54565a',            
                        'ASIGNADA': '#fad91f',               
                        'CANCELADA': '#f05523',              
                        'DIFERIDA': '#f05523',               
                        'EN EJECUCION': '#55c0e9',           
                        'SUSPENDIDA': '#54565a',             
                        'TERMINADA': '#95c93d',              
                        'POR CANCELAR': '#f05523'            
                    };

                    const btnColor = estatusColors[data] || '#54565a'; 

                    if (row.estatus_numero === 1) {
                        return `
                            <div class="dropdown">
                                <button class="btn btn-sm dropdown-toggle text-white w-100" 
                                        style="background-color: ${btnColor}; border-color: ${btnColor};"
                                        type="button" data-bs-toggle="dropdown" data-bs-display="static" 
                                        aria-expanded="false">
                                    ${data}
                                </button>
                                <ul class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto;">
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="5">ASIGNADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="8">EN EJECUCION</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="9">SUSPENDIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="7">DIFERIDA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="16">DIFERIDA(SIN INICIAR)</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="10">TERMINADA</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="11">POR CANCELAR</a></li>
                                    <li><a class="dropdown-item cambiar-estatus-option" href="#" data-estatus="6">CANCELADA</a></li>
                                </ul>
                                <input type="hidden" class="ot-id" value="${row.id}">
                            </div>
                        `;
                    } else {
                        return `<button class="btn btn-sm text-white w-100" 
                                        style="background-color: ${btnColor}; border-color: ${btnColor};"
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
                "width": "70px",
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

function initTablaImportaciones(otId) {
    $(`#tabla-importaciones_${otId}`).DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        searching: true,
        paging: true,
        info: true,
        pageLength: 25,
        lengthChange: false,
        dom: '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
        language: {
            "info": "Mostrando _START_ a _END_ de _TOTAL_ partidas",
            "infoEmpty": "No hay partidas importadas",
            "infoFiltered": "",
            "paginate": {
                "first": "‹‹",
                "last": "››",
                "next": "›",
                "previous": "‹"
            },
            "emptyTable": "No se han importado partidas para esta OT"
        },
        ajax: {
            url: urlDataTableImportaciones,
            type: "GET",
            data: {
                ot_id: otId
            }
        },
        columns: [
            { 
                data: "codigo_concepto", 
                title: "Partida",
                width: "10%"
            },
            { 
                data: "descripcion", 
                title: "Descripción" 
            },
            { 
                data: "unidad", 
                title: "Unidad",
                width: "8%",
                className: "text-center"
            },
            { 
                data: "cantidad", 
                title: "Cantidad",
                width: "10%",
                className: "text-end",
                render: $.fn.dataTable.render.number(',', '.', 4)
            },
            { 
                data: "precio_unitario_mn", 
                title: "MXN",
                width: "12%",
                className: "text-end",
                render: $.fn.dataTable.render.number(',', '.', 2, '$ ')
            },
            { 
                data: "precio_unitario_usd", 
                title: "USD",
                width: "12%",
                className: "text-end",
                render: $.fn.dataTable.render.number(',', '.', 2, '$ ')
            },
            { 
                data: "importe", 
                title: "Importe homologado",
                width: "12%",
                className: "text-center",
                render: $.fn.dataTable.render.number(',', '.', 2, '$ ')
            }
        ]
    });
}

function toggleFrenteFields() {
    const frenteId = $('#id_frente').val();

    const $divEmbarcacion = $('#id_embarcacion').closest('.mb-3');
    const $divPlataforma = $('#id_plataforma').closest('.mb-3');
    const $divIntercom = $('#id_intercom').closest('.mb-3');
    const $divPatio = $('#id_patio').closest('.mb-3');

    const $checkPatio = $('#check_fase_patio');
    const $divCheckContainer = $('#div-check-patio');

    $divEmbarcacion.attr('hidden', true);
    $divPlataforma.attr('hidden', true);
    $divIntercom.attr('hidden', true);
    $divPatio.attr('hidden', true);
    $divCheckContainer.attr('hidden', true);


    $('#id_embarcacion, #id_plataforma, #id_intercom, #id_patio, #id_patio_fase').prop('disabled', true);

    let promises = [];

    if (frenteId == '2') {  
        $divEmbarcacion.removeAttr('hidden');
        $divPlataforma.removeAttr('hidden');
        $divIntercom.removeAttr('hidden');

        $divCheckContainer.removeAttr('hidden');
        $checkPatio.prop('disabled', false); 
        $('#id_patio_fase').prop('disabled', false);
        
        promises.push(cargarSitios(6, '#id_embarcacion'));
        promises.push(cargarSitios(7, '#id_plataforma'));
        promises.push(cargarSitios(5, '#id_intercom'));
        promises.push(cargarSitios(3, '#id_patio_fase')); 

    } else if (frenteId == '1') {   
        $divPatio.removeAttr('hidden');
        $divPlataforma.removeAttr('hidden');
        $divIntercom.removeAttr('hidden');

        promises.push(cargarSitios(3, '#id_patio'));
        promises.push(cargarSitios(7, '#id_plataforma'));
        promises.push(cargarSitios(5, '#id_intercom'));

    } else if (frenteId == '4') {   
        $divPlataforma.removeAttr('hidden');

        $divCheckContainer.removeAttr('hidden');
        $checkPatio.prop('disabled', false); 
        $('#id_patio_fase').prop('disabled', false);
        promises.push(cargarSitios(7, '#id_plataforma'));
        promises.push(cargarSitios(3, '#id_patio_fase')); 
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

function actualizarEstatusOTEnTiempoReal(dropdownButton, nuevoTexto, nuevoEstatusId, fechaEntrega = null) {
    const estatusClasses = {
        'POR DEFINIR': 'bg-secondary',
        'ASIGNADA': 'bg-primary',
        'CANCELADA': 'bg-danger',
        'DIFERIDA': 'bg-warning',
        'DIFERIDA(SIN INICIAR)': 'bg-warning',
        'EN EJECUCION': 'bg-info',
        'SUSPENDIDA': 'bg-warning',
        'TERMINADA': 'bg-success',
        'POR CANCELAR': 'bg-danger'
    };
    
    dropdownButton.removeClass(function (index, className) {
        return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
    })
    .addClass(estatusClasses[nuevoTexto] || 'bg-secondary')
    .text(nuevoTexto);
    const tr = dropdownButton.closest('tr');
    const tableApi = window.tablaOt; 
    const row = tableApi.row(tr);
    
    if(row.length){
        let rowData = row.data();
        rowData.estatus_ot_texto = nuevoTexto;
        if (nuevoEstatusId == '10' && fechaEntrega) { 
            rowData.fecha_termino_real = fechaEntrega;
            const parts = fechaEntrega.split('-');
        }
        row.data(rowData).invalidate().draw(false);
    }
}

function actualizarEstatusPasoEnTiempoReal(dropdownButton, nuevoTexto, nuevoEstatus, fechaInputVal, comentarioInputVal) {
    const estatusClasses = {
        'PENDIENTE': 'bg-warning',
        'PROCESO': 'bg-primary', 
        'COMPLETADO': 'bg-success',
        'CANCELADO': 'bg-danger',
        'NO APLICA': 'bg-secondary'
    };
    
    dropdownButton.removeClass('bg-warning bg-primary bg-success bg-danger bg-secondary')
                    .addClass(estatusClasses[nuevoTexto] || 'bg-secondary')
                    .text(nuevoTexto);

    const tr = dropdownButton.closest('tr');
    if (window.tablaDetalleActiva) {
        const row = window.tablaDetalleActiva.row(tr);
        if(row.length) {
            let d = row.data();
            d.estatus_paso = nuevoEstatus;
            if (nuevoEstatus == '3' && fechaInputVal) {
                const parts = fechaInputVal.split('-');
                if (parts.length === 3) {
                    d.fecha_entrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    d.fecha_entrega = fechaInputVal;
                }
            }
            if(comentarioInputVal){
                 d.comentario = comentarioInputVal;
            }
            row.data(d).invalidate().draw(false);
        }
    } else {
        const table = tr.closest('table');
        const headers = table.find('thead > tr > th'); 
        const tds = tr.find('td'); 
        let fechaEntregaCell = null;
        fechaEntregaCell = tds.eq(4); 
        let inputsFecha = tr.find('.fecha-paso-input');
        if (nuevoEstatus == '3' && fechaEntregaCell && fechaInputVal) {
            const parts = fechaInputVal.split('-');
            const fechaFormateada = (parts.length === 3) ? `${parts[2]}/${parts[1]}/${parts[0]}` : fechaInputVal;
            fechaEntregaCell.text(fechaFormateada);
        }
        if (inputsFecha.length) {
            if (['3', '14', 3, 14].includes(nuevoEstatus)) { 
                inputsFecha.prop('disabled', true);
            } else {
                inputsFecha.prop('disabled', false);
            }
        }
    }
}

function actualizarProgresoGeneralOT(otId) {
    BMAjax(
        urlObtenerProgresoGeneralOT,
        { ot_id: otId },
        "GET"
    ).done(function(response) {
        if (response.exito) {
            tablaOt.rows().every(function() {
                const rowData = this.data();
                if (rowData.id == otId) {
                    rowData.progreso_final = response.progreso;
                    rowData.pasos_completados = response.pasos_completados;
                    rowData.total_pasos = response.total_pasos;
                    rowData.progreso_tiempo = response.progreso_tiempo;
                    rowData.progreso_pasos = response.progreso_pasos;
                    rowData.dias_transcurridos = response.dias_transcurridos;
                    rowData.plazo_total = response.plazo_total;
                    rowData.dias_transcurridos_real = response.dias_transcurridos_real;
                    rowData.plazo_total_real = response.plazo_total_real;
                    this.data(rowData).invalidate();
                    return false;
                }
            });

            if (typeof tablaReprogramaciones !== 'undefined' && tablaReprogramaciones) {
                tablaReprogramaciones.rows().every(function() {
                    const rowData = this.data();
                    if (rowData.id == otId) {
                        rowData.progreso_final = response.progreso;
                        rowData.pasos_completados = response.pasos_completados;
                        rowData.total_pasos = response.total_pasos;
                        rowData.progreso_tiempo = response.progreso_tiempo;
                        rowData.progreso_pasos = response.progreso_pasos;
                        rowData.dias_transcurridos = response.dias_transcurridos;
                        rowData.plazo_total = response.plazo_total;
                        rowData.dias_transcurridos_real = response.dias_transcurridos_real;
                        rowData.plazo_total_real = response.plazo_total_real;
                        this.data(rowData).invalidate();
                        return false;
                    }
                });
            }
        }
    }).fail(function() {
        console.error("Error al actualizar el progreso de la OT");
        return false;
    });
}
