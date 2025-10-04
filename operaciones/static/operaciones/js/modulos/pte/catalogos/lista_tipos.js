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
            "info": "Mostrando _START_ de _TOTAL_ registros.",
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
                "data": "id",
                "visible": false
            },
            {
                "data": "descripcion",
                "title": "Descripcion"
            },
            {
                "data": "nivel_afectacion",
                "title": "Afectacion"
            },
            {
                "data": "activo",
                "title": "Estatus"
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
            console.log('Eliminando PTE:', pteId);

        }
    });

    // Editar PTE
    $(document).on("click", ".editar_pte", function () {
        const pteId = $(this).data('id');
        window.location.href = `${urlEditar}/${pteId}`;
    });

});

