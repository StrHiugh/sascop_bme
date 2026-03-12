$(document).ready(function() {
    
    window.tablaBitacoras = $('#tabla-bitacoras').DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[0, "desc"]], 
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
                extra.embarcacion = $('#filtro_embarcacion').val();
                extra.mes = $('#filtro_mes').val();
                extra.estatus = $('#filtro_estatus').val();
            }
        },
        columns: [
            {
                "data": "id",
                "title": "ID",
                "visible": false
            },
            {
                "data": "embarcacion",
                "title": "Embarcación",
                "orderable": true
            },
            {
                "data": "fecha",
                "title": "Fecha",
                "orderable": true
            },
            {
                "data": "representante",
                "title": "Representante",
                "orderable": true
            },
            {
                "data": "estado",
                "title": "Estado",
                "orderable": true,
                "render": function(data, type, row) {
                    let badgeClass = 'bg-secondary';
                    if(data === 'Borrador') badgeClass = 'bg-warning text-dark';
                    if(data === 'Pre-Cierre') badgeClass = 'bg-info text-dark';
                    if(data === 'Cerrado') badgeClass = 'bg-success';
                    return `<span class="badge ${badgeClass} px-2 py-1">${data}</span>`;
                }
            },
            {
                "data": null,
                "title": "Opciones",
                "className": "text-center",
                "width": "70px",
                "orderable": false,
                "render": function(data, type, row) {
                    return `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-abrir table-icon" data-id="${row.id}" title="Abrir Bitácora">
                                <i class="fas fa-folder-open"></i>
                            </button>
                            <button class="btn btn-pdf table-icon" data-id="${row.id}" title="Descargar PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
            $("[title]").tooltip(); 
        }
    });

    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaBitacoras.draw();
        }
    });

    $("#tabla-bitacoras_length").detach().appendTo("#select-length");

    // 3. Botones de Filtros (Offcanvas)
    $('#btn-aplicar-filtros').click(function() {
        tablaBitacoras.ajax.reload();
        var offcanvasEl = document.getElementById('panelFiltros');
        var offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (offcanvasInstance) offcanvasInstance.hide();
    });

    $('#btn-limpiar-filtros').click(function() {
        $('#form-filtros')[0].reset();
        tablaBitacoras.ajax.reload();
    });

    // 4. Resetear modal al cerrarlo
    $('#modalCrearReporte').on('hidden.bs.modal', function () {
        $('#formCrearReporte')[0].reset();
        // Sugerir la fecha de hoy por defecto al volver a abrir
        document.getElementById('modal_fecha').valueAsDate = new Date();
    });

    // Fijar fecha de hoy al cargar por primera vez
    document.getElementById('modal_fecha').valueAsDate = new Date();

    // 5. Guardar Nuevo Reporte (AJAX)
    $('#btnGuardarNuevoReporte').click(function() {
        let form = $('#formCrearReporte');
        if(!form[0].checkValidity()){
            form[0].reportValidity();
            return;
        }

        let btn = $(this);
        let textoOriginal = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i> Iniciando...');

        $.ajax({
            url: urlCrearReporte,
            type: 'POST',
            data: form.serialize(),
            success: function(response) {
                if(response.exito) {
                    $('#modalCrearReporte').modal('hide');
                    // Redirigir directamente a la pantalla de captura del detalle
                    window.location.href = urlDetalleReporteBase + response.id_reporte + '/';
                } else {
                    alert('Error: ' + response.detalles); // Cambiar por tu función aviso()
                }
            },
            error: function() {
                alert('Error de conexión con el servidor.');
            },
            complete: function() {
                btn.prop('disabled', false).html(textoOriginal);
            }
        });
    });

    // 6. Acciones de la tabla
    $('#tabla-bitacoras').on('click', '.btn-abrir', function() {
        let id = $(this).data('id');
        window.location.href = urlDetalleReporteBase + id + '/';
    });
});
