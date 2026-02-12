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
                "title": "Descripcion"
            },
            {
                "data": "nivel_afectacion",
                "title": "Afectacion"
            },
            {
                "data": "activo",
                "title": "Estatus",
                "render": function(data, type, row) {
                    const estatusColors = {
                        'Activo': '#95c93d',   
                        'Inactivo': '#f05523'
                    };
                    
                    const color = estatusColors[data] || '#54565a';
                    
                    return `<span class="badge text-white" style="background-color: ${color};">${data}</span>`;
                }
            },
            {
                "data": null,
                "title": "Acciones",
                "class": "text-center",
                "render": function(fila) {
                    return `
                        <a class="table-icon editar-frente" title="Editar paso" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar-frente" title="Eliminar" data-id="${fila.id}">
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

    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaPte.draw();
        }
    });

    $("#tabla_length").detach().appendTo("#select-length");

    $("#btn-panel-filtros").on("click", function () {
        fn_show_panel("#panel-filtro");
    });

    $("#filtrar").on("click", function () {
        tablaPte.draw();
        fn_show_panel();
    });

    $("#limpiar").on("click", function () {
        $("#slc-estado").val("");
        tablaPte.draw();
    });

    $(".btn-primary").on("click", function() {
        if ($(this).find('span').text().trim() === 'Crear nuevo') {
            abrirPanelCrear();
        }
    });

    function abrirPanelCrear() {
        $("#formulario-frente")[0].reset();
        $("#id").val("");
        $("#panel-title").text("Crear frente");

        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-frente", function () {
        const id = $(this).data('id');
        abrirPanelEditar(id);
    });

    function abrirPanelEditar(id) {
        BMAjax(
            urlObtenerFrente, { id: id }, "GET")
            .done(function (data) {
                $("#id").val(data.id);
                $("#descripcion").val(data.descripcion);
                $("#afectacion").val(data.afectacion);
                $("#comentario").val(data.comentario);
                $("#panel-title").text("Editar frente");

                var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
                offcanvas.show();
            })
            .fail(function () {
                aviso("error", {
                    contenido: "Error al cargar los datos del frente",
                });
            });
    }

    $("#btn-guardar").on("click", function () {
        const formData = {
            id: $("#id").val(),
            descripcion: $("#descripcion").val(),
            afectacion: $("#afectacion").val(),
            comentario: $("#comentario").val()
        };

        if (!formData.descripcion.trim()) {
            aviso("advertencia", {
                contenido: "La descripción es obligatoria",
            });
            return;
        } else if (!formData.afectacion) {
            aviso("advertencia", {
                contenido: "La afectación es obligatoria",
            });
            return;
        }

        const url = formData.id ? urlEditarFrente : urlCrearFrente;
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

    $(document).on("click", ".eliminar-sitio", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar este frente y su afectación?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function () {
                        const url = urlEliminarFrente;
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
                    funcion: function() { return }
                }
            ]
        });
    });
});

