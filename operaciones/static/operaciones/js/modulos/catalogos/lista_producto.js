$(document).ready(function () {
    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[0, "asc"]],
        lengthMenu: [10, 100, 500, 1000],
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
                extra.tipo_partida = $("#filtro-tipo-partida").val();
                extra.sitio = $("#filtro-sitio").val();
                extra.unidad_medida = $("#filtro-unidad-medida").val();
                extra.estado = $("#filtro-estado").val();
            }
        },
        columns: [
            {
                "data": "id",
                "title": "ID",
                "orderable": true,
                visible: false
            },
            {
                "data": "id_partida",
                "title": "ID Partida",
                "orderable": true,
            },
            {
                "data": "descripcion",
                "title": "Descripción",
                "orderable": true,
            },
            {
                "data": "tipo_partida",
                "title": "Tipo Partida",
                "orderable": true,
            },
            {
                "data": "sitio",
                "title": "Sitio",
                "orderable": true,
            },
            {
                "data": "unidad_medida",
                "title": "Unidad Medida",
                "orderable": true,
            },
            {
                "data": "anexo",
                "title": "Anexo",
                "orderable": true,
            },
            {
                "data": "precio_unitario_mn",
                "title": "Precio MN",
                "orderable": true,
                "render": function (data, type, row) {
                    return data ? `$${parseFloat(data).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00';
                }
            },
            {
                "data": "precio_unitario_usd",
                "title": "Precio USD",
                "orderable": true,
                "render": function (data, type, row) {
                    return data ? `$${parseFloat(data).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00';
                }
            },
            {
                "data": "activo",
                "title": "Estatus",
                "render": function (data, type, row) {
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
                "render": function (data, type, row) {
                    return `
                        <a class="table-icon editar-producto" title="Editar producto" data-id="${row.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar-producto" title="Eliminar" data-id="${row.id}">
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
    cargarUnidadesMedida();
    cargarUnidadesMedidaFiltro();

    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaPte.draw();
        }
    });

    $("#tabla_length").detach().appendTo("#select-length");

    $("#btn-panel-filtros").on("click", function () {
        const offcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        offcanvas.show();
    });
    $("#aplicar-filtros").on("click", function () {
        tablaPte.draw();
        const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        offcanvas.hide();
    });

    $("#limpiar-filtros").on("click", function () {
        $("#form-filtros")[0].reset();
        tablaPte.draw();
    });

    $(".btn-primary").on("click", function () {
        if ($(this).find('span').text().trim() === 'Crear nuevo') {
            abrirPanelCrear();
        }
    });

    function cargarUnidadesMedida() {
        $.ajax({
            url: urlObtenerUndMed,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const select = $('#unidad_medida');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione una opción</option>');

                data.forEach(function (unidad) {
                    select.append(`<option value="${unidad.id}">${unidad.descripcion}</option>`);
                });
            },
            error: function (xhr, status, error) {
                aviso('error', 'Error al cargar las unidades de medida');
            }
        });
    }

    function cargarUnidadesMedidaFiltro() {
        $.ajax({
            url: urlObtenerUndMed,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const select = $('#filtro-unidad-medida');
                select.empty();
                select.append('<option value="">Todas las unidades</option>');

                data.forEach(function (unidad) {
                    select.append(`<option value="${unidad.id}">${unidad.descripcion}</option>`);
                });
            },
            error: function (xhr, status, error) {
            }
        });
    }

    function abrirPanelCrear() {
        $("#formulario-producto")[0].reset();
        $("#id").val("");
        $("#panel-title").text("Crear concepto");
        cargarUnidadesMedida();
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-producto", function () {
        const id = $(this).data('id');
        abrirPanelEditar(id);
    });

    function abrirPanelEditar(id) {
        BMAjax(
            urlObtenerProducto, { id: id }, "GET")
            .done(function (data) {
                $("#id").val(data.id);
                $("#id_partida").val(data.id_partida);
                $("#descripcion").val(data.descripcion_concepto);
                $("#anexo").val(data.anexo);
                $("#comentario").val(data.comentario);
                $("#unidad_medida").val(data.unidad_medida_id);
                $("#sitio").val(data.sitio_id);
                $("#tipo_partida").val(data.tipo_partida_id);
                $("#precio_unitario_mn").val(data.precio_unitario_mn);
                $("#precio_unitario_usd").val(data.precio_unitario_usd);
                $("#panel-title").text("Editar concepto");

                var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
                offcanvas.show();
            })
            .fail(function () {
                aviso("error", {
                    contenido: "Error al cargar los datos del estatus",
                });
            });
    }

    $("#btn-guardar").on("click", function () {
        const formData = {
            id: $("#id").val(),
            id_partida: $("#id_partida").val(),
            descripcion: $("#descripcion").val(),
            anexo: $("#anexo").val(),
            sitio: $("#sitio").val(),
            tipo_partida: $("#tipo_partida").val(),
            unidad_medida: $("#unidad_medida").val(),
            precio_unitario_mn: $("#precio_unitario_mn").val(),
            precio_unitario_usd: $("#precio_unitario_usd").val(),
            comentario: $("#comentario").val()
        };

        if (!formData.id_partida.trim()) {
            aviso("advertencia", "El ID de partida es obligatorio");
            return;
        } else if (!formData.descripcion.trim()) {
            aviso("advertencia", "La descripción es obligatoria");
            return;
        } else if (!formData.unidad_medida) {
            aviso("advertencia", "La unidad de medida es obligatoria");
            return;
        }

        const url = formData.id ? urlEditarProducto : urlCrearProducto;
        const method = "POST";
        BMAjax(
            url,
            formData,
            method
        ).done(function (response) {
            if (response.exito) {
                var offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelCrearEditar'));
                offcanvas.hide();
                tablaPte.ajax.reload();
            }
        });
    });

    $(document).on("click", ".eliminar-producto", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar este producto?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function () {
                        const url = urlEliminarProducto;
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
});

