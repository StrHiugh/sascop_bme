document.addEventListener('DOMContentLoaded', function() {
    // Inicializar DataTable
    const tablaPtes = $('#tabla-ptes').DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        ajax: {
            url: URL_DATATABLE_PTES,
            type: 'GET'
        },
        columns: [
            { data: 'id', visible: false },
            { data: 'codigo' },
            { data: 'descripcion' },
            { 
                data: 'estado',
                render: function(data, type, row) {
                    const estados = {
                        'pendiente': '<span class="badge bg-warning">Pendiente</span>',
                        'en_progreso': '<span class="badge bg-primary">En Progreso</span>',
                        'completado': '<span class="badge bg-success">Completado</span>',
                        'cancelado': '<span class="badge bg-danger">Cancelado</span>'
                    };
                    return estados[data] || data;
                }
            },
            { 
                data: 'fecha_inicio',
                render: function(data) {
                    return data ? new Date(data).toLocaleDateString('es-ES') : '-';
                }
            },
            { 
                data: 'fecha_fin',
                render: function(data) {
                    return data ? new Date(data).toLocaleDateString('es-ES') : '-';
                }
            },
            { data: 'responsable' },
            { 
                data: 'avance',
                render: function(data) {
                    return `
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: ${data}%;" aria-valuenow="${data}" aria-valuemin="0" aria-valuemax="100">
                                ${data}%
                            </div>
                        </div>
                    `;
                }
            },
            {
                data: 'id',
                render: function(data, type, row) {
                    return `
                        <div class="btn-group btn-group-sm" role="group">
                            <a href="${URL_DETALLE_PTE}/${data}" class="btn btn-outline-primary" title="Ver">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="${URL_EDITAR_PTE}/${data}" class="btn btn-outline-secondary" title="Editar">
                                <i class="fas fa-edit"></i>
                            </a>
                            <button class="btn btn-outline-danger btn-eliminar" data-id="${data}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                },
                orderable: false,
                className: 'text-center'
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100]
    });

    // Búsqueda personalizada
    $('#search-input').on('keyup', function() {
        tablaPtes.search(this.value).draw();
    });

    // Cambiar número de registros por página
    $('#page-length').on('change', function() {
        tablaPtes.page.len(this.value).draw();
    });

    // Manejar panel de filtros
    const panelFiltros = new bootstrap.Offcanvas(document.getElementById('panel-filtros'));
    
    $('#btn-filtros').on('click', function() {
        panelFiltros.show();
    });

    // Aplicar filtros
    $('#aplicar-filtros').on('click', function() {
        const estado = $('#filtro-estado').val();
        const responsable = $('#filtro-responsable').val();
        const fechaDesde = $('#filtro-fecha-desde').val();
        const fechaHasta = $('#filtro-fecha-hasta').val();

        // Aquí implementarías la lógica de filtrado
        console.log('Aplicando filtros:', { estado, responsable, fechaDesde, fechaHasta });
        
        // Cerrar panel
        panelFiltros.hide();
    });

    // Limpiar filtros
    $('#limpiar-filtros').on('click', function() {
        $('#form-filtros')[0].reset();
    });

    // Eliminar PTE
    $(document).on('click', '.btn-eliminar', function() {
        const pteId = $(this).data('id');
        
        if (confirm('¿Estás seguro de que deseas eliminar este PTE?')) {
            // Aquí iría la llamada AJAX para eliminar
            console.log('Eliminando PTE:', pteId);
        }
    });
});