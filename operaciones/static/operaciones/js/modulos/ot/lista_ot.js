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
        createdRow: function(row, data, dataIndex) {
            // Si el estatus es -1 aplicar estilo especial
            if (data.estatus === -1 || data.estatus === 'Por definir') {
                $(row).addClass('fila-por-definir');
            }
        },
        columns: [
            // {
            //     "data": null,
            //     "title": "",
            //     "width": "1%",
            //     "render": function (data, type, row) {
            //         // Mostrar ícono + si tiene detalles
            //         let ampliar = "";
            //         ampliar = `<a class="table-icon detalle-pte" title="Ver detalles">
            //                         <i class="fas fa-plus-square"></i>
            //                     </a>`;
            //         return ampliar;
            //     },
            //     "orderable": false
            // },
            {
                "data": "id",
                "title": "ID"
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
                "render": function(data, type, row) {
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
    $("#tabla tbody").on("click", ".editar_ot", function() {
        const otID = $(this).data('id');
        abrirModalEditarOT(otID);
    });

    // Función para abrir modal de edición
    function abrirModalEditarOT(otID) {
        $("#formCrearOT")[0].reset();
        $("#modalCrearOTLabel").text("Editar OT");
        // Obtener datos del PTE
        BMAjax(
            urlObtenerDatos, {id:otID}, "GET")
            .done(function(datos) {
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

                cargarResponsablesProyecto().done(function() {
                    $("#responsable_proyecto").val(ot.responsable_proyecto);
                });
                // Verificar si es reprogramación y habilitar campos
                const esReprogramacion = (ot.id_tipo_id === 5);
                if (esReprogramacion) {
                    $('#num_reprogramacion').val(ot.num_reprogramacion).prop('disabled', false);
                    $('#ot_principal').val(ot.ot_principal_id).prop('disabled', false);
                    cargarOTsPrincipales().done(function() {
                        $('#ot_principal').val(ot.ot_principal_id);
                    });
                }
                // Mostrar modal
                const modal = new bootstrap.Modal(document.getElementById('modalCrearOT'));
                modal.show();
            })
            .fail(function() {
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

    $("#btnGuardarOT").off('click').on("click", function() {
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
            success: function(response) {
                if (response.exito) {
                    aviso(response.tipo_aviso, response.detalles);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearOT'));
                    modal.hide();
                    tablaPte.ajax.reload();
                } else {
                    aviso(response.tipo_aviso, response.detalles);
                }
            },
            error: function(xhr, status, error) {
                aviso("error", "Error al guardar el OT");
            },
            complete: function() {
                btn.prop('disabled', false).html(originalText);
            }
        });
    });

    $(document).on("click", ".eliminar_ot", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar esta OT?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const url = urlEliminarOT;
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

    // Evento para cambiar tipo de OT (INICIAL/REPROGRAMACION)
    $(document).on('change', '#id_tipo', function() {
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
            $('#responsable_proyecto').removeAttr('disabled');
        } else {
            $divOTPrincipal.hide().attr('hidden', 'hidden');
            $divNumReprogramacion.hide().attr('hidden', 'hidden');
            $('#responsable_proyecto').attr('disabled');
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
            cargarOTsPrincipales();
        }
    });

    function cargarOTsPrincipales() {
        const selectOT = $('#ot_principal');
        
        // Mostrar estado de carga
        selectOT.empty().append('<option value="">Cargando OTs...</option>').prop('disabled', true);
        
        $.ajax({
            url: urlObtenerOTPrincipal,
            type: 'GET',
            dataType: 'json',
            success: function(response) {                
                selectOT.empty();
                selectOT.append('<option value="" selected disabled>Seleccione una OT principal</option>');
                
                if (response && response.length > 0) {
                    response.forEach(function(ot) {
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
                            noResults: function() {
                                return "No se encontraron OTs";
                            },
                            searching: function() {
                                return "Buscando...";
                            }
                        }
                    });
                    
                } else {
                    selectOT.append('<option value="" disabled>No hay OTs disponibles</option>');
                }
                
                selectOT.prop('disabled', false);
            },
            error: function(xhr, status, error) {
                selectOT.empty();
                selectOT.append('<option value="" selected disabled>Error al cargar OTs</option>');
                selectOT.prop('disabled', false);
                aviso("error", "No se pudieron cargar las OTs principales");
            }
        });
    }

    // Evento para cambiar estatus de OT
    $(document).on('click', '.cambiar-estatus-option', function(e) {
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
        ).done(function(response) {
            if (response.exito) {
                aviso("exito", "Estatus actualizado correctamente");
                tablaPte.ajax.reload(); // Recargar la tabla
            } else {
                aviso("error", response.detalles || "Error al cambiar el estatus");
            }
        }).fail(function() {
            aviso("error", "Error al cambiar el estatus");
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