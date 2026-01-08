class StatusRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.render(props);
    }
    getElement() { return this.el; }
    render(props) {
        const value = props.value;
        this.el.innerText = value || '';
        this.el.className = 'tui-grid-cell-content'; 
        
        if (value === 'OK') this.el.classList.add('cell-ok');
        else if (value === 'FFP') this.el.classList.add('cell-ffp');
        else if (value === 'S') this.el.classList.add('cell-s');
    }
}

class GpuStatusRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.render(props);
    }
    getElement() { return this.el; }
    render(props) {
        const value = props.value;
        this.el.className = 'tui-grid-cell-content d-flex justify-content-center align-items-center';
        this.el.innerHTML = '';

        const span = document.createElement('span');
        
        if (value === 'BLOQUEADO') {
            span.innerHTML = '<i class="fas fa-lock me-1"></i> EXCEDENTE';
            span.className = 'gpu-badge gpu-bloqueado';
        } else if (value === 'PENDIENTE') {
            span.innerHTML = 'PENDIENTE';
            span.className = 'gpu-badge gpu-pendiente';
        } else if (value === 'AUTORIZADO') {
            span.innerHTML = '<i class="fas fa-check me-1"></i> AUTORIZADO';
            span.className = 'gpu-badge bg-success text-white';
        } else {
            span.innerText = value || '-';
        }
        this.el.appendChild(span);
    }
}

class NativeSelectEditor {
    constructor(props) {
        this.props = props;
        const el = document.createElement('select');
        el.className = 'form-select form-select-sm'; 
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.border = 'none'; 
        el.style.outline = 'none';
        
        const { listItems } = props.columnInfo.editor.options;
        
        listItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.text = item.text;
            el.appendChild(option);
        });
        
        el.value = props.value;
        this.el = el;
    }
    getElement() { return this.el; }
    getValue() { return this.el.value; }
    mounted() {
        this.el.focus();
        this.el.addEventListener('change', () => {
            setTimeout(() => {
                this.el.blur();
                this.props.grid.finishEditing(this.props.rowKey, this.props.columnInfo.name);
            }, 20); 
        });
    }
}

