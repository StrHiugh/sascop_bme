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
                "data": "id_tipo_id",
                "title": "Tipo"
            },
            {
                "data": "oficio_pte",
                "title": "PTE"
            },
            {
                "data": "descripcion_trabajo",
                "title": "Descripción"
            },
            {
                "data": "responsable_proyecto",
                "title": "Responsable"
            },
            {
                "data": null,
                "title": "Opciones",
                "class": "text-center",
                "width": "150px",
                "orderable": false,
                render: function (fila) {
                    return `
                        <a class="table-icon ver-detalle" title="Ver" data-id="${fila.id}">
                            <i class="fas fa-eye"></i>
                        </a>
                        <a class="table-icon editar_pte" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar_pte" title="Eliminar" data-id="${fila.id}">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
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
            let tablaDetallePTE = $(`#tabla-detalle-pte_${pteId}`).DataTable({
                processing: true,
                serverSide: true,
                responsive: true,
                searching: false,
                paging: false,
                info: false,
                ajax: {
                    url: urlDatatableDetalle,
                    type: "GET",
                    data: function(extra) {
                        extra.pte_header_id = pteId;
                    }
                },
                columns: [
                    {
                        "data": "id_paso_nombre",
                        "title": "Paso"
                    },
                    {
                        "data": "fecha_entrega",
                        "title": "Fecha Entrega",
                        "render": function(data) {
                            return data ? new Date(data).toLocaleDateString('es-ES') : '-';
                        }
                    },
                    {
                        "data": "comentario",
                        "title": "Comentario"
                    },
                    {
                        "data": "estatus_pte_texto",
                        "title": "Estatus",
                        "render": function(data, type, row) {
                            const estatusClasses = {
                                'Pendiente': 'bg-warning',
                                'En Proceso': 'bg-primary', 
                                'Completado': 'bg-success',
                                'Rechazado': 'bg-danger'
                            };
                            return `<span class="badge ${estatusClasses[data] || 'bg-secondary'}">${data}</span>`;
                        }
                    },
                    {
                        "data": null,
                        "title": "Acciones",
                        "class": "text-center",
                        "render": function(fila) {
                            return `
                                <a class="table-icon editar-paso" title="Editar paso" data-id="${fila.id}">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <a class="table-icon cambiar-estatus" title="Cambiar estatus" data-id="${fila.id}">
                                    <i class="fas fa-sync-alt"></i>
                                </a>
                            `;
                        }
                    }
                ]
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

    // Eliminar PTE
    $(document).on("click", ".eliminar_pte", function () {
        const pteId = $(this).data('id');
        if (confirm('¿Estás seguro de que deseas eliminar este PTE?')) {

        }
    });

    // Editar PTE
    $(document).on("click", ".editar_pte", function () {
        const pteId = $(this).data('id');
        window.location.href = `${urlEditar}/${pteId}`;
    });

});

// Función para generar HTML de la tabla de detalles
function fnHTMLTablaDetallePTE(pteId) {
    return `
        <div class="detalle-pte-content">
            <h6 class="mb-3">Detalles del PTE - Pasos del Proceso</h6>
            <table id="tabla-detalle-pte_${pteId}" class="table table-sm table-bordered">
            </table>
        </div>
    `;
}