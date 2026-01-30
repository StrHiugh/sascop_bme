const numberFormatter = new Intl.NumberFormat('es-MX', { 
    minimumFractionDigits: 6, 
    maximumFractionDigits: 6 
});

const currencyFormatter = new Intl.NumberFormat('es-MX', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
});

class StatusRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.render(props);
    }
    getElement() { return this.el; }
    render(props) {
        const value = props.value;
        this.el.innerText = value || '';
        this.el.className = 'tui-grid-cell-content d-flex justify-content-center align-items-center'; 
        
        if (value === 'OK') {
            this.el.style.backgroundColor = '#d4edda';
            this.el.style.color = '#155724';
            this.el.style.fontWeight = 'bold';
        } 
        else if (value === 'FFP') {
            this.el.style.backgroundColor = '#fff3cd';
            this.el.style.color = '#856404';
            this.el.style.fontWeight = 'bold';
        } 
        else if (value === 'S') {
            this.el.style.backgroundColor = '#f8d7da';
            this.el.style.color = '#721c24';
            this.el.style.fontWeight = 'bold';
        }
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

class ProduccionRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.el.style.width = '100%';
        this.el.style.height = '100%';
        this.el.className = 'd-flex justify-content-center align-items-center tui-grid-cell-content';
        this.render(props);
    }
    
    getElement() { return this.el; }
    
    render(props) {
        const valorOriginal = props.value;
        
        let valorVisual = valorOriginal; 
        let esExcedente = false;
        let teDia = 0.0;
        let cmaDia = 0.0;
        if (valorOriginal && typeof valorOriginal === 'object') {
            esExcedente = valorOriginal.es_excedente || false;
            teDia = parseFloat(valorOriginal.te_dia || 0);
            cmaDia = parseFloat(valorOriginal.cma_dia || 0);
            valorVisual = valorOriginal.valor;
        } 

        const displayValue = (valorVisual !== null && valorVisual !== undefined && valorVisual !== '') 
            ? numberFormatter.format(Number(valorVisual))
            : '';

        this.el.innerText = displayValue;
        this.el.className = 'd-flex justify-content-center align-items-center tui-grid-cell-content';
        
        const diaNum = props.columnInfo.name.replace('dia', '');
        const totalDia = teDia + cmaDia;
        const fmt = (n) => numberFormatter.format(n);
        
        let tooltipText = `Día: ${diaNum}\n` +
                            `-------------------\n` +
                            `Ejecutado TE:  ${fmt(teDia)}\n` +
                            `Ejecutado CMA: ${fmt(cmaDia)}\n` +
                            `-------------------\n` +
                            `Total Día:     ${fmt(totalDia)}`;

        if (esExcedente) {
            this.el.classList.add('text-danger', 'fw-bold');
            this.el.style.backgroundColor = '#fff5f5';
            tooltipText = "⚠️ VOLUMEN EXCEDENTE ⚠️\n\n" + tooltipText;
        }

        this.el.title = tooltipText;
    }   
}

class ProduccionEditor {
    constructor(props) {
        const el = document.createElement('input');
        el.type = 'text';
        el.className = 'form-control form-control-sm text-end'; 
        let valor = props.value;
        if (valor && typeof valor === 'object') {
            valor = valor.valor !== undefined ? valor.valor : ''; 
        }
        if ((typeof valor === 'object' && valor !== null) || String(valor) === '[object Object]') {
            valor = '';
        }
        el.value = (valor !== null && valor !== undefined) ? String(valor) : '';
        this.el = el;
    }
    getElement() { return this.el; }
    getValue() { return this.el.value; }
    mounted() { this.el.select(); }
}

class OpcionesRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.el.className = 'd-flex justify-content-center align-items-center w-100 h-100 gap-2';
        this.render(props);
    }

    getElement() { return this.el; }

    render(props) {
        const archivo = props.value; 
        const rowKey = props.rowKey;
        
        if (archivo && typeof archivo === 'string' && archivo.trim() !== '') {
            const urlCodificada = encodeURI(archivo);
            const archivoAcortado = archivo.length > 20 ? archivo.substring(0, 20) + '...' : archivo;
            
            this.el.innerHTML = `
                <a class="btn btn-sm btn-light text-secondary border ver-archivo" 
                    title="Cambiar archivo" 
                    data-rowkey="${rowKey}">
                    <i class="fas fa-upload text-secondary"></i>
                </a>
                <a class="btn btn-sm btn-light text-success border ver-archivo-externo" 
                    href="${urlCodificada}" 
                    target="_blank" 
                    title="Abrir: ${archivoAcortado}">
                    <i class="fas fa-eye"></i>
                </a>
            `;
        } else {
            this.el.innerHTML = `
                <a class="btn btn-sm btn-light text-primary border ver-archivo" 
                    title="Subir archivo" 
                    data-rowkey="${rowKey}">
                    <i class="fas fa-upload text-secondary"></i>
                </a>
            `;
        }
    }
}

