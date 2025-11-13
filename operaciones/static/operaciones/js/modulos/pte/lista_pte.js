/*
 * __filename__   : lista_pte.js
 * __author__     : ARMANDO PERERA
 * __description__: JS la view de pte's
 * __version__    : 1.0.1
 * __app__        : BME SUBTEC
 */
let REGISTRO_ACTIVIDAD = new RegistroActividad(0,null,"REGISTRAR")
let tablaSubpasosGlobal = null;
$(document).ready(function () {
    window.tablaPte = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[1, "desc"]],
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
                extra.estatus = $("#estatus").val();
                extra.tipo = $("#tipo").val();
                extra.responsable_proyecto = $("#id_responsable_proyecto").val();
                extra.anio = $("#anio").val();
            }
        },
        columns: [
            {
                "data": null,
                "title": "",
                "width": "1%",
                "render": function (data, type, row) {
                    // Mostrar ícono + si tiene detalles
                    let ampliar = "";
                    ampliar = `<a class="table-icon detalle-pte" title="Ver detalles">
                                    <i class="fas fa-plus-square"></i>
                                </a>`;
                    return ampliar;
                },
                "orderable": false
            },
            {
                "data": "id",
                "title": "ID",
                "visible": false
            },
            {
                "data": "descripcion_tipo",
                "title": "Tipo"
            },
            {
                "data": "oficio_pte",
                "title": "Folio PTE"
            },
            // {
            //     "data": "oficio_solicitud",
            //     "title": "Oficio solicitud"
            // },
            {
                "data": "descripcion_trabajo",
                "title": "Descripción de trabajo"
            },
            {
                "data": "fecha_entrega",
                "title": "Fecha entrega"
            },
            {
                "data": "estatus_texto",
                "title": "Estatus",
                "orderable": false,
                "className": "text-center",
                "width": "10%",
                "render": function(data, type, row) {
                    const estatusClasses = {
                        'PENDIENTE': 'bg-warning',
                        'PROCESO': 'bg-primary', 
                        'ENTREGADA': 'bg-success',
                        'CANCELADA': 'bg-danger',
                        'SUSPENDIDA': 'bg-secondary',
                        'DESCONOCIDO': 'bg-secondary'
                    };
                    
                    return `
                        <div class="dropdown">
                            <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                    type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ${data}
                            </button>
                            <ul class="dropdown-menu w-100">
                                <li><a class="dropdown-item cambiar-estatus-pte" data-estatus="1">PENDIENTE</a></li>
                                <li><a class="dropdown-item cambiar-estatus-pte" data-estatus="2">PROCESO</a></li>
                                <li><a class="dropdown-item cambiar-estatus-pte" data-estatus="3">ENTREGADA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-pte" data-estatus="4">CANCELADA</a></li>
                                <li><a class="dropdown-item cambiar-estatus-pte" data-estatus="9">SUSPENDIDA</a></li>
                            </ul>
                        </div>
                    `;
                }
            },
            {
                "data": "progreso",
                "title": "Progreso",
                "render": function(data, type, row) {
                    let color = 'bg-success';
                    if (data < 25) color = 'bg-danger';
                    else if (data < 75) color = 'bg-warning';
                    
                    // Asegurar que data sea un número válido
                    const porcentaje = isNaN(data) ? 0 : Math.max(0, Math.min(100, data));
                    
                    return `
                        <div title="${row.pasos_completados}/${row.total_pasos} pasos completados">
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${color} progress-bar" 
                                    role="progressbar" 
                                    style="width: ${porcentaje}%" 
                                    aria-valuenow="${porcentaje}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                </div>
                            </div>
                            <div class="text-center text-dark fw-bold mt-1" style="font-size: 12px;">
                                ${porcentaje}%
                            </div>
                        </div>
                    `;
                }
            },
            {
                "data": null,
                "title": "Opciones",
                "class": "text-center",
                "width": "150px",
                "orderable": false,
                render: function (fila) {
                    let botones = `
                        <a class="table-icon editar_pte" title="Editar" data-id="${fila.id}">
                            <i class="fas fa-edit"></i>
                        </a>
                    `;
                    if (puedeEliminarPte) {
                        botones += `
                            <a class="table-icon eliminar_pte" title="Eliminar" data-id="${fila.id}">
                                <i class="fas fa-trash"></i>
                            </a>
                        `;
                    } else {
                        botones += `
                            <a class="table-icon disabled" title="Sin permisos para eliminar" 
                            style="opacity: 0.5; cursor: not-allowed; color: #6c757d;">
                                <i class="fas fa-trash"></i>
                            </a>
                        `;
                    }
                    // Si el progreso es 100%, mostrar botón para crear OTE
                    if (fila.progreso === 100) {
                        botones += `
                            <a class="table-icon crear-ot" title="Crear Orden de Trabajo" data-id="${fila.id}">
                                <i class="fas fa-clipboard-check text-success"></i>
                            </a>
                        `;
                    }
                    return botones;
                }
            }
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
        }
    });

    // Evento para cambiar estatus de la pte
    $(`#tabla`).on('click', '.cambiar-estatus-pte', function() {
        const tr = $(this).closest('tr');
        const row = tablaPte.row(tr);
        const rowData = row.data();
        const pteId = rowData.id;
        const nuevoEstatus = $(this).data('estatus');
        const textoEstatus = $(this).text().trim();
        const mostrarFechaEntrega = (nuevoEstatus == '3');
        const dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');
        let contenidoMensaje = `
            <div class="mb-3">
                <p>¿Estás seguro de cambiar el estatus de la PTE a <strong>${textoEstatus}</strong>?</p>
                <div class="row">
        `;

        // Agregar campo de fecha solo si el estatus es 3
        if (mostrarFechaEntrega) {
            contenidoMensaje += `
                <div class="mb-3 col-3">
                    <label for="fechaEntregaPte" class="form-label">Fecha de entrega:</label>
                    <input type="date" class="form-control" id="fechaEntregaPte" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
            `;
        }
        
        contenidoMensaje += `
                <div class="mb-3 col-4">
                    <label for="comentarioCambioPTE" class="form-label">Comentario:</label>
                    <textarea class="form-control" id="comentarioCambioPTE" rows="1" placeholder="Agregar un comentario sobre este cambio..."></textarea>
                </div>
            </div>
        </div>
        `;


        BMensaje({
            titulo: "Confirmación",
            subtitulo: contenidoMensaje,
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        const comentario = $('#comentarioCambioPTE').val().trim();
                        const url = urlCambiarEstatusPTE;
                        const method = "POST";
                        if (mostrarFechaEntrega) {
                            const fechaEntrega = $('#fechaEntregaPte').val();
                            if (!fechaEntrega) {
                                aviso("advertencia", "La fecha de entrega es obligatoria para el estatus TERMINADA");
                                return;
                            }
                        }
                        let log = new RegistroActividad(0,rowData.id,"ACTUALIZAR");
                        log.agregar_actividad({
                            nombre:"Actualizó",
                            valor_actual:textoEstatus,
                            valor_anterior:rowData.estatus_texto,
                            detalle:`el estatus de: <b>${rowData.estatus_texto}</b> a: <b>${textoEstatus}</b>, de la PTE HEADER: <b>${rowData.oficio_pte}</b>`})   
                        
                        const datos = {
                            pte_id: pteId,
                            nuevo_estatus: nuevoEstatus,
                            comentario: comentario, 
                            registro_actividad: JSON.stringify(log.actividad),
                            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                        };
                        // Agregar fecha de entrega solo si existe
                        if (mostrarFechaEntrega) {
                            datos.fecha_entrega = $('#fechaEntregaPte').val();
                        }
                        BMAjax(
                            url, 
                            datos,
                            method
                        ).done(function(response) {
                            if (response.exito) {
                                // Actualizar el botón en tiempo real
                                actualizarEstatusPTEEnTiempoReal(dropdownButton, textoEstatus, nuevoEstatus);
                            } else {
                                aviso("error", response.detalles || "Error al cambiar el estatus");
                            }
                        }).fail(function() {
                            aviso("error", "Error al cambiar el estatus");
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

    // Evento para expandir detalles del PTE
    $("#tabla tbody").on("click", ".detalle-pte", function () {
        let tr = $(this).closest("tr");
        let row = tablaPte.row(tr);
        let pteId = row.data().id;

        if (row.child.isShown()) {
            // Cerrar detalles
            let tablaDetalle = $(`#tabla-detalle-pte_${pteId}`);
            if (tablaDetalle.length && $.fn.DataTable.isDataTable(tablaDetalle)) {
                // Destruir el DataTable hijo si existe
                tablaDetalle.DataTable().destroy();
                tablaDetalle.empty(); // Limpiar el contenido de la tabla
            }
            
            row.child.hide(); // Ocultar el child
            tr.removeClass('shown');
            $(this).find('i').removeClass('fa-minus-square').addClass('fa-plus-square'); // Cambiar ícono
        } else {
            // Abrir detalles
            $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
            
            row.child(
                $(`<div class="detalle-pte-container"></div>`).html(
                    fnHTMLTablaDetallePTE(pteId)
                )
            ).show();
            
            // Inicializar DataTable de detalles
            let tablaDetallePTE = $(`#tabla-detalle-pte_${pteId}`).DataTable({
                processing: true,
                serverSide: true,
                responsive: true,
                searching: false,  // Sin búsqueda
                paging: true,      // Paginación activada
                info: true,        // Info de paginación
                pageLength: 10,    // 10 registros por página
                lengthChange: false, // No permitir cambiar cantidad de registros
                dom: '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>', // Solo info y paginación
                language: {
                    "lengthMenu": "",  // Ocultar texto de length menu
                    "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
                    "infoEmpty": "No hay registros",
                    "infoFiltered": "",
                    "paginate": {
                        "first": "‹‹",
                        "last": "››",
                        "next": "›",
                        "previous": "‹"
                    }
                },
                ajax: {
                    url: urlDatatableDetalle,
                    type: "GET",
                    data: function(d) {
                        d.pte_header_id = pteId;
                    }
                },
                columns: [
                    {
                        "data": null,
                        "title": "",
                        "width": "1%",
                        "render": function (data, type, row) {
                            // Mostrar ícono en paso 4 
                            if (row.orden==4 ){
                                let ampliar = "";
                                ampliar = `<a class="table-icon detalle-subpaso" title="Ver detalles">
                                                <i class="fas fa-plus-square"></i>
                                            </a>`;
                                return ampliar;
                            } else {
                                return "";
                            }
                        },
                        "orderable": false
                    },
                    {
                        "data": "orden",
                        "title": "Paso",
                        "orderable": false,
                        "className": "text-center"
                    },
                    {
                        "data": "desc_paso", 
                        "title": "Descripción",
                        "width": "30%",
                        "orderable": false,
                        "render": function(data, type, row) {
                            if (row.orden == "4.0") {
                                return `
                                    <div>
                                        <div class="fw-bold mb-1">${data}</div>
                                    </div>
                                `;
                            } else {
                                // Para otros pasos, mostrar descripción normal
                                return data;
                            }
                        }
                    },
                    {
                        "data": "fecha_inicio",
                        "title": "Fecha inicio",
                        "orderable": false,
                        "className": "text-center",
                        "width": "10%",
                        "render": function(data, type, row) {
                            return `
                                <div class="fecha-selector-container">
                                    <input type="date" 
                                        class="form-control form-control-m fecha-input" 
                                        value="${data || ''}"
                                        tipo="1"
                                        data-paso-id="${row.id}"
                                        ${[3, 14].includes(row.estatus_pte) ? 'disabled' : ''}
                                        style="width: 130px; font-size: 12px;">
                                </div>
                            `;
                        }
                    },
                    {
                        "data": "fecha_termino",
                        "title": "Fecha termino",
                        "orderable": false,
                        "className": "text-center",
                        "width": "10%",
                        "render": function(data, type, row) {
                            return `
                                <div class="fecha-selector-container">
                                    <input type="date" 
                                        class="form-control form-control-m fecha-input" 
                                        value="${data || ''}"
                                        tipo="2"
                                        data-paso-id="${row.id}"
                                        ${[3, 14].includes(row.estatus_pte) ? 'disabled' : ''}
                                        style="width: 130px; font-size: 12px;">
                                </div>
                            `;
                        }
                    },
                    {
                        "data": "fecha_entrega",
                        "title": "Fecha entrega",
                        "orderable": false,
                        "className": "text-center",
                        "width": "9%",
                        "render": function(data, type, row) {
                            // Si es paso 4, estatus 3 y no tiene fecha de entrega, mostrar input de fecha
                            if (row.orden == 4 && row.estatus_pte == 3 && (!data)) {
                                return `
                                    <input type="date" 
                                        class="form-control form-control-m fecha-input" 
                                        data-paso-id="${row.id}"
                                        tipo="3"
                                        style="width: 130px; font-size: 12px;"
                                        value="${data || ''}">
                                `;
                            } else {
                                // Mostrar fecha normal o vacío
                                return data || '';
                            }
                        }
                    },
                    {
                        "data": "comentario",
                        "title": "Comentario",
                        "width": "25%",
                        "orderable": false
                    },
                    {
                        "data": "estatus_pte_texto",
                        "title": "Estatus",
                        "orderable": false,
                        "className": "text-center",
                        "width": "10%",
                        "render": function(data, type, row) {
                            const estatusClasses = {
                                'PENDIENTE': 'bg-warning',
                                'PROCESO': 'bg-primary', 
                                'COMPLETADO': 'bg-success',
                                'CANCELADO': 'bg-danger',
                                'NO APLICA': 'bg-secondary'
                            };

                            // Si es el paso 4 y tiene progreso de subpasos, mostrar barra de progreso
                            if (row.orden == "4.0") {
                                let color = 'bg-success';
                                const progreso = Math.round(row.progreso_subpasos);
                                
                                if (progreso < 25) color = 'bg-danger';
                                else if (progreso < 75) color = 'bg-warning';
                                
                                return `
                                    <div>
                                        <div class="small text-dark mb-1" style="font-size: 12px;"><b>Avance general:</b></div>
                                        <div class="progress" style="height: 15px;">
                                            <div class="progress-bar ${color} progress-bar" 
                                                role="progressbar" 
                                                style="width: ${progreso}%" 
                                                aria-valuenow="${progreso}" 
                                                aria-valuemin="0" 
                                                aria-valuemax="100"
                                                title="${row.subpasos_completados || 0}/${row.total_subpasos || 0} subpasos completados">
                                            </div>
                                        </div>
                                        <div class="text-center text-dark fw-bold mt-1" style="font-size: 10px;">
                                            ${progreso}%
                                        </div>
                                    </div>
                                `;
                            } else {
                                // Para otros pasos, mostrar estatus normal
                                return `
                                    <div class="dropdown">
                                        <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                                type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            ${data}
                                        </button>
                                        <ul class="dropdown-menu w-100">
                                            <li><a class="dropdown-item cambiar-estatus-option" data-estatus="1">PENDIENTE</a></li>
                                            <li><a class="dropdown-item cambiar-estatus-option" data-estatus="2">PROCESO</a></li>
                                            <li><a class="dropdown-item cambiar-estatus-option" data-estatus="3">COMPLETADO</a></li>
                                            <li><a class="dropdown-item cambiar-estatus-option" data-estatus="4">CANCELADO</a></li>
                                            <li><a class="dropdown-item cambiar-estatus-option" data-estatus="14">NO APLICA</a></li>
                                        </ul>
                                        <input type="hidden" class="paso-id" value="${row.id}">
                                    </div>
                                `;
                            }
                        
                        }
                    },
                    {
                        "data": null,
                        "title": "Opciones",
                        "class": "text-center",
                        "width": "120px",
                        "orderable": false,
                        "render": function(data, type, row) {
                            if (row.archivo && row.archivo.trim() !== '') {
                                // Codificar la URL para caracteres especiales
                                const urlCodificada = encodeURI(row.archivo);
                                const archivoAcortado = row.archivo.length > 30 ? 
                                    row.archivo.substring(0, 30) + '...' : row.archivo;
                                    
                                return `
                                    <a class="table-icon ver-archivo" 
                                        title="Cambiar archivo" 
                                        data-id="${row.id}"  >
                                        <i class="fas fa-upload text-secondary"></i>
                                    </a>
                                    <a class="table-icon ver-archivo-externo" 
                                        href="${urlCodificada}" 
                                        target="_blank" 
                                        title="Abrir: ${archivoAcortado}"
                                        data-bs-toggle="tooltip"
                                        data-bs-placement="top"
                                        data-id="${row.id}">
                                            <i class="fas fa-eye text-success"></i>
                                    </a>
                                `;
                            } else {
                                // Si no tiene archivo, mostrar solo ícono de subir
                                return `
                                    <a class="table-icon ver-archivo" title="Subir archivo" data-id="${row.id}">
                                        <i class="fas fa-upload"></i>
                                    </a>
                                `;
                            }
                        }
                    }
                ]
            });
            
            //evento para cargar archivo
            $(`#tabla-detalle-pte_${pteId}`).on('click', '.ver-archivo', function(){
                const pasoId = $(this).data('id');
                let datos = tablaDetallePTE.row($(this).parents('tr')).data() ? 
                    tablaDetallePTE.row($(this).parents('tr')).data() : 
                    tablaSubpasosGlobal.row($(this).parents('tr')).data();
                window.tablaDetalleActiva = tablaDetallePTE.row($(this).parents('tr')).data() ? tablaDetallePTE : tablaSubpasosGlobal;
                abrirModalSubirArchivo(datos);
            })

            //Evento para cambiar estatus de un paso
            $(`#tabla-detalle-pte_${pteId}`).on('click', '.cambiar-estatus-option', function() {
                const pasoId = $(this).closest('.dropdown').find('.paso-id').val();
                const nuevoEstatus = $(this).data('estatus');
                const textoEstatus = $(this).text().trim();
                const mostrarFechaEntrega = (nuevoEstatus == '3');
                const dropdownButton = $(this).closest('.dropdown').find('.dropdown-toggle');
                let datosPaso = tablaDetallePTE.row($(this).parents('tr')).data() ? 
                    tablaDetallePTE.row($(this).parents('tr')).data() : 
                    tablaSubpasosGlobal.row($(this).parents('tr')).data();
                let contenidoMensaje = `
                    <div class="mb-3">
                        <p>¿Estás seguro de cambiar el estatus a <strong>${textoEstatus}</strong>?</p>
                        <div class="row">
                `;
                
                // Agregar campo de fecha solo si el estatus es 3
                if (mostrarFechaEntrega) {
                    contenidoMensaje += `
                        <div class="mb-3 col-3">
                            <label for="fechaEntrega" class="form-label">Fecha de entrega:</label>
                            <input type="date" class="form-control" id="fechaEntrega" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                    `;
                }
                
                contenidoMensaje += `
                        <div class="mb-3 col-4">
                            <label for="comentarioCambio" class="form-label">Comentario:</label>
                            <textarea class="form-control" id="comentarioCambio" rows="1" placeholder="Agregar un comentario sobre este cambio..."></textarea>
                        </div>
                    </div>
                </div>
                `;

                BMensaje({
                    titulo: "Confirmación",
                    subtitulo: contenidoMensaje,
                    botones: [
                        {
                            texto: "Sí, continuar",
                            clase: "btn-primary",
                            funcion: function() {
                                const comentario = $('#comentarioCambio').val().trim();
                                const url = urlCambiarEstatusPaso;
                                const method = "POST";
                                 // Validar fecha si es requerida
                                if (mostrarFechaEntrega) {
                                    const fechaEntrega = $('#fechaEntrega').val();
                                    if (!fechaEntrega) {
                                        aviso("advertencia", "La fecha de entrega es obligatoria para el estatus TERMINADA");
                                        return;
                                    }
                                }
                                let log = new RegistroActividad(1,datosPaso.id,"ACTUALIZAR");
                                log.agregar_actividad({
                                    nombre:"Actualizó",
                                    valor_actual:textoEstatus,
                                    valor_anterior:datosPaso.estatus_pte_texto,
                                    detalle:`el estatus de: <b>${datosPaso.estatus_pte_texto}</b> a: <b>${textoEstatus}</b>, del paso <b>${datosPaso.orden} - ${datosPaso.desc_paso}</b> de la PTE: <b>${datosPaso.folio_pte}</b>`})   
                                    
                                // Agregar fecha de entrega solo si existe
                                const datos = {
                                    paso_id: pasoId,
                                    nuevo_estatus: nuevoEstatus,
                                    comentario: comentario,
                                    registro_actividad: JSON.stringify(log.actividad), 
                                    csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                                };
                                if (mostrarFechaEntrega) {
                                    datos.fecha_entrega = $('#fechaEntrega').val();
                                }
                                const fechaEntregaData = mostrarFechaEntrega ? $('#fechaEntrega').val() : null;

                                BMAjax(
                                    url, 
                                    datos,
                                    method
                                ).done(function(response) {
                                    if (response.exito) {
                                        actualizarEstatusEnTiempoReal(dropdownButton, textoEstatus, nuevoEstatus, fechaEntregaData, comentario, tablaDetallePTE);
                                        if (response.paso_actualizado_4) {
                                            tablaDetallePTE.rows().every(function() {
                                                const data = this.data();
                                                if (data.orden == 4) {
                                                    // Actualizar estatus a COMPLETADO
                                                    data.estatus_pte = 3;
                                                    data.estatus_pte_texto = 'COMPLETADO';
                                                    
                                                    // Actualizar botón visualmente
                                                    const tr = this.node();
                                                    const paso4DropdownButton = $(tr).find('.dropdown-toggle');

                                                    // Actualizar inputs de fecha - NO solo deshabilitar, también actualizar valores
                                                    const inputFechaInicio = $(tr).find('.fecha-input[tipo="1"]');
                                                    const inputFechaTermino = $(tr).find('.fecha-input[tipo="2"]');
                                                    
                                                    // Deshabilitar los inputs
                                                    inputFechaInicio.prop('disabled', true);
                                                    inputFechaTermino.prop('disabled', true);
                                                    
                                                    if (!data.fecha_termino) {
                                                        const fechaActual = new Date().toISOString().split('T')[0];
                                                        inputFechaTermino.val(fechaActual);
                                                        data.fecha_termino = fechaActual;
                                                    }

                                                    // Mostrar input para fecha de entrega si no tiene
                                                    const fechaEntregaCell = $(tr).find('td').eq(5);
                                                    if (!data.fecha_entrega || data.fecha_entrega.trim() === '') {
                                                        fechaEntregaCell.html(`
                                                            <input type="date" 
                                                                class="form-control form-control-sm fecha-input" 
                                                                data-paso-id="${data.id}"
                                                                tipo="3"
                                                                style="width: 130px; font-size: 12px;"
                                                                value="">
                                                        `);
                                                    }
                                                    
                                                    this.invalidate();
                                                    return false;
                                                }
                                            });
                                            aviso("info", "Volumetría completada automáticamente");
                                        }
                                        actualizarProgresoPaso4(pteId, tablaDetallePTE)
                                        actualizarProgresoGeneralPTE(pteId)
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

            // Evento para cambiar fecha de inicio, término y entrega
            $(`#tabla-detalle-pte_${pteId}`).on('change', '.fecha-input', function() {
                const pasoId = $(this).data('paso-id');
                let datosPaso = tablaDetallePTE.row($(this).parents('tr')).data() ? 
                    tablaDetallePTE.row($(this).parents('tr')).data() : 
                    tablaSubpasosGlobal.row($(this).parents('tr')).data();
                const tipo = $(this).attr('tipo');
                const nuevaFecha = $(this).val();
                const fechaCell = $(this).closest('td');
                if (!nuevaFecha) {
                    return;
                }

                let log = new RegistroActividad(1,datosPaso.id,"ACTUALIZAR");
                log.agregar_actividad({
                    nombre:"Actualizó",
                    valor_actual:nuevaFecha,
                    valor_anterior:(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega,
                    detalle:`la fecha de:<b> ${(tipo=='1')?datosPaso.fecha_inicio:(tipo=='2')?datosPaso.fecha_termino:datosPaso.fecha_entrega}</b> a: <b>${nuevaFecha}
                        ${(tipo=='1')?'de inicio':
                        (tipo=='2')?'de término':'de entrega'} </b>
                        del paso <b>${datosPaso.orden}</b> de la PTE: <b>${datosPaso.folio_pte}</b>`}) 
                
                BMAjax(
                    urlActualizarFecha, 
                    { 
                        id_paso: pasoId,
                        tipo: tipo,
                        fecha: nuevaFecha,
                        registro_actividad: JSON.stringify(log.actividad),
                        csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                    },
                    "POST"
                ).done(function(response) {
                    if (response.exito) {
                        // Si es tipo 3 (fecha de entrega), reemplazar input por texto formateado
                        if (tipo == '3') {
                            const parts = nuevaFecha.split('-');
                            const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
                            fechaCell.text(fechaFormateada);
                        }
                        actualizarProgresoGeneralPTE(pteId);
                    } else {
                        aviso("error", response.detalles || "Error al guardar la fecha");
                    }
                }).fail(function() {
                    aviso("error", "Error al guardar la fecha");
                });
            });

            // Evento para expandir subpasos del paso 4
            $(`#tabla-detalle-pte_${pteId}`).on("click", ".detalle-subpaso", function () {
                let tr = $(this).closest("tr");
                let row = tablaDetallePTE.row(tr);
                let pasoId = row.data().id;
                if (row.child.isShown()) {
                    // Cerrar subpasos
                    let tablaSubpasos = $(`#tabla-subpasos_${pteId}`);
                    if (tablaSubpasos.length && $.fn.DataTable.isDataTable(tablaSubpasos)) {
                        tablaSubpasos.DataTable().destroy();
                        tablaSubpasos.empty();
                    }
                    
                    row.child.hide();
                    tr.removeClass('shown-subpaso');
                    $(this).find('i').removeClass('fa-minus-square').addClass('fa-plus-square');
                } else {
                    // Abrir subpasos
                    $(this).find('i').removeClass('fa-plus-square').addClass('fa-minus-square');
                    
                    row.child(
                        $(`<div class="detalle-subpaso-container" style="padding-left: 30px; background-color: #f8f9fa;"></div>`).html(
                            fnHTMLTablaSubpasos(pteId)
                        )
                    ).show();
                    
                    // Inicializar DataTable de subpasos
                    tablaSubpasosGlobal = $(`#tabla-subpasos_${pteId}`).DataTable({
                        processing: true,
                        serverSide: true,
                        responsive: true,
                        searching: false,
                        paging: false, 
                        info: false,
                        dom: '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>', // Solo info y paginación
                        language: {
                            "lengthMenu": "",  // Ocultar texto de length menu
                            "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
                            "infoEmpty": "No hay registros",
                            "infoFiltered": "",
                            "paginate": {
                                "first": "‹‹",
                                "last": "››",
                                "next": "›",
                                "previous": "‹"
                            }
                        },
                        ajax: {
                            url: urlDatatableSubpasos,
                            type: "GET",
                            data: function(d) {
                                d.pte_header_id = pteId;
                            }
                        },
                        columns: [
                            {
                                "data": "orden",
                                "title": "Sub-paso",
                                "orderable": false,
                                "className": "text-center",
                                "width": "15%",
                            },
                            {
                                "data": "desc_paso", 
                                "title": "Descripción",
                                "width": "40%",
                                "orderable": false
                            },
                            {
                                "data": "fecha_inicio",
                                "title": "Fecha inicio",
                                "orderable": false,
                                "className": "text-center",
                                "width": "10%",
                                "render": function(data, type, row) {
                                    return `
                                        <div class="fecha-selector-container">
                                            <input type="date" 
                                                class="form-control form-control-m fecha-input" 
                                                value="${data || ''}"
                                                tipo="1"
                                                data-paso-id="${row.id}"
                                                ${[3, 14].includes(row.estatus_pte) ? 'disabled' : ''}
                                                style="width: 130px; font-size: 12px;">
                                        </div>
                                    `;
                                }
                            },
                            {
                                "data": "fecha_termino",
                                "title": "Fecha termino",
                                "orderable": false,
                                "className": "text-center",
                                "width": "10%",
                                "render": function(data, type, row) {
                                    return `
                                        <div class="fecha-selector-container">
                                            <input type="date" 
                                                class="form-control form-control-m fecha-input" 
                                                value="${data || ''}"
                                                tipo="2"
                                                data-paso-id="${row.id}"
                                                ${[3, 14].includes(row.estatus_pte) ? 'disabled' : ''}
                                                style="width: 130px; font-size: 12px;">
                                        </div>
                                    `;
                                }
                            },
                            {
                                "data": "fecha_entrega",
                                "title": "Fecha Entrega",
                                "orderable": false,
                                "className": "text-center",
                                "width": "9%",

                            },
                            {
                                "data": "comentario",
                                "title": "Comentario",
                                "width": "25%",
                                "orderable": false
                            },
                            {
                                "data": "estatus_pte_texto",
                                "title": "Estatus",
                                "orderable": false,
                                "className": "text-center",
                                "width": "10%",
                                "render": function(data, type, row) {
                                    const estatusClasses = {
                                        'PENDIENTE': 'bg-warning',
                                        'PROCESO': 'bg-primary', 
                                        'COMPLETADO': 'bg-success',
                                        'CANCELADO': 'bg-danger',
                                        'NO APLICA': 'bg-secondary'
                                    };
                                    
                                    return `
                                        <div class="dropdown">
                                            <button class="btn btn-sm ${estatusClasses[data] || 'bg-secondary'} dropdown-toggle text-white w-100" 
                                                    type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                ${data}
                                            </button>
                                            <ul class="dropdown-menu w-100">
                                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="1">PENDIENTE</a></li>
                                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="2">PROCESO</a></li>
                                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="3">COMPLETADO</a></li>
                                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="4">CANCELADO</a></li>
                                                <li><a class="dropdown-item cambiar-estatus-option" data-estatus="14">NO APLICA</a></li>
                                            </ul>
                                            <input type="hidden" class="paso-id" value="${row.id}">
                                        </div>
                                    `;
                                }
                            },
                            {
                                "data": null,
                                "title": "Opciones",
                                "class": "text-center",
                                "width": "120px",
                                "orderable": false,
                                "render": function(data, type, row) {
                                    if (row.archivo && row.archivo.trim() !== '') {
                                        const urlCodificada = encodeURI(row.archivo);
                                        const archivoAcortado = row.archivo.length > 30 ? 
                                            row.archivo.substring(0, 30) + '...' : row.archivo;
                                            
                                        return `
                                            <a class="table-icon ver-archivo" 
                                                title="Cambiar archivo" 
                                                data-id="${row.id}">
                                                <i class="fas fa-upload text-secondary"></i>
                                            </a>
                                            <a class="table-icon ver-archivo-externo" 
                                                href="${urlCodificada}" 
                                                target="_blank" 
                                                title="Abrir: ${archivoAcortado}"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-id="${row.id}">
                                                    <i class="fas fa-eye text-success"></i>
                                            </a>
                                        `;
                                    } else {
                                        // Si no tiene archivo, mostrar solo ícono de subir
                                        return `
                                            <a class="table-icon ver-archivo" title="Subir archivo" data-id="${row.id}">
                                                <i class="fas fa-upload"></i>
                                            </a>
                                        `;
                                    }
                                }
                            }
                        ]
                    });
                    
                    tr.addClass('shown-subpaso');
                }
            });
            tr.addClass('shown');
        }
    });

    // Búsqueda por Enter
    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaPte.draw();
        }
    });

    // Mover select de length
    $("#tabla_length").detach().appendTo("#select-length");

    // Panel de filtros
    $("#btn-panel-filtros").on("click", function () {
        // Mostrar el offcanvas de Bootstrap
        var filtrosOffcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        filtrosOffcanvas.show();
        cargarResponsablesProyectoModal();
    });

    // Aplicar filtros
    $("#aplicar-filtros").on("click", function () {
        // Obtener valores de los filtros
        var estatus = $("#estatus").val();
        var tipo = $("#tipo").val();
        var responsable = $("#id_responsable_proyecto").val();
        
        // Aplicar filtros a la DataTable
        tablaPte.draw();
        
        // Cerrar el panel
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
    });

    // Limpiar filtros
    $("#limpiar-filtros").on("click", function () {
        // Limpiar todos los selects
        $("#estatus").val("");
        $("#tipo").val("");
        $("#id_responsable_proyecto").val("");
        $("#anio").val("");
        
        // Redibujar la tabla sin filtros
        tablaPte.draw();
        
        // Cerrar el panel (opcional)
        var filtrosOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        filtrosOffcanvas.hide();
        iniciarLoader();
        setTimeout(function() {
            finalizarLoader();
        }, 1300);
    });

    // Abrir modal para crear PTE
    $(document).on("click", ".crear-pte", function() {
        abrirModalCrearPTE();
    });

    // Evento para editar PTE
    $("#tabla tbody").on("click", ".editar_pte", function() {
        const pteId = $(this).data('id');
        abrirModalEditarPTE(pteId);
    });

    // Función para abrir modal de edición
    function abrirModalEditarPTE(pteId) {
        $("#formCrearPTE")[0].reset();
        $("#modalCrearPTELabel").text("Editar PTE");
        // Obtener datos del PTE
        BMAjax(
            urlObtenerDatos, {id:pteId}, "GET")
            .done(function(datos) {
                iniciarLoader();
                const pte = datos.datos;
                // Llenar formulario con datos existentes
                $("#pte_id").val(pte.id);
                $("#oficio_pte").val(pte.oficio_pte);
                $("#oficio_solicitud").val(pte.oficio_solicitud);
                $("#descripcion_trabajo").val(pte.descripcion_trabajo);
                $("#fecha_solicitud").val(pte.fecha_solicitud);
                $("#plazo_dias").val(pte.plazo_dias);
                $("#id_tipo").val(pte.id_tipo);
                $("#total_homologado").val(pte.total_homologado);
                $("#oficio_ot").val(pte.id_orden_trabajo);
                $("#comentario_general").val(pte.comentario);
                $("#fecha_entrega").val(pte.fecha_entrega);
                $("#id_prioridad").val(pte.id_prioridad);
                cargarResponsablesProyecto().done(function() {
                    $("#responsable_proyecto").val(pte.id_responsable_proyecto);
                });

                setTimeout(function() {
                    finalizarLoader();
                    REGISTRO_ACTIVIDAD.registra_actuales("#formCrearPTE");
                    REGISTRO_ACTIVIDAD.actualiza_registro_id(pte.id);
                }, 1500);
                // Mostrar modal
                const modal = new bootstrap.Modal(document.getElementById('modalCrearPTE'));
                modal.show();
            })
            .fail(function() {
                aviso("error", {
                    contenido: "Error al cargar los datos de la PTE",
                });
            });
    }

    // Función modificada para aceptar datos del paso
    function abrirModalSubirArchivo(datosPaso = null) {
        const modal = new bootstrap.Modal(document.getElementById('modalSubirArchivo'));
        const enlaceInput = document.getElementById('enlaceArchivo');
        
        if (datosPaso) {
            if (datosPaso.archivo) {
                enlaceInput.value = datosPaso.archivo;
            } else {
                enlaceInput.value = '';
            }

            window.pasoActual = datosPaso;
        } else {
            enlaceInput.value = '';
            window.pasoActual = null;
        }
        
        modal.show();
        setTimeout(() => {
            enlaceInput.focus();
        }, 500);
    }

    function abrirModalCrearPTE() {
        $("#formCrearPTE")[0].reset();
        $("#pte_id").val('');
        $("#modalCrearPTELabel").text("Crear Nueva PTE");
        $("#btnGuardarPTE").html('Guardar PTE');
        const today = new Date().toISOString().split('T')[0];
        $("#fecha_solicitud").val(today);
        
        // Cargar lista de lideres
        cargarResponsablesProyecto();
        
        const modal = new bootstrap.Modal(document.getElementById('modalCrearPTE'));
        modal.show();
    }

    // Función para cargar responsables de proyecto
    function cargarResponsablesProyecto() {
        return $.ajax({
            url: urlObtenerResponsables,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const select = $('#responsable_proyecto');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un responsable</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(responsable) {
                        select.append(`<option value="${responsable.id}">${responsable.descripcion}</option>`);
                    });
                } else {
                    select.append('<option value="" disabled>No hay responsables disponibles</option>');
                }
            },
            error: function(xhr, status, error) {
                const select = $('#responsable_proyecto');
                select.empty().append('<option value="" disabled>Error al cargar responsables</option>');
            }
        });
    }
    
    function cargarResponsablesProyectoModal() {
        return $.ajax({
            url: urlObtenerResponsables,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                const select = $('#id_responsable_proyecto');
                select.empty();
                select.append('<option value="" selected disabled>Seleccione un responsable</option>');
                
                if (data && data.length > 0) {
                    data.forEach(function(responsable) {
                        select.append(`<option value="${responsable.id}">${responsable.descripcion}</option>`);
                    });
                } else {
                    select.append('<option value="" disabled>No hay responsables disponibles</option>');
                }
            },
            error: function(xhr, status, error) {
                const select = $('#id_responsable_proyecto');
                select.empty().append('<option value="" disabled>Error al cargar responsables</option>');
            }
        });
    }

    $("#btnGuardarPTE").off('click').on("click", function() {
        const pteId = $("#pte_id").val();
        const formData = new FormData($("#formCrearPTE")[0]);
        
        // Agregar el ID si estamos editando
        if (pteId) {
            formData.append('id', pteId);
        }
        
        if (!formData.get('responsable_proyecto')) {
            aviso("advertencia", "El responsable del proyecto es obligatorio");
            $("#responsable_proyecto").focus();
            return;
        }
        
        // Mostrar loading
        const btn = $(this);
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Guardando...');
        
        // Determinar URL y método
        const url = pteId ? urlEditarPTE : urlCrearPTE;
        const method = "POST";
        
        REGISTRO_ACTIVIDAD._evento = pteId ? "MODIFICAR" : "CREAR";
        if (REGISTRO_ACTIVIDAD._evento=="MODIFICAR"){
            REGISTRO_ACTIVIDAD.detecta_cambios("#formCrearPTE");
            const agrega_detalle = e => ({...e, detalle: `de la PTE: <b>${$("#oficio_pte").val()}</b>`});
            REGISTRO_ACTIVIDAD.transforma_cambios(agrega_detalle);
            formData.append('registro_actividad', JSON.stringify(REGISTRO_ACTIVIDAD.actividad));
        }else{
            REGISTRO_ACTIVIDAD._cambios = [];
            REGISTRO_ACTIVIDAD.agregar_actividad({
                nombre:"Creó",
                valor_actual:"",
                valor_anterior:"",
                detalle:` ${$("#id_tipo option:selected").text()} con folio: ${$("#oficio_pte").val()}`
            })
            formData.append('registro_actividad', JSON.stringify(REGISTRO_ACTIVIDAD.actividad));
        }   

        // Enviar datos
        $.ajax({
            url: url,
            type: method,
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.exito) {
                    aviso(response.tipo_aviso, response.detalles);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearPTE'));
                    modal.hide();
                    tablaPte.ajax.reload();
                } else {
                    aviso(response.tipo_aviso, response.detalles);
                }
            },
            error: function(xhr, status, error) {
                aviso("error", "Error al guardar el PTE");
            },
            complete: function() {
                btn.prop('disabled', false).html(originalText);
            }
        });
    });
    // Resetear modal cuando se cierre
    $('#modalCrearPTE').on('hidden.bs.modal', function () {
        $("#formCrearPTE")[0].reset();
        $("#pte_id").val('');
        $("#modalCrearPTELabel").text("Crear Nueva PTE");
        $("#btnGuardarPTE").html('Guardar PTE');
    });

    
    $(document).on("click", ".eliminar_pte", function () {
        const id = $(this).data('id');
        let datos = tablaPte.row($(this).parents('tr')).data();
        BMensaje({
            titulo: "Confirmación",
            subtitulo: "¿Estás seguro de eliminar esta PTE?",
            botones: [
                {
                    texto: "Sí, continuar",
                    clase: "btn-primary",
                    funcion: function() {
                        let log = new RegistroActividad(0,datos.id,"ELIMINAR");
                        log.agregar_actividad({
                            nombre:"Eliminó",
                            valor_actual:"",
                            valor_anterior:"",
                            detalle:`${datos.descripcion_tipo} con folio: ${datos.oficio_pte}`})

                        const url = urlEliminarPTE;
                        const method = "POST";
                        BMAjax(
                            url, 
                            { 
                                id: id,
                                registro_actividad: JSON.stringify(log.actividad),
                            },
                            method
                        ).done(function(response) {
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

    // Evento para crear OTE desde PTE
    $(document).on("click", ".crear-ot", function () {
        const pteId = $(this).data('id');
        let datos = tablaPte.row($(this).parents('tr')).data();

        BMensaje({
            titulo: "Crear Orden de Trabajo",
            subtitulo: `
                <div class="mb-3">
                    <p>¿Desea crear una Orden de Trabajo a partir de esta PTE?</p>
                    <label for="folioOT" class="form-label">Folio de la OT:</label>
                    <input type="text" class="form-control" id="folioOT" placeholder="Ingrese el folio de la OT" required>
                </div>
            `,
            botones: [
                {
                    texto: "Crear OT",
                    clase: "btn-primary",
                    funcion: function() {
                        const folioOT = $('#folioOT').val().trim();
                        
                        if (!folioOT) {
                            aviso("advertencia", "El folio de la OT es obligatorio");
                            return;
                        }
                        
                        const url = urlCrearOT;
                        const method = "POST";
                        
                        let log = new RegistroActividad(4,null,"CREAR");
                        log.agregar_actividad({
                            nombre:"Creó",
                            valor_actual:"",
                            valor_anterior:"",
                            detalle:`una Orden de Trabajo con folio: <b>${folioOT}</b> a partir de la PTE: <b>${datos.oficio_pte}</b>`})  

                        BMAjax(
                            url, 
                            { 
                                pte_id: pteId,
                                folio: folioOT,
                                registro_actividad: JSON.stringify(log.actividad),
                                csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
                            },
                            method
                        ).done(function(response) {
                            if (response.exito) {
                                tablaPte.ajax.reload();
                            } else {
                                aviso(response.tipo_aviso, response.detalles);
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

// Funcion para guardar el archivo
function guardarEnlaceArchivo() {
    const enlace = $('#enlaceArchivo').val().trim();
    
    if (!enlace) {
        aviso("advertencia", "Por favor ingresa un enlace válido");
        $('#enlaceArchivo').focus();
        return;
    }
    
    // Validación de URL
    if (!enlace.startsWith('http://') && !enlace.startsWith('https://')) {
        aviso("advertencia", "La URL debe comenzar con http:// o https://");
        $('#enlaceArchivo').focus();
        $('#enlaceArchivo').select();
        return;
    }
    
    if (window.pasoActual) {
        $.ajax({
            url: urlGuardarArchivo,
            method: "POST",
            data: {
                csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
                paso_id: window.pasoActual.id,
                archivo: enlace
            },
            success: function(response) {
                if (response.exito) {
                    aviso("exito", "Archivo guardado correctamente");
                    $('#modalSubirArchivo').modal('hide');
                    window.pasoActual = null;
                    console.log(window.tablaDetalleActiva)
                    if (window.tablaDetalleActiva) {
                        window.tablaDetalleActiva.ajax.reload(null, false);
                        window.tablaDetalleActiva = null; // Limpiar referencia
                    }
                } else {
                    aviso("error", response.message || "Error al guardar el archivo");
                }
            },
            error: function() {
                aviso("error", "Error al guardar el archivo");
            }
        });
    }
}

// Función para generar HTML de la tabla de detalles
function fnHTMLTablaDetallePTE(pteId) {
    return `
        <div class="detalle-pte-content">
            <h6 class="mb-3">Detalles de la PTE - Pasos del proceso</h6>
            <table id="tabla-detalle-pte_${pteId}" class="table table-sm table-bordered">
            </table>
        </div>
    `;
}

// Función para generar HTML de la tabla de subpasos
function fnHTMLTablaSubpasos(pteId) {
    return `
        <div class="detalle-subpaso-content">
            <h6 class="mt-2">Detalles de volumetría</h6>
            <table id="tabla-subpasos_${pteId}" class="table table-sm table-bordered">
            </table>
        </div>
    `;
}

// Función para actualizar estatus
function actualizarEstatusEnTiempoReal(dropdownButton, nuevoTexto, nuevoEstatus, fechaInputId, comentarioInputId) {
    const estatusClasses = {
        'PENDIENTE': 'bg-warning',
        'PROCESO': 'bg-primary', 
        'COMPLETADO': 'bg-success',
        'CANCELADO': 'bg-danger',
        'NO APLICA': 'bg-secondary'
    };
    
    // Actualizar el botón
    dropdownButton.removeClass('bg-warning bg-primary bg-success bg-danger bg-secondary')
                    .addClass(estatusClasses[nuevoTexto] || 'bg-secondary')
                    .text(nuevoTexto);

    // Buscar columnas dinámicamente
    const tr = dropdownButton.closest('tr');
    const table = tr.closest('table');
    const headers = table.find('> thead > tr > th'); 
    const tds = tr.find('> td'); 

    let fechaEntregaCell = null;
    let comentarioCell = null;

    // Buscar por texto del header
    headers.each(function(index) {
        const headerText = $(this).text().trim().toLowerCase();
        if (headerText.includes('fecha entrega')) {
            fechaEntregaCell = tds.eq(index);
            
        } else if (headerText.includes('comentario')) {
            comentarioCell = tds.eq(index);
        }
    });

    // Actualizar fecha si es COMPLETADO
    if (nuevoEstatus == '3' && fechaEntregaCell) {
        const fechaInput = $(`#${fechaInputId}`);
        if (fechaInputId) {
            // Convertir de YYYY-MM-DD a DD/MM/YYYY
            const parts = fechaInputId.split('-');
            if (parts.length === 3) {
                const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
                fechaEntregaCell.text(fechaFormateada);
            } else {
                fechaEntregaCell.text(fechaInputId);
            }
        } else {
            // Si no hay fecha en el input pero es paso 4, mostrar input de fecha
            const rowData = table.DataTable().row(tr).data();
            if (rowData && rowData.orden == 4) {
                fechaEntregaCell.html(`
                    <input type="date" 
                        class="form-control form-control-sm fecha-input" 
                        data-paso-id="${rowData.id}"
                        tipo="3"
                        style="width: 130px; font-size: 12px;"
                        value="">
                `);
            }
        }
    } else if (fechaEntregaCell) {
        // Si no es estatus 3, limpiar la fecha
        fechaEntregaCell.text('');
    }

    const inputsFecha = tr.find('.fecha-input');
    if (inputsFecha.length) {
        if ([3, 14].includes(nuevoEstatus)) {
            // Si el nuevo estatus es COMPLETADO o NO APLICA, deshabilitar los inputs
            inputsFecha.prop('disabled', true);
        } else {
            // Si cambia a otro estatus, habilitar los inputs
            inputsFecha.prop('disabled', false);
        }
    }
    
    // Actualizar comentario
    if (comentarioInputId && comentarioCell) {
        comentarioCell.text(comentarioInputId);
    }
}
// Función para actualizar progreso del paso 4
function actualizarProgresoPaso4(pteId, tablaDetallePTE) {
    BMAjax(
        urlObtenerProgresoPaso4,
        { pte_header_id: pteId },
        "GET"
    ).done(function(response) {
        if (response.exito) {
            // Buscar y actualizar la fila del paso 4
            tablaDetallePTE.rows().every(function() {
                const data = this.data();
                if (data.orden == 4) {
                    // Actualizar los datos de la fila
                    data.progreso_subpasos = response.progreso;
                    data.subpasos_completados = response.subpasos_completados;
                    data.total_subpasos = response.total_subpasos;
                    
                    // Redibujar la fila
                    this.invalidate();
                    actualizarProgresoGeneralPTE(pteId);
                    return false; // Salir del loop
                }
            });
        }
    });
}

// Función para actualizar progreso general de la PTE
function actualizarProgresoGeneralPTE(pteId) {
    BMAjax(
        urlObtenerProgresoGeneralPTE,
        { pte_id: pteId },
        "GET"
    ).done(function(response) {
        if (response.exito) {
            // Buscar la fila de la PTE en la tabla principal y actualizar
            tablaPte.rows().every(function() {
                const rowData = this.data();
                if (rowData.id == pteId) {
                    // Actualizar los datos en la fila
                    rowData.progreso = response.progreso;
                    rowData.pasos_completados = response.pasos_completados;
                    rowData.total_pasos = response.total_pasos;
                    
                    // Actualizar la fila en la tabla
                    this.data(rowData).invalidate();
                    return false; // Salir del loop
                }
            });
        }
    }).fail(function() {
        return false;
    });
}

// Función para actualizar estatus de PTE 
function actualizarEstatusPTEEnTiempoReal(dropdownButton, nuevoTexto, nuevoEstatus) {
    const estatusClasses = {
        'PENDIENTE': 'bg-warning',
        'PROCESO': 'bg-primary', 
        'ENTREGADA': 'bg-success',
        'CANCELADA': 'bg-danger',
        'DESCONOCIDO': 'bg-secondary'
    };
    
    // Actualizar el botón
    dropdownButton.removeClass('bg-warning bg-primary bg-success bg-danger bg-secondary')
                    .addClass(estatusClasses[nuevoTexto] || 'bg-secondary')
                    .text(nuevoTexto);

    // Buscar columna de fecha de entrega dinámicamente
    const tr = dropdownButton.closest('tr');
    const tds = tr.find('td');
    const table = tr.closest('table');
    const headers = table.find('th');
    let fechaEntregaCell = tds.eq(4);;
    if (nuevoEstatus == '3' && fechaEntregaCell) {
        const fechaInput = $(`#fechaEntregaPte`);
        if (fechaInput.length && fechaInput.val()) {
            // Convertir de YYYY-MM-DD a DD/MM/YYYY
            const fecha = fechaInput.val();
            const parts = fecha.split('-');
            if (parts.length === 3) {
                const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
                fechaEntregaCell.text(fechaFormateada);
            } else {
                fechaEntregaCell.text(fecha);
            }
        }
    } else {
            fechaEntregaCell.text('');
        }
}