$(document).ready(function() {
    const DAYS_IN_MONTH = 31;
    let gridReportesDiarios = null; 
    let gridProduccion = null; 
    let otSeleccionada = null; 

    inicializarFechas();
    cargarSitiosOtProceso();
    
    setTimeout(() => {
        inicializarGrids();
    }, 100);

    // --- FUNCIÓN DE FECHA: Solución al desfase de día ---
    function crearFechaLocal(dateStr) {
        if (!dateStr) return null;
        const partes = dateStr.split('T')[0].split('-');
        // Al usar números (año, mes-1, día), JS crea la fecha en hora local 00:00:00
        return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 0, 0, 0);
    }

    function inicializarFechas() {
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const anioActual = hoy.getFullYear();

        const $selectAnio = $('#filtro-anio');
        $selectAnio.empty();
        for (let i = anioActual - 2; i <= anioActual + 1; i++) {
            $selectAnio.append(`<option value="${i}">${i}</option>`);
        }

        $('#filtro-mes').val(mesActual);
        $('#filtro-anio').val(anioActual);
    }

    function cargarSitiosOtProceso() {
        if (typeof urlSitiosOtsProceso === 'undefined') return;

        $.ajax({
            url: urlSitiosOtsProceso,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const $select = $('#select-sitio');
                $select.empty().append('<option value="" selected disabled>Seleccione un frente</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(sitio) {
                        $select.append(`<option value="${sitio.id}">${sitio.descripcion}</option>`);
                    });
                } else {
                    $select.append('<option value="" disabled>No hay frentes con OTs activas</option>');
                }
            },
            error: function(xhr) {
                console.error('Error cargando sitios:', xhr);
            }
        });
    }

    function inicializarGrids() {
        tui.Grid.applyTheme('clean');
        
        const columnasDiasAsistencia = Array.from({length: DAYS_IN_MONTH}, (_, i) => ({
            header: `${i+1}`,
            name: `dia${i+1}`,
            width: 45,
            align: 'center',
            editor: {
                type: NativeSelectEditor,
                options: {
                    listItems: [
                        { text: 'OK', value: 'OK' },
                        { text: 'FFP', value: 'FFP' },
                        { text: 'S', value: 'S' },
                        { text: 'Limpiar', value: '' }
                    ]
                }
            },
            renderer: { type: StatusRenderer }
        }));

        const elGridReportes = document.getElementById('grid-asistencia');
        if (elGridReportes) {
            gridReportesDiarios = new tui.Grid({
                el: elGridReportes,
                scrollX: true,
                scrollY: true,
                bodyHeight: 350,
                rowHeaders: ['rowNum'],
                selectionUnit: 'row', 
                columnOptions: { resizable: true, frozenCount: 2 },
                columns: [
                    { header: 'OT', name: 'ot', width: 100, filter: 'select', align: 'left', validation: { required: true } },
                    { header: 'Descripción / Actividad', name: 'desc', width: 250, align: 'left' },
                    ...columnasDiasAsistencia
                ],
                data: [] 
            });

            gridReportesDiarios.on('click', (ev) => {
                if (ev.rowKey !== undefined) {
                    const rowData = gridReportesDiarios.getRow(ev.rowKey);
                    if (!otSeleccionada || otSeleccionada.id_ot !== rowData.id_ot) {
                        otSeleccionada = rowData;
                        cargarDetalleProduccion(otSeleccionada);
                    }
                }
            });
        }
        
        const columnasDiasProduccion = Array.from({length: DAYS_IN_MONTH}, (_, i) => ({
            header: `${i+1}`,
            name: `dia${i+1}`,
            width: 60,
            align: 'right',
            editor: 'text', 
            formatter: ({value}) => value && value !== 0 ? value : '' 
        }));

        const elGridProduccion = document.getElementById('grid-produccion');
        if (elGridProduccion) {
            gridProduccion = new tui.Grid({
                el: elGridProduccion,
                scrollX: true,
                scrollY: true,
                bodyHeight: 350,
                rowHeaders: ['rowNum'],
                columnOptions: { resizable: true, frozenCount: 4 },
                columns: [
                    { header: 'Partida', name: 'codigo', width: 90, align: 'center' },
                    { header: 'Concepto', name: 'concepto', width: 150, align: 'left' },
                    { header: 'Unidad', name: 'unidad', width: 70, align: 'center' },
                    { 
                        header: 'Vol. PTE', 
                        name: 'vol_total_proyectado', 
                        width: 110, 
                        align: 'center', 
                        formatter: formatearNumero 
                    },
                    ...columnasDiasProduccion,
                    { 
                        header: 'Acumulado Mes', 
                        name: 'acumulado_mes', 
                        width: 100, 
                        align: 'right',
                        formatter: formatearNumero
                    },
                    { header: 'Estatus GPU', name: 'estatus_gpu', width: 130, align: 'center', renderer: { type: GpuStatusRenderer } }
                ],
                data: []
            });
        }
    }

    // 4. Carga de Datos
    function cargarDatosTablero() {
        const idSitio = $('#select-sitio').val();
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        if (!idSitio) return; 

        otSeleccionada = null;
        if(gridProduccion) gridProduccion.resetData([]);
        $('#kpi-status-text').text("SELECCIONA UNA OT").removeClass('text-success text-danger').addClass('text-muted');

        $.ajax({
            url: urlOtsPorSitioGrid,
            type: 'GET',
            data: { id_sitio: idSitio, mes: mes, anio: anio },
            success: function(data) {
                const datosOTs = data.reportes_diarios || (Array.isArray(data) ? data : []);
                if (gridReportesDiarios) {
                    gridReportesDiarios.resetData(datosOTs);
                }
            },
            error: function(xhr) {
                console.error("Error cargando OTs", xhr);
            }
        });
    }

    function cargarDetalleProduccion(ot) {
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        $('#kpi-status-text').text("CARGANDO PARTIDAS...").removeClass('text-success text-danger').addClass('text-warning');
        
        $.ajax({
            url: urlObtenerPartidasProduccion,
            type: 'GET',
            data: { 
                id_ot: ot.id_ot, 
                mes: mes, 
                anio: anio 
            },
            success: function(data) {
                if (gridProduccion) {
                    gridProduccion.resetData(data);
                    bloquearDiasFueraDeVigencia(ot, parseInt(mes), parseInt(anio));
                }

                if (data.length > 0) {
                    $('#kpi-status-text').text(`OT: ${ot.ot} CARGADA`).removeClass('text-warning').addClass('text-primary');
                } else {
                    $('#kpi-status-text').text(`LA OT ${ot.ot} NO TIENE ANEXO IMPORTADO`).removeClass('text-primary').addClass('text-danger');
                }
            },
            error: function(xhr) {
                console.error("Error cargando partidas", xhr);
                $('#kpi-status-text').text("ERROR CARGANDO PARTIDAS").addClass('text-danger');
            }
        });
    }

    function bloquearDiasFueraDeVigencia(ot, mes, anio) {
        if (!ot.inicio_v || !ot.fin_v) return;

        for (let i = 1; i <= DAYS_IN_MONTH; i++) {
            gridProduccion.enableColumn(`dia${i}`);
        }

        // Se usan fechas locales para evitar el desfase de UTC
        const fechaInicio = crearFechaLocal(ot.inicio_v); 
        const fechaFin = crearFechaLocal(ot.fin_v); 
        
        const ultimoDiaMes = new Date(anio, mes, 0).getDate();

        for (let d = 1; d <= DAYS_IN_MONTH; d++) {
            // Se crea la fecha del grid en hora local 00:00:00
            const fechaActual = new Date(anio, mes - 1, d, 0, 0, 0);
            const colName = `dia${d}`;

            // Bloqueo: si el día no existe en el mes o está fuera del rango [inicio, fin]
            if (d > ultimoDiaMes || fechaActual < fechaInicio || fechaActual > fechaFin) {
                gridProduccion.disableColumn(colName); 
            }
        }
    }

    function formatearNumero({ value }) {
        return value ? Number(value).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000';
    }

    $('#select-sitio, #filtro-mes, #filtro-anio').on('change', function() {
        cargarDatosTablero();
    });

    $('#btn-actualizar-tablero').on('click', function() {
        cargarDatosTablero();
    });

    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (event) {
        if(event.target.id === 'asistencia-tab' && gridReportesDiarios) {
            gridReportesDiarios.refreshLayout();
        }
        
        if(event.target.id === 'produccion-tab' && gridProduccion) {
            gridProduccion.refreshLayout();
        }
    });

    $('#tabProcesos button').on('click', function (e) {
        e.preventDefault();
        
        $('#tabProcesos .nav-link').removeClass('active text-dark fw-semibold').addClass('text-secondary fw-medium');
        $(this).removeClass('text-secondary fw-medium').addClass('active text-dark fw-semibold');
        
        const target = $(this).data('bs-target');
        $('.tab-pane').removeClass('show active');
        $(target).addClass('show active');

        setTimeout(() => {
            if (gridReportesDiarios) gridReportesDiarios.refreshLayout();
            if (gridProduccion) gridProduccion.refreshLayout();
        }, 50);
    });

});