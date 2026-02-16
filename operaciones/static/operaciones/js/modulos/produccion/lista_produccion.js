const numberFormatter = new Intl.NumberFormat('es-MX', { 
    minimumFractionDigits: 6, 
    maximumFractionDigits: 6 
});

const currencyFormatter = new Intl.NumberFormat('es-MX', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
});

const moneyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
});

let storeTotales = { 
    aut_mn: 0, aut_usd: 0, ejec_mn: 0, ejec_usd: 0,
    acum_mn: 0, acum_usd: 0, resta_mn: 0, resta_usd: 0
};

function actualizarKPIsFinancieros(totales) {
    storeTotales = totales || { 
        aut_mn: 0, aut_usd: 0, ejec_mn: 0, ejec_usd: 0,
        acum_mn: 0, acum_usd: 0, resta_mn: 0, resta_usd: 0
    };
    $('#lbl-aut-mn').text(moneyFormatter.format(storeTotales.aut_mn));
    $('#lbl-aut-usd').text(moneyFormatter.format(storeTotales.aut_usd));
    $('#lbl-ejec-mn').text(moneyFormatter.format(storeTotales.ejec_mn));
    $('#lbl-ejec-usd').text(moneyFormatter.format(storeTotales.ejec_usd));

    $('#lbl-acum-mn').text(moneyFormatter.format(storeTotales.acum_mn || 0));
    $('#lbl-acum-usd').text(moneyFormatter.format(storeTotales.acum_usd || 0));
    $('#lbl-resta-mn').text(moneyFormatter.format(storeTotales.resta_mn || 0));
    $('#lbl-resta-usd').text(moneyFormatter.format(storeTotales.resta_usd || 0));

    calcularHomologado();
}

function calcularHomologado() {
    const tc = parseFloat($('#input-tc-kpi').val()) || 0;
    
    const totalAut = storeTotales.aut_mn + (storeTotales.aut_usd * tc);
    const totalEjec = storeTotales.ejec_mn + (storeTotales.ejec_usd * tc);

    $('#lbl-total-hom-aut').text(moneyFormatter.format(totalAut));
    $('#lbl-total-hom-ejec').text(moneyFormatter.format(totalEjec));
}