$(document).ready(function() {
    const DAYS_IN_MONTH = 31;
    let gridReportesDiarios = null; 
    let gridProduccion = null; 
    let otSeleccionada = null; 
    let tipoTiempoActivo = 'TE';
    let productoSeleccionadoCatalogo = null;
    
    inicializarFechas();
    cargarSitiosOtProceso();
    inicializarSelect2Catalogo();

    setTimeout(() => {
        inicializarGrids();
    }, 100);

    $('#btn-agregar-partida').on('click', function() {
        if (!otSeleccionada) {
            aviso("advertencia", "Primero selecciona una OT en el grid");
            return;
        }

        $('#detalle-producto-seleccionado').addClass('d-none');
        $('#select-producto-catalogo').val(null).trigger('change');
        $('#input-volumen-autorizar').val(0);
        new bootstrap.Modal(document.getElementById('modalNuevaPartida')).show();
    });

    $('#btn-confirmar-add-partida').on('click', function() {
        const volumen = parseFloat($('#input-volumen-autorizar').val());

        if (!productoSeleccionadoCatalogo) {
            aviso("error", "Debe seleccionar un producto del catálogo");
            return;
        }

        iniciarLoader();
        $.ajax({
            url: urlVincularPartidaOT,
            type: 'POST',
            data: {
                id_ot: otSeleccionada.id_ot,
                id_producto: productoSeleccionadoCatalogo.id,
                volumen: volumen
            },
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function(res) {
                if (res.exito) {
                    aviso("exito", "Partida agregada correctamente");
                    bootstrap.Modal.getInstance(document.getElementById('modalNuevaPartida')).hide();
                    cargarDetalleProduccion(otSeleccionada);
                } else {
                    aviso("error", res.mensaje);
                }
            },
            error: function() { aviso("error", "Error de comunicación con el servidor"); },
            complete: finalizarLoader
        });
    });

    $('#btn-guardar-asistencia').on('click', function() {
        const idSitio = $('#select-sitio').val();
        if (!idSitio) {
            aviso("advertencia", "Seleccione un frente y cargue datos primero.");
            return;
        }

        const rawData = gridReportesDiarios.getData();
        if (rawData.length === 0) {
            aviso("info", "No hay datos para guardar.");
            return;
        }

        const reportes = rawData.map(row => {
            const valores = [];
            for (let i = 1; i <= DAYS_IN_MONTH; i++) {
                let val = row[`dia${i}`];
                valores.push(val || null);
            }
            return {
                id_ot: row.id_ot,
                valores: valores
            };
        });

        const payload = {
            reportes: reportes,
            mes: $('#filtro-mes').val(),
            anio: $('#filtro-anio').val()
        };

        iniciarLoader();
        $.ajax({
            url: urlGuardarAsistenciaMasiva,
            type: 'POST',
            data: JSON.stringify(payload),
            contentType: 'application/json',
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", "Asistencia guardada correctamente");
                    cargarDatosTablero(); 
                } else {
                    aviso("error", response.mensaje);
                }
            },
            error: function(xhr) { 
                console.error(xhr);
                aviso("error", "Error al guardar asistencia."); 
            },
            complete: finalizarLoader
        });
    });

    $('#btn-guardar-produccion').on('click', function() {
        if (!otSeleccionada) {
            aviso("advertencia", "Selecciona una OT primero");
            return;
        }

        const rawData = gridProduccion.getData();
        const partidasProcesadas = rawData.map(row => {
            const valoresDias = [];
            for (let i = 1; i <= DAYS_IN_MONTH; i++) {
                let celda = row[`dia${i}`];
                let valor = celda;

                if (celda && typeof celda === 'object' && celda.valor !== undefined) {
                    valor = celda.valor;
                }
                
                let valNum = parseFloat(valor);
                valoresDias.push(isNaN(valNum) ? 0 : valNum);
            }
            return {
                id_partida_imp: row.id_partida_imp,
                codigo: row.codigo,
                valores: valoresDias
            };
        });

        const datos = {
            id_ot: otSeleccionada.id_ot,
            mes: $('#filtro-mes').val(),
            anio: $('#filtro-anio').val(),
            tipo_tiempo: tipoTiempoActivo,
            partidas: partidasProcesadas,
        };

        iniciarLoader();
        $.ajax({
            url: urlGuardarProduccionMasivo, 
            type: 'POST',
            data: JSON.stringify(datos), 
            contentType: 'application/json', 
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", `Sábana de ${tipoTiempoActivo} guardada correctamente`);
                    cargarDetalleProduccion(otSeleccionada);
                } else {
                    aviso("error", response.mensaje);
                }
            },
            error: function(xhr) { aviso("error", "Error al guardar. Verifica tu conexión."); },
            complete: finalizarLoader
        });
    });

    $(document).on('click', '.ver-archivo', function (e) {
        e.preventDefault();
        const rowKey = $(this).data('rowkey');
        
        if (gridReportesDiarios) {
            const rowData = gridReportesDiarios.getRow(rowKey);
            abrirModalSubirArchivo(rowData, rowKey);
        }
    });

    function abrirModalSubirArchivo(rowData, rowKey) {
        const modal = new bootstrap.Modal(document.getElementById('modalSubirArchivo'));
        const enlaceInput = document.getElementById('enlaceArchivoOt');
        
        filaEnEdicion = { rowKey: rowKey, ...rowData };

        if (rowData && rowData.archivo) {
            enlaceInput.value = rowData.archivo;
        } else {
            enlaceInput.value = '';
        }
        
        modal.show();
        
        setTimeout(() => {
            enlaceInput.focus();
        }, 500);
    }

    window.guardarEnlaceArchivo = function() {
        const enlace = $('#enlaceArchivoOt').val().trim();
        const $btn = $('#btnGuardarEnlacePaso');
        
        if (!enlace) {
            aviso("advertencia", "Por favor ingresa un enlace válido");
            $('#enlaceArchivoOt').focus();
            return;
        }
        
        if (!enlace.startsWith('http://') && !enlace.startsWith('https://')) {
            aviso("advertencia", "La URL debe comenzar con http:// o https://");
            $('#enlaceArchivoOt').focus();
            $('#enlaceArchivoOt').select();
            return;
        }

        if (!otSeleccionada || !otSeleccionada.id_ot) {
            aviso("error", "No hay una OT seleccionada.");
            return;
        }
        
        if (!filaEnEdicion) return;

        $btn.prop('disabled', true);
        $btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');

        const payload = {
            id_ot: otSeleccionada.id_ot,
            mes: $('#filtro-mes').val(),
            anio: $('#filtro-anio').val(),
            archivo: enlace
        };
    
        const urlDestino = urlGuardarArchivoMensual;

        $.ajax({
            url: urlDestino,
            method: "POST",
            data: JSON.stringify(payload),
            contentType: 'application/json',
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", "Enlace de evidencia guardado correctamente");
                    
                    if (gridReportesDiarios) {
                        gridReportesDiarios.setValue(filaEnEdicion.rowKey, 'archivo', enlace);
                    }

                    const modalEl = document.getElementById('modalSubirArchivo');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    modalInstance.hide();
                    
                    filaEnEdicion = null;
                } else {
                    aviso("error", response.mensaje || "Error al guardar");
                }
            },
            error: function(xhr) {
                console.error(xhr);
                aviso("error", "Error de comunicación con el servidor");
            },
            complete: function() {
                $btn.prop('disabled', false);
                $btn.html('<i class="fas fa-save me-2"></i>Guardar en Tabla');
            }
        });
    };

    function inicializarSelect2Catalogo() {
        $('#select-producto-catalogo').select2({
            dropdownParent: $('#modalNuevaPartida'),
            placeholder: "Buscar por código o descripción...",
            minimumInputLength: 2,
            ajax: {
                url: urlBuscarProductosCatalogo,
                dataType: 'json',
                data: function (params) { return { q: params.term }; },
                processResults: function (data) { return { results: data.results }; },
                cache: true
            }
        }).on('select2:select', function(e) {
            const data = e.params.data;
            productoSeleccionadoCatalogo = data;
            $('#info-cod').text(data.partida);
            $('#info-uni').text(data.unidad);
            $('#info-pre').text(currencyFormatter.format(data.precio || 0));
            $('#info-pre-usd').text(currencyFormatter.format(data.precio_usd || 0));
            $('#info-desc').text(data.text);
            $('#detalle-producto-seleccionado').removeClass('d-none');
        });
    }

    $('#select-tipo-tiempo').on('change', function() {
        const nuevoValor = $(this).val();
        tipoTiempoActivo = nuevoValor;
        $('#lbl-tipo-guardado').text(tipoTiempoActivo);

        const gridEl = $('#grid-produccion');
        if (tipoTiempoActivo === 'CMA') {
            gridEl.addClass('mode-cma');
            $(this).addClass('modo-cma'); 
        } else {
            gridEl.removeClass('mode-cma');
            $(this).removeClass('modo-cma');
        }

        if (otSeleccionada) {
            iniciarLoader();
            cargarDetalleProduccion(otSeleccionada);
            setTimeout(() => {
                finalizarLoader();
            }, 2000);
        }
    });

    function crearFechaLocal(dateStr) {
        if (!dateStr) return null;
        const partes = dateStr.split('T')[0].split('-');
        return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 0, 0, 0);
    }

    function inicializarFechas() {
        const hoy = new Date();
        const anioActual = hoy.getFullYear();
        const $selectAnio = $('#filtro-anio');
        $selectAnio.empty();
        for (let i = anioActual - 2; i <= anioActual + 1; i++) {
            $selectAnio.append(`<option value="${i}">${i}</option>`);
        }
        $('#filtro-mes').val(hoy.getMonth() + 1);
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
                    data.forEach(s => $select.append(`<option value="${s.id}">${s.descripcion}</option>`));
                } else {
                    $select.append('<option value="" disabled>No hay frentes con OTs activas</option>');
                }
            },
            error: function(xhr) { console.error('Error cargando sitios:', xhr); }
        });
    }

    function inicializarGrids() {
        tui.Grid.applyTheme('striped');
        
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
            const alturaCalculada = 640;
            gridReportesDiarios = new tui.Grid({
                el: elGridReportes,
                scrollX: true,
                scrollY: true,
                bodyHeight: alturaCalculada,
                rowHeight: 50,
                selectionUnit: 'cell', 
                columnOptions: { resizable: true, frozenCount: 2 },
                columns: [
                    { header: 'OT', name: 'ot', width: 100, filter: 'select', align: 'left', validation: { required: true } },
                    { header: 'Descripción', name: 'desc',filter: 'select', width: 250, align: 'left' },
                    ...columnasDiasAsistencia,
                    {
                        header: 'Opciones',
                        name: 'archivo',
                        width: 100,
                        align: 'center',
                        renderer: { type: OpcionesRenderer }
                    }
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
            editor: { type: ProduccionEditor }, 
            renderer: { type: ProduccionRenderer } 
        }));

        const elGridProduccion = document.getElementById('grid-produccion');
        if (elGridProduccion) {
            const alturaCalculada = 640;
            gridProduccion = new tui.Grid({
                el: elGridProduccion,
                scrollX: true,
                scrollY: true,
                bodyHeight: alturaCalculada,
                rowHeight: 50,
                columnOptions: { resizable: true, frozenCount: 5 }, 
                columns: [
                    { header: 'Partida', name: 'codigo',filter: 'select', width: 90, align: 'center' },
                    { header: 'Concepto', name: 'concepto',filter: 'select', width: 150, align: 'left' },
                    { header: 'Anexo', name: 'anexo', filter: 'select', width: 80, align: 'center' },
                    { header: 'Unidad', name: 'unidad', width: 70, align: 'center' },
                    { 
                        header: 'Vol. Proy', 
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
                    { 
                        header: 'Estatus Partida', 
                        name: 'estatus_gpu', 
                        width: 130, 
                        align: 'center', 
                        renderer: { type: GpuStatusRenderer } 
                    }
                ],
                data: []
            });
        }
    }

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
            data: { 
                id_sitio: idSitio, 
                mes: mes, 
                anio: anio 
            },
            success: function(data) {
                const datosOTs = data.reportes_diarios || (Array.isArray(data) ? data : []);
                
                if (gridReportesDiarios) {
                    gridReportesDiarios.resetData(datosOTs);
                    datosOTs.forEach((ot, index) => {
                        bloquearCeldasReporteDiario(ot, parseInt(mes), parseInt(anio), index);
                    });
                }
            },
            error: function(xhr) { console.error("Error cargando OTs", xhr); }
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
                anio: anio,
                tipo_tiempo: tipoTiempoActivo ? tipoTiempoActivo : 'TE'
            },
            success: function(response) {
                let data = [];
                let diasBloqueados = [];

                if (Array.isArray(response)) {
                    data = response;
                } else if (response.partidas) {
                    data = response.partidas;
                    diasBloqueados = response.dias_bloqueados || [];
                }

                if (gridProduccion) {
                    gridProduccion.resetData(data);
                    bloquearDiasFueraDeVigencia(ot, parseInt(mes), parseInt(anio));
                    bloquearDiasFirmados(diasBloqueados);
                }

                if (data.length > 0) {
                    $('#kpi-status-text').text(`OT: ${ot.ot} CARGADA`).removeClass('text-warning').addClass('text-primary');
                } else {
                    $('#kpi-status-text').text(`LA OT ${ot.ot} NO TIENE ANEXO IMPORTADO`).removeClass('text-primary').addClass('text-danger');
                }
            },
            error: function(xhr) {
                $('#kpi-status-text').text("ERROR CARGANDO PARTIDAS").addClass('text-danger');
            }
        });
    }

    function bloquearDiasFirmados(dias) {
        if (!dias || dias.length === 0) return;

        dias.forEach(dia => {
            const colName = `dia${dia}`;
            gridProduccion.disableColumn(colName);
            gridProduccion.addColumnClassName(colName, 'celda-firmada');
        });
    }

    function bloquearDiasFueraDeVigencia(ot, mes, anio) {
        if (!ot.inicio_v || !ot.fin_v) return;
        for (let i = 1; i <= DAYS_IN_MONTH; i++) gridProduccion.enableColumn(`dia${i}`);

        const fechaInicio = crearFechaLocal(ot.inicio_v); 
        const fechaFin = crearFechaLocal(ot.fin_v); 
        const ultimoDiaMes = new Date(anio, mes, 0).getDate();

        for (let d = 1; d <= DAYS_IN_MONTH; d++) {
            const fechaActual = new Date(anio, mes - 1, d, 0, 0, 0);
            const colName = `dia${d}`;
            if (d > ultimoDiaMes || fechaActual < fechaInicio || fechaActual > fechaFin) {
                gridProduccion.disableColumn(colName); 
                gridProduccion.addColumnClassName(colName, 'celda-bloqueada');
            }
        }
    }

    function bloquearCeldasReporteDiario(ot, mes, anio, rowKey) {
        if (!ot.inicio_v || !ot.fin_v) return;

        const fechaInicio = crearFechaLocal(ot.inicio_v); 
        const fechaFin = crearFechaLocal(ot.fin_v); 
        const ultimoDiaMes = new Date(anio, mes, 0).getDate();

        for (let d = 1; d <= DAYS_IN_MONTH; d++) {
            const colName = `dia${d}`;
            if (d > ultimoDiaMes) {
                gridReportesDiarios.disableCell(rowKey, colName);
                gridReportesDiarios.addCellClassName(rowKey, colName, 'celda-bloqueada');
                continue;
            }

            const fechaActual = new Date(anio, mes - 1, d, 0, 0, 0);

            if (fechaActual < fechaInicio || fechaActual > fechaFin) {
                gridReportesDiarios.disableCell(rowKey, colName);
                gridReportesDiarios.addCellClassName(rowKey, colName, 'celda-bloqueada');
            } else {
                gridReportesDiarios.enableCell(rowKey, colName);
                gridReportesDiarios.removeCellClassName(rowKey, colName, 'celda-bloqueada');
            }
        }
    }

    function formatearNumero({ value }) {
        return value ? numberFormatter.format(Number(value)) : '';
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