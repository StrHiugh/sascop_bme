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
        columns: [
            {
                "data": null,
                "title": "",
                "width": "1%",
                "render": function (data, type, row) {
                    // Mostrar ícono + si tiene detalles
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
                "title": "ID"
            },
            {
                "data": "descripcion_tipo",
                "title": "Tipo"
            },
            {
                "data": "oficio_pte",
                "title": "Folio PTE"
            },
            {
                "data": "oficio_solicitud",
                "title": "Oficio solicitud"
            },
            {
                "data": "descripcion_trabajo",
                "title": "Descripción de trabajo"
            },
            {
                "data": "progreso",
                "title": "Progreso",
                "render": function(data, type, row) {
                    let color = 'bg-success';
                    if (data < 25) color = 'bg-danger';
                    else if (data < 50) color = 'bg-warning';
                    else if (data < 75) color = 'bg-info';
                    
                    // Asegurar que data sea un número válido
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    
                    return `
                        <div title="${row.pasos_completados}/${row.total_pasos} pasos completados">
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${color} progress-bar-striped" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%" 
                                    aria-valuenow="${porcentaje}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                </div>
                            </div>
                            <div class="text-center text-dark fw-bold mt-1" style="font-size: 12px;">
                                ${porcentaje}%
                            </div>
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
                        <a class="table-icon editar_pte" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar_pte" title="Eliminar" data-id="${fila.id}">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
                    
                    // Si el progreso es 100%, mostrar botón para crear OTE
                    if (fila.progreso === 100) {
                        botones += `
                            <a class="table-icon crear-ot" title="Crear Orden de Trabajo" data-id="${fila.id}">
                                <i class="fas fa-clipboard-check text-success"></i>
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

    // Evento para expandir detalles del PTE
    $("#tabla tbody").on("click", ".detalle-pte", function () {
        let tr = $(this).closest("tr");
        let row = tablaPte.row(tr);
        let pteId = row.data().id;

        if (row.child.isShown()) {
            // Cerrar detalles
            let tablaDetalle = $(`#tabla-detalle-pte_${pteId}`);
            if (tablaDetalle.length && $.fn.DataTable.isDataTable(tablaDetalle)) {
                // Destruir el DataTable hijo si existe
                tablaDetalle.DataTable().destroy();
                tablaDetalle.empty(); // Limpiar el contenido de la tabla
            }
            
            row.child.hide(); // Ocultar el child
            tr.removeClass('shown');
            $(this).find('i').removeClass('fa-minus-square').addClass('fa-plus-square'); // Cambiar ícono
        } else {
            // Abrir detalles
            $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
            
            row.child(
                $(`<div class="detalle-pte-container"></div>`).html(
                    fnHTMLTablaDetallePTE(pteId)
                )
            ).show();
            
            // Inicializar DataTable de detalles
            // Inicializar DataTable de detalles solo con paginación
            let tablaDetallePTE = $(`#tabla-detalle-pte_${pteId}`).DataTable({
                processing: true,
                serverSide: true,
                responsive: true,
                searching: false,  // Sin búsqueda
                paging: true,      // Paginación activada
                info: true,        // Info de paginación
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
                    url: urlDatatableDetalle,
                    type: "GET",
                    data: function(d) {
                        d.pte_header_id = pteId;
                        // DataTables envía automáticamente:
                        // d.start = inicio
                        // d.length = cantidad (10)
                    }
                },
                columns: [
                    {
                        "data": "orden",
                        "title": "Paso",
                        "orderable": true,
                        "className": "text-center"
                    },
                    {
                        "data": "desc_paso", 
                        "title": "Descripción",
                        "orderable": true
                    },
                    {
                        "data": "fecha_entrega",
                        "title": "Fecha Entrega",
                        "orderable": true,
                        "className": "text-center",
                        "render": function(data) {
                            return data ? new Date(data).toLocaleDateString('es-ES') : '-';
                        }
                    },
                    {
                        "data": "comentario",
                        "title": "Comentario",
                        "orderable": true
                    },
                    {
                        "data": "estatus_pte_texto",
                        "title": "Estatus",
                        "orderable": true,
                        "className": "text-center",
                        "render": function(data, type, row) {
                            const estatusClasses = {
                                'PENDIENTE': 'bg-warning',
                                'PROCESO': 'bg-primary', 
                                'COMPLETADO': 'bg-success',
                                'CANCELADO': 'bg-danger'
                            };
                            
                            return `
                                <div class="dropdown">
                                    <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                            type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        ${data}
                                    </button>
                                    <ul class="dropdown-menu w-100">
                                        <li><a class="dropdown-item cambiar-estatus-option" data-estatus="1">PENDIENTE</a></li>
                                        <li><a class="dropdown-item cambiar-estatus-option" data-estatus="2">PROCESO</a></li>
                                        <li><a class="dropdown-item cambiar-estatus-option" data-estatus="3">COMPLETADO</a></li>
                                        <li><a class="dropdown-item cambiar-estatus-option" data-estatus="4">CANCELADO</a></li>
                                    </ul>
                                    <input type="hidden" class="paso-id" value="${row.id}">
                                </div>
                            `;
                        }
                    },
                    // {
                    //     "data": null,
                    //     "title": "Acciones",
                    //     "class": "text-center",
                    //     "orderable": false,
                    //     "render": function(data, type, row) {
                    //         return `
                    //             <a class="table-icon editar-paso" title="Editar paso" data-id="${row.id}">
                    //                 <i class="fas fa-edit"></i>
                    //             </a>
                    //         `;
                    //     }
                    // }
                ]
            });
            
            // Evento para cambiar estatus de un paso
            $(`#tabla-detalle-pte_${pteId}`).on('click', '.cambiar-estatus-option', function() {
                const pasoId = $(this).closest('.dropdown').find('.paso-id').val();
                const nuevoEstatus = $(this).data('estatus');
                const textoEstatus = $(this).text().trim();
                const contenidoMensaje = `
                    <div class="mb-3">
                        <p>¿Estás seguro de cambiar el estatus a <strong>${textoEstatus}</strong>?</p>
                        <label for="comentarioCambio" class="form-label">Comentario:</label>
                        <textarea class="form-control" id="comentarioCambio" rows="3" placeholder="Agregar un comentario sobre este cambio..."></textarea>
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
                                const url = urlCambiarEstatusPaso;
                                const method = "POST";
                                BMAjax(
                                    url, 
                                    { 
                                        paso_id: pasoId,
                                        nuevo_estatus: nuevoEstatus,
                                        comentario: comentario, 
                                        csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                                    },
                                    method
                                ).done(function(response) {
                                    if (response.exito) {
                                        tablaDetallePTE.ajax.reload();
                                        // tablaPte.ajax.reload();
                                    }
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
            
            tr.addClass('shown');
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

    // Panel de filtros
    $("#btn-panel-filtros").on("click", function () {
        fn_show_panel("#panel-filtro");
    });

    // Aplicar filtros
    $("#filtrar").on("click", function () {
        tablaPte.draw();
        fn_show_panel();
    });

    // Limpiar filtros
    $("#limpiar").on("click", function () {
        $("#slc-estado").val("");
        tablaPte.draw();
    });

    // Abrir modal para crear PTE
    $(document).on("click", ".crear-pte", function() {
        abrirModalCrearPTE();
    });

    // Evento para editar PTE
    $("#tabla tbody").on("click", ".editar_pte", function() {
        const pteId = $(this).data('id');
        abrirModalEditarPTE(pteId);
    });

    // Función para abrir modal de edición
    function abrirModalEditarPTE(pteId) {
        $("#formCrearPTE")[0].reset();
        $("#modalCrearPTELabel").text("Editar PTE");
        $("#btnGuardarPTE").prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Cargando...');
        // Obtener datos del PTE
        BMAjax(
            urlObtenerDatos, {id:pteId}, "GET")
            .done(function(datos) {
                const pte = datos.datos;
                // Llenar formulario con datos existentes
                $("#pte_id").val(pte.id);
                $("#oficio_pte").val(pte.oficio_pte);
                $("#oficio_solicitud").val(pte.oficio_solicitud);
                $("#descripcion_trabajo").val(pte.descripcion_trabajo);
                $("#fecha_solicitud").val(pte.fecha_solicitud);
                $("#plazo_dias").val(pte.plazo_dias);
                $("#id_tipo").val(pte.id_tipo);
                $("#total_homologado").val(pte.total_homologado);
                $("#oficio_ot").val(pte.id_orden_trabajo);
                $("#comentario_general").val(pte.comentario);
                cargarResponsablesProyecto().done(function() {
                    $("#responsable_proyecto").val(pte.id_responsable_proyecto);
                    $("#btnGuardarPTE").prop('disabled', false).html('Actualizar');
                });
                
                // Mostrar modal
                const modal = new bootstrap.Modal(document.getElementById('modalCrearPTE'));
                modal.show();
            })
            .fail(function() {
                aviso("error", {
                    contenido: "Error al cargar los datos de la PTE",
                });
            });
    }

    function abrirModalCrearPTE() {
        $("#formCrearPTE")[0].reset();
        $("#pte_id").val('');
        $("#modalCrearPTELabel").text("Crear Nueva PTE");
        $("#btnGuardarPTE").html('Guardar PTE');
        const today = new Date().toISOString().split('T')[0];
        $("#fecha_solicitud").val(today);
        
        // Cargar lista de lideres
        cargarResponsablesProyecto();
        
        const modal = new bootstrap.Modal(document.getElementById('modalCrearPTE'));
        modal.show();
    }

    // Función para cargar responsables de proyecto
    function cargarResponsablesProyecto() {
        return $.ajax({
            url: urlObtenerResponsables,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const select = $('#responsable_proyecto');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un responsable</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(responsable) {
                        select.append(`<option value="${responsable.id}">${responsable.descripcion}</option>`);
                    });
                } else {
                    select.append('<option value="" disabled>No hay responsables disponibles</option>');
                }
            },
            error: function(xhr, status, error) {
                const select = $('#responsable_proyecto');
                select.empty().append('<option value="" disabled>Error al cargar responsables</option>');
            }
        });
    }
    
    $("#btnGuardarPTE").off('click').on("click", function() {
        const pteId = $("#pte_id").val();
        const formData = new FormData($("#formCrearPTE")[0]);
        
        // Agregar el ID si estamos editando
        if (pteId) {
            formData.append('id', pteId);
        }
        
        if (!formData.get('responsable_proyecto')) {
            aviso("advertencia", "El responsable del proyecto es obligatorio");
            $("#responsable_proyecto").focus();
            return;
        }
        
        // Mostrar loading
        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');
        
        // Determinar URL y método
        const url = pteId ? urlEditarPTE : urlCrearPTE;
        const method = "POST";
        
        // Enviar datos
        $.ajax({
            url: url,
            type: method,
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.exito) {
                    aviso(response.tipo_aviso, response.detalles);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearPTE'));
                    modal.hide();
                    tablaPte.ajax.reload();
                } else {
                    aviso(response.tipo_aviso, response.detalles);
                }
            },
            error: function(xhr, status, error) {
                aviso("error", "Error al guardar el PTE");
            },
            complete: function() {
                btn.prop('disabled', false).html(originalText);
            }
        });
    });
    // Resetear modal cuando se cierre
    $('#modalCrearPTE').on('hidden.bs.modal', function () {
        $("#formCrearPTE")[0].reset();
        $("#pte_id").val('');
        $("#modalCrearPTELabel").text("Crear Nueva PTE");
        $("#btnGuardarPTE").html('Guardar PTE');
    });

    
    $(document).on("click", ".eliminar_pte", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar esta PTE?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const url = urlEliminarPTE;
                        const method = "POST";
                        BMAjax(
                            url, 
                            { id: id },
                            method
                        ).done(function(response) {
                            if (response.exito) {
                                tablaPte.ajax.reload();
                            }
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

    // Evento para crear OTE desde PTE
    $(document).on("click", ".crear-ot", function () {
        const pteId = $(this).data('id');
        BMensaje({
            titulo: "Crear Orden de Trabajo",
            subtitulo: `
                <div class="mb-3">
                    <p>¿Desea crear una Orden de Trabajo a partir de esta PTE?</p>
                    <label for="folioOT" class="form-label">Folio de la OT:</label>
                    <input type="text" class="form-control" id="folioOT" placeholder="Ingrese el folio de la OT" required>
                </div>
            `,
            botones: [
                {
                    texto: "Crear OT",
                    clase: "btn-primary",
                    funcion: function() {
                        const folioOT = $('#folioOT').val().trim();
                        
                        if (!folioOT) {
                            aviso("advertencia", "El folio de la OT es obligatorio");
                            return;
                        }
                        
                        const url = urlCrearOTE;
                        const method = "POST";
                        
                        BMAjax(
                            url, 
                            { 
                                pte_id: pteId,
                                folio: folioOT,
                                csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                            },
                            method
                        ).done(function(response) {
                            if (response.exito) {
                                aviso(response.tipo_aviso, response.detalles);
                                // Opcional: recargar la tabla si quieres
                                // tablaPte.ajax.reload();
                            } else {
                                aviso(response.tipo_aviso, response.detalles);
                            }
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

});

// Función para generar HTML de la tabla de detalles
function fnHTMLTablaDetallePTE(pteId) {
    return `
        <div class="detalle-pte-content">
            <h6 class="mb-3">Detalles de la PTE - Pasos del proceso</h6>
            <table id="tabla-detalle-pte_${pteId}" class="table table-sm table-bordered">
            </table>
        </div>
    `;
}