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
                "data": "id",
                "title": "ID"
            },
            {
                "data": "descripcion",
                "title": "Nombre"
            },
            {
                "data": "activo",
                "title": "Estatus",
                "render": function(data, type, row) {
                    const estatusTipo = {
                        'Activo': 'bg-success',
                        'Inactivo': 'bg-danger'
                    };
                    return `<span class="badge ${estatusTipo[data] || 'bg-secondary'}">${data}</span>`;
                }
            },
            {
                "data": null,
                "title": "Acciones",
                "class": "text-center",
                "render": function(fila) {
                    return `
                        <a class="table-icon editar-responsable" title="Editar paso" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar-responsable" title="Eliminar" data-id="${fila.id}">
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

    $("#btn-panel-filtros").on("click", function () {
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        offcanvas.show();
    });

    $("#aplicar-filtros").on("click", function () {
        tablaPte.draw();
        var offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        offcanvas.hide();
    });

    $("#limpiar-filtros").on("click", function () {
        $("#filtro-estado").val("");
        $("#filtro-tipo").val("");
        tablaPte.draw();
        var offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        offcanvas.hide();
    });

    // Abrir panel para crear nueva embarcación
    $(".btn-primary").on("click", function() {
        if ($(this).find('span').text().trim() === 'Crear nuevo') {
            abrirPanelCrear();
        }
    });

    // Función para abrir panel de creación
    function abrirPanelCrear() {
        // Limpiar formulario
        $("#formulario-responsable")[0].reset();
        $("#id").val("");
        $("#panel-title").text("Crear Responsable");
        $("#activo").prop("checked", true);
        
        // Mostrar panel
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-responsable", function () {
        const embarcacion_id = $(this).data('id');
        abrirPanelEditar(embarcacion_id);
    });
    
    // Función para abrir panel de edición
    function abrirPanelEditar(id) {
        BMAjax(
            urlObtenerResponsable, {id:id}, "GET")
            .done(function(data) {
                $("#id").val(data.id);
                $("#descripcion").val(data.descripcion);
                $("#comentario").val(data.comentario);
                $("#panel-title").text("Editar Responsable");
                
                // Mostrar panel
                var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
                offcanvas.show();
            })
            .fail(function() {
                aviso("error", {
                    contenido: "Error al cargar los datos del responsable",
                });
            });
    }

    // Guardar embarcación
    $("#btn-guardar").on("click", function() {
        const formData = {
            id: $("#id").val(),
            descripcion: $("#descripcion").val(),
            comentario: $("#comentario").val()
        };

        // Validación básica
        if (!formData.descripcion.trim()) {
            aviso("advertencia", {
                contenido: "La descripción es obligatoria",
            });
            return;
        }

        const url = formData.id ? urlEditarResponsable : urlCrearResponsable;
        const method = "POST";
        BMAjax(
            url, 
            formData, 
            method
        ).done(function(response) {
            if (response.exito) {
                var offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelCrearEditar'));
                offcanvas.hide();
                tablaPte.ajax.reload();
            }
        });
    });
    
    // Eliminar PTE
    $(document).on("click", ".eliminar-responsable", function () {
        const responsable_id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar el responsable?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const url = urlEliminarResponsable;
                        const method = "POST";
                        BMAjax(
                            url, 
                            { id: responsable_id },
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
});

