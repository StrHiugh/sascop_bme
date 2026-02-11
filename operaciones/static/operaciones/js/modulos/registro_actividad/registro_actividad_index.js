$(document).ready(function () {
    window.tablaRegistroActividad = $("#tabla").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        order: [[4, "desc"]],
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
            data: function (d) {
                d.filtro = $("#filtro-buscar").val();
                d.usuario_id = $("#filtro-usuario").val();
                d.evento = $("#filtro-evento").val();
                d.afectacion = $("#filtro-afectacion").val();
                d.fecha = $("#filtro-fecha").val();
            }
        },
        columns: [
            {
                "data": "id",
                "title": "ID",
                "orderable": true,
                "visible": false
            },
            {
                "data": "afectacion",
                "title": "Afectación en",
                "orderable": true,
                render: (data, type, row) =>  `
                    <div>
                        <strong>${data}</strong>
                    </div>
                `
            },
            {
                "data": "evento",
                "title": "Evento",
                "orderable": true,
                "className": "text-center",
                "render": function(data, type, row) {
                    const eventoColors = {
                        'CREAR': '#95c93d',       
                        'MODIFICAR': '#fad91f',   
                        'ELIMINAR': '#f05523',    
                        'ACTUALIZAR': '#55c0e9',  
                        'REGISTRAR': '#55c0e9'    
                    };
                    
                    const color = eventoColors[data] || '#54565a';
                    
                    return `<span class="badge text-white" style="background-color: ${color};">${data}</span>`;
                }
            },
            {
                "data": "fecha_formateada",
                "title": "Fecha",
                "orderable": true,
                "className": "text-center",
                "width": "150px"
            },
            {
                "data": "nombre_completo",
                "title": "Usuario",
                "orderable": true,
                render: (data, type, row) =>  `
                    <div>
                        <div>
                            <strong>${data}</strong>
                        </div>
                        <span class="text-muted">${row.email}</span>
                    </div>
                `
            },
            {
                "data": null,
                "title": "Descripción",
                "orderable": false,
                "width": "40%",
                render: fnFormatDescripcion
            },
        ],
        drawCallback: function (settings) {
            $("[data-toggle='tooltip']").tooltip();
            
            $("#tabla").off('click', '.ver-detalle').on('click', '.ver-detalle', function() {
                const registroId = $(this).data('id');
                verDetalleRegistro(registroId);
            });
            
            $("#tabla").off('click', '.descargar-registro').on('click', '.descargar-registro', function() {
                const registroId = $(this).data('id');
                descargarRegistro(registroId);
            });
        }
    });
    cargarUsuarios();
    $("#filtro-buscar").keypress(function (event) {
        if (event.which == 13) {
            tablaRegistroActividad.ajax.reload();
        }
    });

    $("#tabla_length").detach().appendTo("#select-length");

    $("#btn-panel-filtros").on("click", function () {
        const offcanvas = new bootstrap.Offcanvas(document.getElementById('panelFiltros'));
        offcanvas.show();
    });
    
    $("#aplicar-filtros").on("click", function () {
        tablaRegistroActividad.ajax.reload();
        const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('panelFiltros'));
        offcanvas.hide();
    });

    $("#limpiar-filtros").on("click", function () {
        $("#form-filtros")[0].reset();
        tablaRegistroActividad.ajax.reload();
    });

});

function cargarUsuarios() {
    return $.ajax({
        url: urlObtenerUsuarios,
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            const select = $('#filtro-usuario');
            select.empty();
            select.append('<option value="" selected disabled>Seleccione un usuario</option>');
            
            if (data && data.length > 0) {
                data.forEach(function(usuario) {
                    select.append(`<option value="${usuario.id}">${usuario.first_name}</option>`);
                });
            } else {
                select.append('<option value="" disabled>No hay usuarios disponibles</option>');
            }
        },
        error: function(xhr, status, error) {
            const select = $('#filtro-usuario');
            select.empty().append('<option value="" disabled>Error al cargar usuarios</option>');
        }
    });
}

function verDetalleRegistro(registroId) {
}

function descargarRegistro(registroId) {
}