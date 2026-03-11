$(document).ready(function() {
    
    // 1. Inicialización del DataTable
    let tablaBitacoras = $('#tabla-bitacoras').DataTable({
        ajax: {
            url: urls.datatable,
            type: 'GET',
            data: function(d) {
                // Enviar parámetros del offcanvas al backend
                d.embarcacion = $('#filtro_embarcacion').val();
                d.mes = $('#filtro_mes').val();
                d.estatus = $('#filtro_estatus').val();
            }
        },
        columns: [
            { data: 'id' },
            { data: 'embarcacion', className: 'fw-bold text-primary' },
            { data: 'fecha' },
            { data: 'representante' },
            { 
                data: 'estado',
                render: function(data, type, row) {
                    let badgeClass = 'bg-secondary';
                    if(data === 'Borrador') badgeClass = 'bg-warning text-dark';
                    if(data === 'Pre-Cierre') badgeClass = 'bg-info text-dark';
                    if(data === 'Cerrado') badgeClass = 'bg-success';
                    return `<span class="badge ${badgeClass} px-2 py-1">${data}</span>`;
                }
            },
            {
                data: null,
                className: 'text-center',
                orderable: false,
                render: function(data, type, row) {
                    return `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-abrir" data-id="${row.id}" title="Abrir Bitácora">
                                <i class="fas fa-folder-open"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-pdf" data-id="${row.id}" title="Descargar PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json"
        },
        dom: '<"top">rt<"bottom"lip><"clear">', // Quitamos el search nativo para usar el personalizado
        pageLength: 10,
    });

    // 2. Conectar tu input de búsqueda personalizado al Datatable
    $('#filtro-buscar').on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            tablaBitacoras.search(this.value).draw();
        }
    });

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
            url: urls.crearReporte,
            type: 'POST',
            data: form.serialize(),
            success: function(response) {
                if(response.exito) {
                    $('#modalCrearReporte').modal('hide');
                    // Redirigir directamente a la pantalla de captura del detalle
                    window.location.href = urls.detalleReporteBase + response.id_reporte + '/';
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
        window.location.href = urls.detalleReporteBase + id + '/';
    });
});
