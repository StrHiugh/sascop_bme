$(document).ready(function () {
    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        ordering: false,  
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
                "visible": false
            },
            {
                "data": "orden",
                "title": "ID"
            },
            {
                "data": "descripcion",
                "title": "Descripcion"
            },
            {
                "data": "tipo",
                "title": "Tipo"
            },
            {
                "data": "afectacion",
                "title": "Cliente"
            },
            {
                "data": "importancia",
                "title": "Importancia",
                render: function (data, type, row) {
                    return data ? `${data}%` : '';
                }
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
                        <a class="table-icon editar-paso" title="Editar paso" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar_paso" title="Eliminar" data-id="${fila.id}">
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

    // Abrir panel para crear nueva embarcación
    $(".btn-primary").on("click", function() {
        if ($(this).find('span').text().trim() === 'Crear nuevo') {
            abrirPanelCrear();
        }
    });

    // Función para abrir panel de creación
    function abrirPanelCrear() {
        // Limpiar formulario
        $("#formulario-paso")[0].reset();
        $("#id").val("");
        $("#panel-title").text("Crear paso");
        
        // Mostrar panel
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-paso", function () {
        const id = $(this).data('id');
        abrirPanelEditar(id);
    });
    
    // Función para abrir panel de edición
    function abrirPanelEditar(id) {
        BMAjax(
            urlObtenerPaso, {id:id}, "GET")
            .done(function(data) {
                $("#id").val(data.id);
                $("#descripcion").val(data.descripcion);
                $("#orden").val(data.orden);
                $("#importancia").val(data.importancia);
                $("#comentario").val(data.comentario);
                $("#afectacion").val(data.afectacion);
                $("#panel-title").text("Editar paso");
                
                // Mostrar panel
                var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
                offcanvas.show();
            })
            .fail(function() {
                aviso("error", {
                    contenido: "Error al cargar los datos del paso",
                });
            });
    }

    // Guardar embarcación
    $("#btn-guardar").on("click", function() {
        const formData = {
            id: $("#id").val(),
            descripcion: $("#descripcion").val(),
            orden: $("#orden").val(),
            importancia: $("#importancia").val(),
            comentario: $("#comentario").val(),
            afectacion: $("#afectacion").val(),
            tipo: $("#tipo").val()
        };
        // Validación básica
        if (!formData.descripcion.trim()) {
            aviso("advertencia", {
                contenido: "La descripción es obligatoria",
            });
            return;
        } else if (!formData.orden) {
            aviso("advertencia", {
                contenido: "El orden es obligatorio",
            });
            return;
        } else if (!formData.importancia) {
            aviso("advertencia", {
                contenido: "La importancia es obligatoria",
            });
            return;
        } else if (!formData.tipo) {
            aviso("advertencia", {
                contenido: "El tipo es obligatorio",
            });
            return;
        } else if (!formData.afectacion) {
            aviso("advertencia", {
                contenido: "El cliente es obligatorio",
            });
            return;
        } 
        

        const url = formData.id ? urlEditarPaso : urlCrearPaso;
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
    
    $(document).on("click", ".eliminar_paso", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar este paso de PTE y su afectación?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const url = urlEliminarPaso;
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
});

