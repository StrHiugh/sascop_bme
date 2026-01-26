$(document).ready(function () {
    const modoVista = $("#tabla").data("modo") || 'ordinarios';
    let columnsDef = [
        {
            "data": "id",
            "title": "ID",
            "orderable": true,
            visible: false
        },
        {
            "data": "id_partida",
            "title": modoVista === 'extraordinarios' ? "Partida" : "Partida",
            "orderable": true,
        },
        {
            "data": "descripcion",
            "title": "Descripción",
            "orderable": true,
        },
        {
            "data": "unidad_medida",
            "title": "Unidad",
            "orderable": true,
        },
        {
            "data": "anexo",
            "title": "Anexo",
            "orderable": true,
        },
        {
            "data": "cantidad_referencia",
            "title": "Cant. Ref.",
            "orderable": true,
            "render": $.fn.dataTable.render.number(',', '.', 2) 
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
        }
    ];

    if (modoVista === 'extraordinarios') {
        columnsDef.push(
            { "data": "pte", "title": "PTE origen" },
            { "data": "ot", "title": "OT origen" },
            { "data": "estatus_pue", "title": "Estatus PUE" }
        );
    }

    columnsDef.push(
        {
            "data": null,
            "title": "Acciones",
            "class": "text-center",
            "render": function (data, type, row) {
                if (modoVista === 'extraordinarios') {
                    return `
                        <a class="table-icon editar-producto" title="Editar concepto" data-id="${row.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon eliminar-producto" title="Eliminar" data-id="${row.id}">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
                } else {
                    return `
                        <a class="table-icon text-secondary" style="pointer-events: none; cursor: default; opacity: 0.6;" title="No editable">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a class="table-icon text-secondary" style="pointer-events: none; cursor: default; opacity: 0.6;" title="No eliminable">
                            <i class="fas fa-trash"></i>
                        </a>
                    `;
                }
            }
        }
    );

    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[0, "desc"]],
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
                extra.modo_vista = modoVista;
            }
        },
        columns: columnsDef,
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

    $("#btn-crear-nuevo-logica").on("click", function () {
        if (modoVista === 'ordinarios') {
            abrirModalBusquedaPUE();
        } else {
            abrirPanelCrear();
        }
    });

    let tablaBusquedaInicializada = false;
    let selectedPUEs = [];

    function abrirModalBusquedaPUE() {
        selectedPUEs = [];
        $("#contenedor-paso-1").show();
        $("#contenedor-paso-2").remove();
        
        const modalBody = $("#modalBusquedaPUE .modal-body");
        if (modalBody.find("#contenedor-paso-1").length === 0) {
            modalBody.children().wrapAll("<div id='contenedor-paso-1'></div>");
            
            if ($("#modalBusquedaPUE .modal-footer").length === 0) {
                $("#modalBusquedaPUE .modal-content").append(`
                    <div class="modal-footer bg-light">
                        <span id="contador-seleccion" class="me-auto text-muted fw-bold">0 seleccionados</span>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary" id="btn-paso-siguiente">
                            Siguiente <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>
                `);
            }
        }
        
        $("#contador-seleccion").text("0 seleccionados");
        $("#btn-paso-siguiente").show();
        $("#btn-guardar-masivo").remove();

        const modal = new bootstrap.Modal(document.getElementById('modalBusquedaPUE'));
        modal.show();

        if (!tablaBusquedaInicializada) {
            var table = $("#tablaBusquedaPUE").DataTable({
                processing: true,
                serverSide: true,
                responsive: true,
                order: [[1, 'asc']],
                dom: 'l<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
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
                    url: urlPuesDisponibles,
                    type: "GET"
                },
                columns: [
                    {
                        "data": null,
                        "orderable": false,
                        "className": "text-center",
                        "render": function (data, type, row) {
                            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
                            return `<input type="checkbox" class="form-check-input check-pue-item" value="${row.id}" data-row="${jsonData}">`;
                        }
                    },
                    { "data": "partida_extraordinaria" },
                    { "data": "descripcion" },
                    { "data": "unidad_medida" },
                ],
            });

            $("#tablaBusquedaPUE_length").detach().appendTo("#modalBusquedaPUE #select-length-pue");

            $("#filtro-buscar-pue").on("keyup", function () {
                table.search(this.value).draw();
            });

            tablaBusquedaInicializada = true;
        } else {
            $("#tablaBusquedaPUE").DataTable().ajax.reload();
        }
    }

    $(document).on("change", ".check-pue-item", function () {
        const rowData = $(this).data("row");
        const isChecked = $(this).is(":checked");

        if (isChecked) {
            if (!selectedPUEs.some(item => item.id === rowData.id)) {
                selectedPUEs.push(rowData);
            }
        } else {
            selectedPUEs = selectedPUEs.filter(item => item.id !== rowData.id);
        }
        $("#contador-seleccion").text(`${selectedPUEs.length} seleccionados`);
    });

    $(document).on("click", "#btn-paso-siguiente", function () {
        if (selectedPUEs.length === 0) {
            aviso("advertencia", "Debe seleccionar al menos un concepto para continuar.");
            return;
        }
        mostrarTablaEdicionMasiva();
    });

    function mostrarTablaEdicionMasiva() {
        $("#contenedor-paso-1").hide();
        $("#btn-paso-siguiente").hide();

        let htmlTabla = `
        <div id="contenedor-paso-2">
            <div class="alert alert-primary py-2 mb-3">
                <small><i class="fas fa-edit"></i> Asigne la Partida Ordinaria, Anexo y Precio a los conceptos seleccionados antes de guardar.</small>
            </div>
            <div class="table-responsive" style="max-height: 50vh; overflow-y: auto;">
                <table class="table table-bordered table-sm align-middle" id="tabla-edicion-masiva">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th style="width: 10%">Partida ext.</th>
                            <th style="width: 25%">Descripción (PUE)</th>
                            <th style="width: 10%">Unidad</th>
                            <th style="width: 13%">Nueva Partida <span class="text-danger">*</span></th>
                            <th style="width: 13%">Nuevo Anexo <span class="text-danger">*</span></th>
                            <th style="width: 13%">Precio MN</th>
                            <th style="width: 13%">Precio USD</th>
                            <th style="width: 5%"></th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        selectedPUEs.forEach((item, index) => {
            htmlTabla += `
                <tr data-id="${item.id}">
                    <td>${item.partida_extraordinaria}</td>
                    <td><small>${item.descripcion}</small></td>
                    <td class="text-center">${item.unidad_medida}</td>
                    <td>
                        <input type="text" class="form-control form-control-sm input-partida" placeholder="Ej. 2.1" required>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm input-anexo" placeholder="Ej. C-2" required>
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm input-precio-mn" value="${item.precio_mn || 0.00}" step="0.01">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm input-precio-usd" value="${item.precio_usd || 0.00}" step="0.01">
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger btn-remover-fila" data-idx="${index}"><i class="fas fa-times"></i></button>
                    </td>
                </tr>
            `;
        });

        htmlTabla += `</tbody></table></div></div>`;

        $("#modalBusquedaPUE .modal-body").append(htmlTabla);
        
        if ($("#btn-guardar-masivo").length === 0) {
            $("#modalBusquedaPUE .modal-footer").append(`
                <button type="button" class="btn btn-primary" id="btn-guardar-masivo">
                    <i class="fas fa-save me-2"></i> Guardar Conversión (${selectedPUEs.length})
                </button>
            `);
        }
    }

    $(document).on("click", ".btn-remover-fila", function() {
        $(this).closest("tr").remove();
        const count = $("#tabla-edicion-masiva tbody tr").length;
        $("#btn-guardar-masivo").html(`<i class="fas fa-save me-2"></i> Guardar Conversión (${count})`);
        if(count === 0) {
            $("#contenedor-paso-2").remove();
            $("#contenedor-paso-1").show();
            $("#btn-paso-siguiente").show();
            $("#btn-guardar-masivo").remove();
        }
    });

    $(document).on("click", "#btn-guardar-masivo", async function () {
        const filas = $("#tabla-edicion-masiva tbody tr");
        let listaParaGuardar = [];
        let errorValidacion = false;

        filas.each(function () {
            const tr = $(this);
            const id_pue = tr.data("id");
            const nueva_partida = tr.find(".input-partida").val().trim();
            const nuevo_anexo = tr.find(".input-anexo").val().trim();
            const precio_mn = tr.find(".input-precio-mn").val();
            const precio_usd = tr.find(".input-precio-usd").val();

            if (!nueva_partida || !nuevo_anexo) {
                tr.find(".input-partida, .input-anexo").addClass("is-invalid");
                errorValidacion = true;
            } else {
                tr.find(".input-partida, .input-anexo").removeClass("is-invalid");
                listaParaGuardar.push({
                    id_pue: id_pue,
                    nueva_partida: nueva_partida,
                    nuevo_anexo: nuevo_anexo,
                    precio_mn: precio_mn,
                    precio_usd: precio_usd
                });
            }
        });

        if (errorValidacion) {
            aviso("advertencia", "Por favor complete Partida y Anexo para todos los registros.");
            return;
        }

        if (listaParaGuardar.length === 0) return;
        let procesados = 0;
        let errores = 0;
        
        $("#btn-guardar-masivo").prop("disabled", true).text("Procesando...");

        for (const item of listaParaGuardar) {
            try {
                const formData = {
                    id_pue: item.id_pue,
                    nueva_partida: item.nueva_partida,
                    nuevo_anexo: item.nuevo_anexo,
                    precio_mn: item.precio_mn,
                    precio_usd: item.precio_usd
                };
                
                await new Promise((resolve, reject) => {
                    BMAjax(urlConvertirPue, formData, "POST")
                        .done(function(res) {
                            if(res.exito) resolve();
                            else reject();
                        })
                        .fail(function() { reject(); });
                });
                procesados++;
            } catch (e) {
                errores++;
            }
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalBusquedaPUE'));
        modal.hide();
        tablaPte.ajax.reload();
        
        if (errores > 0) {
            aviso("advertencia", `Proceso finalizado. ${procesados} guardados, ${errores} fallidos.`);
        } else {
            aviso("exito", `Se han convertido ${procesados} conceptos correctamente.`);
        }
        
        $("#btn-guardar-masivo").remove();
        $("#contenedor-paso-2").remove();
        selectedPUEs = [];
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
        $("#panel-title").text("Crear concepto extraordinario");
        cargarUnidadesMedida();
        var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
        offcanvas.show();
    }

    $(document).on("click", ".editar-producto", function () {
        const id = $(this).data('id');
        BMAjax(urlObtenerProducto, { id: id }, "GET").done(function (data) {
            $("#formulario-producto")[0].reset();
            $("#id").val(data.id);
            $("#id_pue_conversion").val("");
            
            $("#id_partida").val(data.id_partida);
            $("#descripcion").val(data.descripcion_concepto);
            $("#anexo").val(data.anexo);
            $("#comentario").val(data.comentario);
            $("#unidad_medida").val(data.unidad_medida_id);
            $("#precio_unitario_mn").val(data.precio_unitario_mn);
            $("#precio_unitario_usd").val(data.precio_unitario_usd);
            $("#cantidad").val(data.cantidad_referencia);
            $("#pte_origen").val(data.pte_origen);
            $("#ot_origen").val(data.ot_origen);
            
            $("#panel-title").text("Editar concepto");
            var offcanvas = new bootstrap.Offcanvas(document.getElementById('panelCrearEditar'));
            offcanvas.show();
        }).fail(function () {
            aviso("error", { contenido: "Error al cargar los datos del concepto" });
        });
    });

    $("#btn-guardar").on("click", function () {
        const idEdicion = $("#id").val();
        const idPueConversion = $("#id_pue_conversion").val();
        
        const formData = {
            descripcion: $("#descripcion").val(),
            unidad_medida: $("#unidad_medida").val(),
            precio_unitario_mn: $("#precio_unitario_mn").val(),
            precio_unitario_usd: $("#precio_unitario_usd").val(),
            comentario: $("#comentario").val(),
            cantidad: $("#cantidad").val(),
            pte_origen: $("#pte_origen").val(),
            ot_origen: $("#ot_origen").val(),
        };

        if (!$("#id_partida").val().trim()) { aviso("advertencia", "La Partida es obligatoria"); return; }
        if (!formData.unidad_medida) { aviso("advertencia", "La Unidad es obligatoria"); return; }
        if (!formData.descripcion.trim()) { aviso("advertencia", "La descripción es obligatoria"); return; }
        if (!formData.cantidad) { aviso("advertencia", "La cantidad es obligatoria y debe ser mayor a 0"); return; }

        let urlDestino = "";
        
        if (idPueConversion) {
            urlDestino = urlConvertirPue;
            formData.id_pue = idPueConversion;
            formData.nueva_partida = $("#id_partida").val();
            formData.nuevo_anexo = $("#anexo").val();
            formData.precio_mn = formData.precio_unitario_mn;
            formData.precio_usd = formData.precio_unitario_usd;

        } else if (idEdicion) {
            urlDestino = urlEditarProducto;
            formData.id = idEdicion;
            formData.id_partida = $("#id_partida").val();

        } else {
            urlDestino = urlCrearProducto;
            formData.id_partida = $("#id_partida").val();
        }

        BMAjax(urlDestino, formData, "POST").done(function (response) {
            if (response.exito) {
                var offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelCrearEditar'));
                offcanvas.hide();
                
                tablaPte.ajax.reload();
                
                if (tablaBusquedaInicializada) {
                    $("#tablaBusquedaPUE").DataTable().ajax.reload();
                }
            }
        });
    });

    $(document).on("click", ".eliminar-producto", function () {
        const id = $(this).data('id');
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar este concepto?",
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