$(document).ready(function () {
    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[0, "asc"]],
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
                "data": "frente",
                "title": "Frente"
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
                        <a class="table-icon editar-sitio" title="Editar paso" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar-sitio" title="Eliminar" data-id="${fila.id}">
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

    $(".btn-primary").on("click", function() {
        if ($(this).find('span').text().trim() === 'Crear nuevo') {
            abrirPanelCrear();
        }
    });

    function abrirPanelCrear() {
        $("#formulario-sitio")[0].reset();
        $("#id").val("");
        $("#panel-title").text("Crear Sitio");
        $("#id_frente").val("");
        $("#activo").prop("checked", true);
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-sitio", function () {
        const sitio_id = $(this).data('id');
        abrirPanelEditar(sitio_id);
    });

    function abrirPanelEditar(id) {
        BMAjax(
            urlObtenerSitio, { id: id }, "GET")
            .done(function (data) {
                $("#id").val(data.id);
                $("#descripcion").val(data.descripcion);
                $("#comentario").val(data.comentario);
                $("#id_frente").val(data.id_frente);
                $("#panel-title").text("Editar Sitio");

                var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
                offcanvas.show();
            })
            .fail(function () {
                aviso("error", {
                    contenido: "Error al cargar los datos del sitio",
                });
            });
    }

    $("#btn-guardar").on("click", function () {
        const formData = {
            id: $("#id").val(),
            descripcion: $("#descripcion").val(),
            comentario: $("#comentario").val(),
            id_frente: $("#id_frente").val()
        };

        if (!formData.descripcion.trim()) {
            aviso("advertencia", {
                contenido: "La descripción es obligatoria",
            });
            return;
        }

        if (!formData.id_frente) {
            aviso("advertencia", {
                contenido: "El frente es obligatorio",
            });
            return;
        }

        const url = formData.id ? urlEditarSitio : urlCrearSitio;
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
        const sitio_id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar este sitio?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function () {
                        const url = urlEliminarSitio;
                        const method = "POST";
                        BMAjax(
                            url,
                            { sitio_id: sitio_id },
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