$('#input-tc-kpi').on('input change', function() {
    calcularHomologado();
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
        
        this.el.style.backgroundColor = '';
        this.el.style.color = '';
        this.el.style.fontWeight = '';

        if (value == 'FIRMADO') {
            this.el.style.backgroundColor = '#95c93d'; 
            this.el.style.color = '#ffffff';           
            this.el.style.fontWeight = 'bold';
        } 
        else if (value == 'FALTA FIRMA PEMEX') {
            this.el.style.backgroundColor = '#fad91f'; 
            this.el.style.color = '#ffffff';           
            this.el.style.fontWeight = 'bold';
        } 
        else if (value == 'PENDIENTE') {
            this.el.style.backgroundColor = '#f05523'; 
            this.el.style.color = '#ffffff';           
            this.el.style.fontWeight = 'bold';
        }
        else if (value == 'PROCESO') {
            this.el.style.backgroundColor = '#51c2eb'; 
            this.el.style.color = '#ffffff';           
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
        span.className = 'badge text-white'; 
        
        if (value === 'BLOQUEADO') {
            span.innerHTML = '<i class="fas fa-lock me-1"></i> EXCEDENTE';
            span.style.backgroundColor = '#f05523'; 
        } else if (value === 'PENDIENTE') {
            span.innerHTML = 'PENDIENTE';
            span.style.backgroundColor = '#fad91f'; 
        } else if (value === 'AUTORIZADO') {
            span.innerHTML = '<i class="fas fa-check me-1"></i> AUTORIZADO';
            span.style.backgroundColor = '#95c93d'; 
        } else {
            span.className = ''; 
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
        this.el.className = 'd-flex flex-column justify-content-center align-items-end tui-grid-cell-content pe-2'; 
        this.el.style.width = '100%';
        this.el.style.height = '100%';
        this.el.style.lineHeight = '1.2';
        this.render(props);
    }
    
    getElement() { return this.el; }
    
    render(props) {
        const data = props.value;
        
        let valorVisual = data; 
        let programado = 0.0;
        let esExcedente = false;
        let teDia = 0.0;
        let cmaDia = 0.0;

        if (data && typeof data === 'object') {
            valorVisual = data.valor;
            programado = parseFloat(data.programado || 0);  
            esExcedente = data.es_excedente || false;
            teDia = parseFloat(data.te_dia || 0);
            cmaDia = parseFloat(data.cma_dia || 0);
        } 

        let valNum = parseFloat(valorVisual);
        if (isNaN(valNum)) valNum = 0;
        const displayValue = (valorVisual !== null && valorVisual !== undefined && valorVisual !== '') 
            ? numberFormatter.format(valNum)
            : '';

        let htmlContent = `<span class="val-real">${displayValue}</span>`;
        
        if (programado > 0) {
            htmlContent += `<span class="prog-text">P: ${numberFormatter.format(programado)}</span>`;
        }
        
        this.el.innerHTML = htmlContent;

        const diaNum = props.columnInfo.name.replace('dia', '');
        const totalDia = teDia + cmaDia;
        const fmt = (n) => numberFormatter.format(n);
        
        const diferencia = valNum - programado;
        const signoDiff = diferencia > 0 ? '+' : '';
        
        let tooltipText = `📅 Día: ${diaNum}\n` +
                        `-------------------\n` +
                        `🎯 Programado:  ${fmt(programado)}\n` +
                        `📊 Ejecutado:   ${fmt(totalDia)} (TE+CMA)\n` +
                        `-------------------\n` +
                        `Diff: ${signoDiff}${fmt(diferencia)}\n\n` +
                        `Detalle:\n` + 
                        `TE:  ${fmt(teDia)}\n` +
                        `CMA: ${fmt(cmaDia)}`;
        if (esExcedente) {
            this.el.classList.add('celda-excedente-moderna');
            tooltipText = "⚠️ VOLUMEN EXCEDENTE ⚠️\n\n" + tooltipText;
        } else if (valNum > 0 && programado > 0 && valNum >= programado) {
            this.el.classList.add('text-success'); 
        }

        this.el.title = tooltipText;
    }   
}

class ProduccionEditor {
    constructor(props) {
        const el = document.createElement('input');
        el.type = 'text';
        el.className = 'form-control form-control-sm text-end'; 
        
        this.originalData = props.value; 

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

    getValue() { 
        const nuevoValor = this.el.value;
        
        if (this.originalData && typeof this.originalData === 'object') {
            return {
                ...this.originalData, 
                valor: nuevoValor,    
            };
        }
        
        return nuevoValor; 
    }

    mounted() { this.el.select(); }
}

class CeldaGpuRenderer {
    constructor(props) {
        this.el = document.createElement('div');
        this.render(props);
    }

    getElement() { return this.el; }

    render(props) {
        const data = props.value;
        
        this.el.className = 'tui-grid-cell-content d-flex justify-content-center align-items-center';
        this.el.style.width = '100%';
        this.el.style.height = '100%';
        
        this.el.innerText = '';
        this.el.style.backgroundColor = '#f9f9f9'; 
        this.el.style.color = '';
        this.el.style.fontWeight = '';

        if (!data || typeof data !== 'object') {
            return;
        }

        const { estatus_id, estatus_texto, archivos_count } = data;
        const id = parseInt(estatus_id || 0);

        let texto = (estatus_texto || '')
        
        this.el.innerText = texto;
        this.el.style.fontWeight = 'bold';

        if (id === 17) { 
            this.el.style.backgroundColor = '#95c93d'; 
            this.el.style.color = '#ffffff';
        } 
        else if (id === 18) { 
            this.el.style.backgroundColor = '#fad91f'; 
            this.el.style.color = '#ffffffff';
        } 
        else if (id === 19 || id === 0) { 
            this.el.style.backgroundColor = '#f05523'; 
            this.el.style.color = '#ffffff';
        }
        else if (id === 20) {
            this.el.style.backgroundColor = '#51c2eb'; 
            this.el.style.color = '#ffffff';
        }
        else { 
            this.el.style.backgroundColor = '#6c757d'; 
            this.el.style.color = '#ffffff';
        }
    }
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
    let gridGpus = null;
    let otSeleccionada = null; 
    let tipoTiempoActivo = 'TE';
    let productoSeleccionadoCatalogo = null;
    let filaEnEdicion = null; 
    let celdaGpuEnEdicion = null;

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
            anio: $('#filtro-anio').val(),
            id_sitio: idSitio
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
            id_sitio: $('#select-sitio').val()
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
                    if (gridGpus && $('#gpus-tab').hasClass('active')) {
                        cargarDatosGpus();
                    }
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

    function abrirModalEvidenciaGpu(celdaData, codigoPartida, descripcionPartida, rowKey, columnName) {
        celdaGpuEnEdicion = {
            rowKey: rowKey,
            columnName: columnName,
            id_produccion: celdaData.id_produccion,
            datosOriginales: celdaData
        };
        $('#lbl-codigo-gpu').text(codigoPartida + ' - ' + descripcionPartida);
        
        const estatusId = celdaData.estatus_id ? celdaData.estatus_id : 19;
        $('#select-estatus-gpu').val(estatusId);

        const link = celdaData.archivo || '';
        $('#input-link-gpu').val(link);
        if (link) {
            $('#btn-abrir-link-gpu').attr('href', link);
            $('#div-ver-archivo-gpu').removeClass('d-none');
        } else {
            $('#div-ver-archivo-gpu').addClass('d-none');
        }

        const modal = new bootstrap.Modal(document.getElementById('modalEvidenciaGpu'));
        modal.show();
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
            width: 150,
            align: 'center',
            editor: {
                type: NativeSelectEditor,
                options: {
                    listItems: [
                        { text: 'FIRMADO', value: 'FIRMADO' },
                        { text: 'FALTA FIRMA PEMEX', value: 'FALTA FIRMA PEMEX' },
                        { text: 'PENDIENTE', value: 'PENDIENTE' },
                        { text: 'PROCESO', value: 'PROCESO' },
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
                data: [] ,
                draggable: true
            });

            gridReportesDiarios.on('click', (ev) => {
                if (ev.rowKey !== undefined) {
                    const rowData = gridReportesDiarios.getRow(ev.rowKey);
                    if (!otSeleccionada || otSeleccionada.id_ot !== rowData.id_ot) {
                        otSeleccionada = rowData;
                        cargarDetalleProduccion(otSeleccionada);
                        $('#lbl-ot-seleccionada').text(otSeleccionada.ot);
                        $('#lbl-ot-seleccionada-gpu').text(otSeleccionada.ot);
                        if (gridGpus) {
                            gridGpus.resetData([]);
                        }
                    }
                }
            });
        }
        
        const columnasDiasProduccion = Array.from({length: DAYS_IN_MONTH}, (_, i) => ({
            header: `${i+1}`,
            name: `dia${i+1}`,
            width: 70,
            align: 'center',
            formatter: ({ value }) => {
                if (value && typeof value === 'object') {
                    return value.valor !== undefined && value.valor !== null ? String(value.valor) : '';
                }
                return value !== undefined && value !== null ? String(value) : '';
            },
            copyOptions: {
                useFormattedValue: true
            },
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
                        width: 130, 
                        align: 'right',
                        filter: 'select',
                        formatter: formatearNumero
                    },
                    { 
                        header: 'Producido M.N.', 
                        name: 'monto_mn', 
                        width: 130, 
                        align: 'right',
                        filter: 'select',
                        formatter: formatearDinero
                    },
                    { 
                        header: 'Producido USD', 
                        name: 'monto_usd', 
                        width: 130, 
                        align: 'right',
                        filter: 'select',
                        formatter: formatearDinero
                    },
                    { 
                        header: 'Estatus Partida', 
                        name: 'estatus_gpu', 
                        width: 130, 
                        align: 'center', 
                        renderer: { type: GpuStatusRenderer } 
                    }
                ],
                data: [],
                draggable: true
            });

            gridProduccion.on('beforeChange', (ev) => {
                ev.changes.forEach(change => {
                    const { rowKey, columnName, nextValue } = change;
                    const rowData = gridProduccion.getRow(rowKey);
                    const oldValue = rowData[columnName];
                    if (oldValue && typeof oldValue === 'object') {
                        if (typeof nextValue !== 'object') {
                            change.nextValue = {
                                ...oldValue,
                                valor: nextValue
                            };
                        }
                    }
                });
            });
        }

        const elGridGpus = document.getElementById('grid-gpus');
        if (!elGridGpus) return; 
            const columnasDiasGpu = Array.from({length: DAYS_IN_MONTH}, (_, i) => ({
                header: `${i+1}`,
                name: `dia_${i+1}`,
                width: 140,
                align: 'center',
                renderer: { type: CeldaGpuRenderer }
            }));

            gridGpus = new tui.Grid({
                el: elGridGpus,
                scrollX: true,
                scrollY: true,
                bodyHeight: 640,
                rowHeight: 60, 
                columnOptions: { resizable: true, frozenCount: 4 },
                columns: [
                    { header: 'Partida', name: 'codigo',filter: 'select', width: 90, align: 'center' },
                    { header: 'Concepto', name: 'descripcion',filter: 'select', width: 150, align: 'left' },
                    { header: 'Anexo', name: 'anexo', filter: 'select', width: 80, align: 'center' },
                    { header: 'Unidad', name: 'unidad', width: 70, align: 'center' },
                    ...columnasDiasGpu 
                ],
                data: []
            });

            gridGpus.on('click', (ev) => {
                if (ev.columnName && ev.columnName.startsWith('dia') && ev.rowKey !== undefined) {
                    const rowData = gridGpus.getRow(ev.rowKey);
                    const celdaData = rowData[ev.columnName];
                    if (celdaData && celdaData.id_produccion) {
                        abrirModalEvidenciaGpu(celdaData, rowData.codigo, rowData.descripcion.slice(0, 53) + '...', ev.rowKey, ev.columnName);
                    }
                }
            });
    }

    function cargarDatosTablero() {
        const idSitio = $('#select-sitio').val();
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        if (!idSitio) return; 

        otSeleccionada = null;
        if(gridProduccion) gridProduccion.resetData([]);
        if(gridGpus) gridGpus.resetData([]);
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
                pintarGuardiasEnGrid();
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
                tipo_tiempo: tipoTiempoActivo ? tipoTiempoActivo : 'TE',
                id_sitio: $('#select-sitio').val()
            },
            success: function(response) {
                let data = [];
                let diasBloqueados = [];
                let totales = { aut_mn: 0, aut_usd: 0, ejec_mn: 0, ejec_usd: 0 };

                if (Array.isArray(response)) {
                    data = response;
                } else if (response.partidas) {
                    data = response.partidas;
                    diasBloqueados = response.dias_bloqueados || [];
                    if(response.totales) totales = response.totales;
                }

                actualizarKPIsFinancieros(totales);

                if (gridProduccion) {
                    gridProduccion.resetData(data);
                    bloquearDiasFueraDeVigencia(ot, parseInt(mes), parseInt(anio));
                    bloquearDiasFirmados(diasBloqueados);
                }

                setTimeout(() => {
                    pintarGuardiasEnGrid();
                }, 200);

            },
            error: function(xhr) {
                $('#kpi-status-text').text("ERROR CARGANDO PARTIDAS").addClass('text-danger');
            }
        });
    }
    
    function cargarDatosGpus() {
        if (!otSeleccionada || !gridGpus) return;

        const idSitio = $('#select-sitio').val();
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        gridGpus.resetData([]); 
        
        $.ajax({
            url: urlObtenerGridGpus,
            type: 'GET',
            data: {
                id_ot: otSeleccionada.id_ot,
                mes: mes,
                anio: anio
            },
            success: function(response) {
                const data = response.data || [];
                gridGpus.resetData(data);
            },
            error: function(xhr) {
                console.error("Error cargando GPUs:", xhr);
                aviso("error", "No se pudo cargar el tablero de GPUs");
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

    function formatearDinero({ value }) {
        return value ? moneyFormatter.format(Number(value)) : '';
    }

    $('#select-sitio, #filtro-mes, #filtro-anio').on('change', function() {
        cargarDatosTablero();
    });

    $('#btn-actualizar-tablero').on('click', function() {
        cargarDatosTablero();
    });

    $('#btn-config-guardias').on('click', function() {
        const idSitio = $('#select-sitio').val();
        if(!idSitio) return aviso("advertencia", "Selecciona un sitio primero");

        $('#select-super-a, #select-super-b').empty();

        $.ajax({
            url: urlObtenerSupers,
            data: { id_sitio: idSitio },
            success: function(res) {
                if(res.supers.length === 0) {
                    aviso("advertencia", "No hay superintendentes asignados a este sitio en la BD.");
                }
                res.supers.forEach(s => {
                    $('#select-super-a, #select-super-b').append(new Option(s.nombre, s.id));
                });
                new bootstrap.Modal(document.getElementById('modalConfigGuardia')).show();
            }
        });
    });

    $('#btn-guardar-ciclo').on('click', function() {
        const data = {
            id_sitio: $('#select-sitio').val(),
            id_super_a: $('#select-super-a').val(),
            id_super_b: $('#select-super-b').val(),
            fecha_inicio_a: $('#input-inicio-ciclo').val()
        };

        if(!data.id_super_a || !data.id_super_b || !data.fecha_inicio_a) {
            return aviso("advertencia", "Todos los campos son obligatorios");
        }

        $.ajax({
            url: urlConfigGuardia,
            type: 'POST',
            data: JSON.stringify(data),
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function() {
                aviso("exito", "Ciclo configurado. Calculando guardias...");
                bootstrap.Modal.getInstance(document.getElementById('modalConfigGuardia')).hide();
                pintarGuardiasEnGrid(); 
            }
        });
    });

    $('#btn-guardar-gpu').on('click', function() {
        if (!celdaGpuEnEdicion) return;

        const nuevoEstatusId = parseInt($('#select-estatus-gpu').val());
        const nuevoLink = $('#input-link-gpu').val().trim();
        const textoEstatus = $('#select-estatus-gpu option:selected').text();

        if (nuevoLink.trim() !== "") {
            if (!nuevoLink.startsWith('http://') && !nuevoLink.startsWith('https://')) {
                aviso("advertencia", "La URL debe comenzar con http:// o https://");
                $('#input-link-gpu').focus();
                return;
            }
        }

        const $btn = $(this);
        const textoOriginalBtn = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');

        const payload = {
            id_produccion: celdaGpuEnEdicion.id_produccion,
            estatus_id: nuevoEstatusId,
            archivo: nuevoLink
        };

        $.ajax({
            url: urlGuardarEstatusGpu, 
            type: 'POST',
            data: JSON.stringify(payload),
            contentType: 'application/json',
            headers: { 'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val() },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", "GPU actualizado correctamente");
                    const nuevaDataCelda = {
                        ...celdaGpuEnEdicion.datosOriginales, 
                        estatus_id: nuevoEstatusId,           
                        estatus_texto: textoEstatus,          
                        archivo: nuevoLink,                   
                        archivos_count: nuevoLink ? 1 : 0     
                    };

                    if (gridGpus) {
                        gridGpus.setValue(
                            celdaGpuEnEdicion.rowKey, 
                            celdaGpuEnEdicion.columnName, 
                            nuevaDataCelda
                        );
                    }

                    const modalEl = document.getElementById('modalEvidenciaGpu');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    modalInstance.hide();
                    
                    celdaGpuEnEdicion = null;

                } else {
                    aviso("error", response.mensaje || "No se pudo guardar");
                }
            },
            error: function(xhr) {
                console.error("Error al guardar GPU:", xhr);
                aviso("error", "Error de comunicación con el servidor");
            },
            complete: function() {
                $btn.prop('disabled', false).html(textoOriginalBtn);
            }
        });
    });

    function pintarGuardiasEnGrid() {
        const idSitio = $('#select-sitio').val();
        const mes = $('#filtro-mes').val();
        const anio = $('#filtro-anio').val();

        if(!idSitio) return;
        const $gridContainers = $('#grid-produccion, #grid-asistencia');
        $gridContainers.find('th[data-column-name^="dia"]').each(function() {
            $(this).css({
                'background-color': '',
                'position': 'relative', 
                'overflow': 'visible', 
                'border-top': '' 
            }).attr('title', '');
            $(this).find('.guardia-badge').remove(); 
        });

        $.ajax({
            url: urlObtenerGuardias,
            data: { id_sitio: idSitio, mes: mes, anio: anio },
            success: function(response) {
                const guardias = response.guardias;
                
                $gridContainers.each(function() {
                    const $currentGrid = $(this);

                    guardias.forEach(g => {
                        const $startCell = $currentGrid.find(`th[data-column-name="dia${g.inicio}"]`);
                        
                        if ($startCell.length) {
                            let totalWidth = 0;
                            
                            for (let d = g.inicio; d <= g.fin; d++) {
                                const $cell = $currentGrid.find(`th[data-column-name="dia${d}"]`);
                                if ($cell.length) {
                                    totalWidth += $cell.outerWidth();
                                    
                                    $cell.css('background-color', hexToRgba(g.color, 0.1));
                                    $cell.attr('title', `👮 ${g.nombre}`);
                                }
                            }
                            if (totalWidth > 0) {
                                const primerNombre = g.nombre;
                                
                                const badgeHtml = `
                                    <div class="guardia-badge" style="
                                        position: absolute;
                                        top: -4px;
                                        left: 0;
                                        width: ${totalWidth}px;
                                        height: 18px;
                                        background-color: ${g.color};
                                        color: white;
                                        font-size: 10px;
                                        line-height: 18px;
                                        font-weight: bold;
                                        text-align: center;
                                        white-space: nowrap;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        z-index: 100;
                                        border-bottom-left-radius: 4px;
                                        border-bottom-right-radius: 4px;
                                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                        pointer-events: none;
                                    ">
                                        ${primerNombre}
                                    </div>
                                `;
                                
                                $startCell.append(badgeHtml);
                            }
                        }
                    });
                });
            },
            error: function(e) {
                console.error("Error obteniendo guardias", e);
            }
        });
    }

    function hexToRgba(hex, alpha) {
        if (!hex) return `rgba(0,0,0,${alpha})`;
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }


    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (event) {
        if(event.target.id === 'asistencia-tab' && gridReportesDiarios) {
            gridReportesDiarios.refreshLayout();
        }
        
        if(event.target.id === 'produccion-tab' && gridProduccion) {
            gridProduccion.refreshLayout();
            pintarGuardiasEnGrid();
        }
        if(event.target.id === 'gpus-tab' && gridGpus) {
            gridGpus.refreshLayout();
            if(otSeleccionada) {
                cargarDatosGpus();
            }
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
            if (gridGpus) gridGpus.refreshLayout();
        }, 50);
    });
});