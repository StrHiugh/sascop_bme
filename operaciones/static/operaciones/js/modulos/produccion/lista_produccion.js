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
        const span = document.createElement('span');
        
        if (value === 'BLOQUEADO') {
            span.innerHTML = '<i class="fas fa-lock"></i> EXCEDENTE';
            span.className = 'gpu-badge gpu-bloqueado';
        } else {
            span.innerHTML = 'PENDIENTE';
            span.className = 'gpu-badge gpu-pendiente';
        }
        this.el.innerHTML = '';
        this.el.appendChild(span);
    }
}

class NativeSelectEditor {
    constructor(props) {
        this.props = props;
        const el = document.createElement('select');
        el.className = 'form-select-sm'; 
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
    let gridAsistencia = null;
    let gridProduccion = null;


    inicializarFechas();
    cargarSitiosOtProceso();
    setTimeout(() => {
        inicializarGrids();
    }, 100);

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
            }
        });
    }

    $('#select-sitio, #filtro-mes, #filtro-anio').on('change', function() {
        cargarDatosTablero();
    });

    $('#btn-actualizar-tablero').on('click', function() {
        cargarDatosTablero();
    });

    function cargarDatosTablero() {
        const idSitio = $('#select-sitio').val();
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        if (!idSitio) return; 

        $.ajax({
            url: urlOtsPorSitioGrid,
            type: 'GET',
            data: { 
                id_sitio: idSitio,
                mes: mes,
                anio: anio
            },
            success: function(data) {
                if (gridAsistencia) {
                    gridAsistencia.resetData(data);
                }
            },
            error: function(xhr) {
                console.error("Error cargando grid", xhr);
            }
        });
    }

    
    
    function inicializarGrids() {
        tui.Grid.applyTheme('clean');
        const columnasDiasAsistencia = Array.from({length: DAYS_IN_MONTH}, (_, i) => ({
            header: `${i+1}`,
            name: `dia${i+1}`,
            width: 60,
            align: 'center',
            editor: {
                type: NativeSelectEditor,
                options: {
                    listItems: [
                        { text: 'OK', value: 'OK' },
                        { text: 'Falta Firma PEP', value: 'FFP' },
                        { text: 'Suspendida', value: 'S' },
                        { text: 'Limpiar', value: '' }
                    ]
                }
            },
            renderer: { type: StatusRenderer }
        }));

        const elGridAsistencia = document.getElementById('grid-asistencia');
        if (elGridAsistencia) {
            gridAsistencia = new tui.Grid({
                el: elGridAsistencia,
                scrollX: true,
                scrollY: true,
                bodyHeight: 400,
                contextMenu: null,
                rowHeaders: ['rowNum'],
                columnOptions: {
                    resizable: true,
                    frozenCount: 2 
                },
                columns: [
                    { header: 'OT', name: 'ot', width: 120, filter: 'select', align: 'left' },
                    { header: 'Descripción', name: 'desc', width: 250, align: 'left' },
                    ...columnasDiasAsistencia
                ],
                data: [] 
            });
        }
    }

    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (event) {
        if(event.target.id === 'asistencia-tab' && gridAsistencia) {
            gridAsistencia.refreshLayout();
        }
        if(event.target.id === 'produccion-tab' && gridProduccion) {
            gridProduccion.refreshLayout();
        }
    });

});