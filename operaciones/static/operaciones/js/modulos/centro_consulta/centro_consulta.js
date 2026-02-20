/* static/operaciones/js/modulos/centro_consulta/centro_consulta.js */

const fnBadgeTipo = (tipo) => {
   const claseMapa = {
      "OT": "badge-tipo-ot",
      "PTE": "badge-tipo-pte",
      "PROD": "badge-tipo-prod"
   };
   const claseColor = claseMapa[tipo] ? claseMapa[tipo] : "badge-tipo-default";
   return `<span class="badge-tipo ${claseColor}">${tipo}</span>`;
};

const fnCeldaFolio = (fila) => {
   return `
      <div class="celda-contenedor">
         <div class="texto-principal">${fila.folio}</div>
         <div class="texto-secundario">${fila.cliente}</div>
      </div>`;
};

const fnCeldaMeta = (fila) => {
   const liderAsignado = fila.lider ? fila.lider : "Sin Líder";
   const frenteAsignado = fila.frente ? `Frente: ${fila.frente}` : `Cliente: ${fila.cliente}`;
   const htmlSitio = fila.sitio ? `<div class="meta-sitio"><i class="fas fa-map-marker-alt"></i>${fila.sitio}</div>` : "";
   return `
      <div class="celda-contenedor">
         <div class="texto-lider">${liderAsignado}</div>
         <div class="texto-secundario">${frenteAsignado}</div>
         ${htmlSitio}
      </div>
   `;
};

const fnFormatFecha = (cadenaFecha) => {
   const esInvalida = (!cadenaFecha || cadenaFecha === "NO ENTREGADO") ? true : false;
   if (esInvalida) return "—";
   if (cadenaFecha.includes("/")) {
      const partesFecha = cadenaFecha.split("/");
      if (partesFecha.length === 3) {
         const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
         const indiceMes = parseInt(partesFecha[1]) - 1;
         return `${partesFecha[0]}/${meses[indiceMes]}/${partesFecha[2]}`;
      }
   }
   return cadenaFecha;
};

const fnCeldaAccion = (fila) => {
   const clasesFlex = "d-inline-flex align-items-center justify-content-center gap-1";
   const estiloBadge = "font-size: 0.75rem; min-width: 90px; padding: 5px 8px;";

   const tieneArchivo = (fila.archivo !== "Sin archivo" && fila.archivo.trim() !== "") ? true : false;

   if (tieneArchivo) {
      const esDescarga = /\.(xlsx|xls|csv|zip)$/i.test(fila.archivo);
      const iconoArchivo = esDescarga ? "fa-download" : "fa-eye";
      const textoEtiqueta = esDescarga ? "Bajar" : "Ver";
      const atributosEnlace = esDescarga ? "download" : "target=\"_blank\"";
      return `<a href="${fila.archivo}" ${atributosEnlace} class="btn-accion-tabla activo text-decoration-none ${clasesFlex}">
                  <i class="fas ${iconoArchivo}"></i>${textoEtiqueta}
               </a>`;
   }

   const esNoAplica = (fila.estatus_paso_id == 14) ? true : false;

   if (esNoAplica) {
      return `<span class="badge bg-secondary text-white fw-normal ${clasesFlex}" style="${estiloBadge}">
                  <i class="fas fa-ban" style="font-size: 0.7rem;"></i>No aplica
               </span>`;
   }

   return `<span class="badge bg-transparent border text-muted fw-normal ${clasesFlex}" style="${estiloBadge} color: #54565a !important; border-color: #ccc !important;">
               <i class="fas fa-clock" style="font-size: 0.7rem;"></i>Pendiente
            </span>`;
};

const fnEstadoInicialPanel = () => {
   $("#fecha_inicio").val("");
   $("#fecha_fin").val("");
   $("input[name=\"origen\"]").prop("checked", false);
   $("#chk_entregados").prop("checked", false);
   $("#chk_pendientes").prop("checked", false);
   $("#chk_buscar_por_frente").prop("checked", false);
   $(".select2, .form-select").val(null).trigger("change");
   $("#filtro-buscar").val("");
   $("#filtro-sitio").empty().append("<option value=\"\">Seleccione un frente...</option>").trigger("change");

   const validator = $("#form-filtros-bi").data("validator");
   if (validator) {
      validator.resetForm();
      $(".group-checkboxes").removeClass("border border-danger rounded p-1");
      $(".origen-error").remove();
   }
   fnGestionarVisibilidadUbicacion();
};

const fnObtenerFiltrosEstaticos = () => {
   const fechaActual = new Date();
   const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
   const fnFormatear = (fecha) => fecha.toISOString().split("T")[0];

   return {
      "origenes": [],
      "check_entregados": false,
      "check_no_entregados": false,
      "fecha_inicio": fnFormatear(primerDiaMes),
      "fecha_fin": fnFormatear(fechaActual),
      "lider_id": null,
      "cliente_id": null,
      "frente_id": null,
      "id_sitio": null,
      "buscar_por_frente": "0",
      "texto_busqueda": "",
      "nombre_documento": null,
      "estatus_proceso": null
   };
};

const fnObtenerFiltrosActuales = () => {
   const itemsOrigenes = $("input[name=\"origen\"]:checked");
   const listaOrigenes = itemsOrigenes.length > 0 ? itemsOrigenes.map(function () { return $(this).val(); }).get() : [];
   const esBusquedaPorFrente = $("#chk_buscar_por_frente").is(":checked") ? "1" : "0";

   return {
      "origenes": listaOrigenes,
      "check_entregados": $("#chk_entregados").is(":checked"),
      "check_no_entregados": $("#chk_pendientes").is(":checked"),
      "fecha_inicio": $("#fecha_inicio").val(),
      "fecha_fin": $("#fecha_fin").val(),
      "lider_id": $("#filtro-lider").val(),
      "cliente_id": $("#filtro-cliente").val(),
      "frente_id": $("#filtro-frente").val(),
      "id_sitio": $("#filtro-sitio").val(),
      "buscar_por_frente": esBusquedaPorFrente,
      "texto_busqueda": $("#filtro-buscar").val(),
      "nombre_documento": $("#filtro-tipo-doc").val(),
      "estatus_proceso": $("#filtro-estatus").val()
   };
};

let filtrosActivos = {};

const fnActualizarTodo = (botonEjecutar = null) => {
   const textoOriginal = botonEjecutar ? botonEjecutar.html() : "";

   if (botonEjecutar) {
      botonEjecutar.prop("disabled", true).html("<i class=\"fas fa-spinner fa-spin me-2\"></i>Consultando...");
   }

   const cuerpoDashboard = JSON.stringify({ "filtros": filtrosActivos });

   const peticionDashboard = $.ajax({
      url: urlObtenerDashboard,
      type: "POST",
      data: cuerpoDashboard,
      contentType: "application/json",
      headers: { "X-CSRFToken": csrfToken }
   });

   const promesaTabla = new Promise((resolver) => {
      tablaResultados.ajax.reload(() => resolver(), true);
   });

   Promise.all([peticionDashboard, promesaTabla])
      .then(respuestas => {
         const respuestaDashboard = respuestas[0];

         if (respuestaDashboard.estatus === "ok") {
            ccDashboard.actualizar(respuestaDashboard.data);
         }

         const existePanel = typeof panelFiltrosOffcanvas !== "undefined" && panelFiltrosOffcanvas ? true : false;
         if (existePanel) {
            panelFiltrosOffcanvas.hide();
         }
      })
      .catch(error => {
         console.error("Error en peticiones:", error);
         alert("Ocurrió un error al consultar el servidor.");
      })
      .finally(() => {
         if (botonEjecutar) {
            botonEjecutar.prop("disabled", false).html(textoOriginal);
         }
      });
};

const fnGestionarCargaSitios = (idFrenteSeleccionado, esJerarquia) => {
   const elementoSitio = $("#filtro-sitio");
   const mapeoIdentificadores = { "1": "3", "2": "6", "4": "7" };

   if (esJerarquia && !idFrenteSeleccionado) {
      elementoSitio.empty().append("<option value=\"\">Seleccione un frente...</option>").trigger("change");
      fnAsegurarSelect2(elementoSitio);
      return;
   }

   const idFinal = mapeoIdentificadores[idFrenteSeleccionado] ? mapeoIdentificadores[idFrenteSeleccionado] : idFrenteSeleccionado;
   const urlDestino = esJerarquia ? urlObtenerSitiosPorFrente : urlObtenerSitios;
   const datosPeticion = esJerarquia ? { "frente_id": idFinal } : {};

   $.ajax({
      url: urlDestino,
      type: "GET",
      data: datosPeticion,
      dataType: "json",
      success: function (datosBackend) {
         const primeraOpcion = elementoSitio.find("option:first").detach();
         elementoSitio.empty().append(primeraOpcion);

         const listaRespuesta = datosBackend ? datosBackend : [];
         listaRespuesta.forEach(item => {
            elementoSitio.append(`<option value="${item.id}">${item.descripcion}</option>`);
         });

         fnAsegurarSelect2(elementoSitio);
         elementoSitio.trigger("change");
      },
      error: function (peticionError) {
         console.error("Error al cargar sitios:", peticionError.statusText);
         fnAsegurarSelect2(elementoSitio);
      }
   });
};

const fnAsegurarSelect2 = (selectorElemento) => {
   const elementoVisual = $(selectorElemento);
   if (!elementoVisual.length) return;

   if (elementoVisual.hasClass("select2-hidden-accessible")) {
      elementoVisual.select2("destroy");
   }

   elementoVisual.select2({
      width: "100%",
      dropdownParent: $("#panelFiltros"),
      language: { noResults: () => "Sin resultados" }
   });
};

const fnCargarCatalogo = (urlPeticion, selectorId) => {
   const elementoSelect = $(selectorId);
   if (elementoSelect.find("option").length > 1) return;

   $.ajax({
      url: urlPeticion,
      type: "GET",
      dataType: "json",
      success: function (datosBackend) {
         const primeraOpcion = elementoSelect.find("option:first").detach();
         elementoSelect.empty().append(primeraOpcion);

         const listaRespuesta = datosBackend ? datosBackend : [];
         listaRespuesta.forEach(item => {
            elementoSelect.append(`<option value="${item.id}">${item.descripcion}</option>`);
         });

         fnAsegurarSelect2(elementoSelect);
      },
      error: function (errorPeticion) {
         console.error(`Error en catálogo:`, errorPeticion);
      }
   });
};

const fnGestionarVisibilidadUbicacion = () => {
   const requiereUbicacion = $("#orig_ot").is(":checked") ? true : false;
   const contenedorFrente = $("#filtro-frente").closest(".mb-3");
   const contenedorSitio = $("#filtro-sitio").closest(".mb-3");
   const contenedorSwitch = $("#contenedor-switch-frente");

   if (requiereUbicacion) {
      contenedorFrente.slideDown();
      contenedorSitio.slideDown();
      contenedorSwitch.slideDown();
   } else {
      contenedorFrente.slideUp();
      contenedorSitio.slideUp();
      contenedorSwitch.slideUp();

      $("#filtro-frente").val(null).trigger("change.select2");
      $("#filtro-sitio").val(null).trigger("change.select2");
      $("#chk_buscar_por_frente").prop("checked", false);
   }
};

let tablaResultados;
let panelFiltrosOffcanvas = null;

$(document).ready(function () {
   const elementoDOMPanel = document.getElementById("panelFiltros");
   fnEstadoInicialPanel();
   filtrosActivos = fnObtenerFiltrosEstaticos();
   tablaResultados = $("#tabla-resultados").DataTable({
      serverSide: true,
      processing: true,
      pageLength: 10,
      dom: '<"row"><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
      responsive: true,
      searching: false,
      lengthChange: true,
      language: {
         "lengthMenu": "_MENU_",
         "processing": "Procesando...",
         "info": "Mostrando _END_ de _TOTAL_ registros.",
         "infoEmpty": "No hay registros disponibles",
         "infoFiltered": "(filtrado de _MAX_ registros totales)",
         "emptyTable": "Ningún dato disponible en esta tabla",
         "zeroRecords": "No se encontraron resultados",
         "paginate": {
            "previous": "‹",
            "next": "›"
         }
      },
      ajax: function (parametrosDT, callbackDT) {
         const payloadPaginacion = {
            "draw": parametrosDT.draw,
            "start": parametrosDT.start,
            "length": parametrosDT.length,
            "filtros": filtrosActivos
         };

         $.ajax({
            url: urlBuscarDocumentos,
            type: "POST",
            data: JSON.stringify(payloadPaginacion),
            contentType: "application/json",
            headers: { "X-CSRFToken": csrfToken },
            success: function (respuestaServidor) {
               $("#badge-registros").text(`${respuestaServidor.recordsTotal} Registros`);
               callbackDT(respuestaServidor);
            },
            error: function (error) {
               console.error("Error en tabla:", error);
               callbackDT({ "draw": parametrosDT.draw, "recordsTotal": 0, "recordsFiltered": 0, "data": [] });
            }
         });
      },
      columns: [
         { title: "Origen", data: "tipo", width: "70px", className: "text-center align-middle", render: (datoOrigen) => fnBadgeTipo(datoOrigen) },
         { title: "Folio / Proyecto", data: null, className: "align-middle", render: (datoColumna, tipoRender, filaData) => fnCeldaFolio(filaData) },
         { title: "Metadatos (Líder/Frente)", data: null, className: "align-middle", render: (datoColumna, tipoRender, filaData) => fnCeldaMeta(filaData) },
         { title: "Documento / Entregable", data: "documento", className: "align-middle" },
         { title: "Fecha", data: "fecha", width: "100px", className: "align-middle text-nowrap", render: (datoFecha) => fnFormatFecha(datoFecha) },
         { title: "Acción", data: null, width: "70px", className: "text-center align-middle", orderable: false, render: (datoColumna, tipoRender, filaData) => fnCeldaAccion(filaData) }
      ],
      initComplete: function () {
         const contenedorSelector = $("#tabla-resultados_length").detach();
         $("#select-length").html(contenedorSelector);
         $("#select-length select").addClass("form-select form-select-sm d-inline-block w-auto mx-2");
      }
   });

   const peticionInicialDashboard = $.ajax({
      url: urlObtenerDashboard,
      type: "POST",
      data: JSON.stringify({ "filtros": filtrosActivos }),
      contentType: "application/json",
      headers: { "X-CSRFToken": csrfToken }
   });
   peticionInicialDashboard.then(res => ccDashboard.actualizar(res.data));

   if (typeof $.validator !== "undefined") {
      $.validator.addMethod("minimoUnoChecked", function () {
         return $("input[name=\"origen\"]:checked:not(:disabled)").length > 0;
      }, "Selecciona al menos un origen de datos.");
      $("#form-filtros-bi").validate({
         ignore: [],
         errorClass: "text-danger small mt-1",
         rules: {
               origen: { minimoUnoChecked: true }
         },
         errorPlacement: function (error, element) {
            if (element.attr("name") === "origen") {
               $(".origen-error").remove();
               error.addClass("origen-error text-danger small mt-1 d-block");
               $("input[name='origen']").closest(".group-checkboxes").after(error);
            } else {
               error.insertAfter(element);
            }
         },
         highlight: function (element) {
            if ($(element).attr("name") === "origen") {
               $(".group-origen").addClass("border border-danger rounded p-1");
               setTimeout(function () {
                  $("input[name='origen']").removeAttr("aria-invalid");
               }, 0);
            } else {
               $(element).addClass("is-invalid");
            }
         },
         unhighlight: function (element) {
            if ($(element).attr("name") === "origen") {
               $("input[name='origen']").removeAttr("aria-invalid");
               $(".group-origen").removeClass("border border-danger rounded p-1");
            } else {
               $(element).removeClass("is-invalid");
            }
         },
         invalidHandler: function (event, validator) {
            if (!validator.errorList.length) return;
            const firstError  = $(validator.errorList[0].element);
            const panel       = document.getElementById("panelFiltros");
            if (!panel) return;
            const panelBody   = panel.querySelector(".offcanvas-body");
            if (!panelBody) return;
            const relativePos = firstError.offset().top
               - $(panelBody).offset().top
               + panelBody.scrollTop;
            $(panelBody).animate({ scrollTop: relativePos - 20 }, 500);
         }
      });
   }

   if (elementoDOMPanel) {
      panelFiltrosOffcanvas = new bootstrap.Offcanvas(elementoDOMPanel);
      $("#btn-panel-filtros").on("click", function (eventoClick) {
         eventoClick.preventDefault();
         fnCargarCatalogo(urlObtenerResponsables, "#filtro-lider");
         fnCargarCatalogo(urlObtenerClientes, "#filtro-cliente");
         fnCargarCatalogo(urlObtenerFrentes, "#filtro-frente");
         fnCargarCatalogo(urlObtenerEstatus, "#filtro-estatus");
         fnCargarCatalogo(urlObtenerTiposDoc, "#filtro-tipo-doc");
         const opcionesSitio = $("#filtro-sitio option").length;
         if (opcionesSitio <= 1) {
            if (!$("#chk_buscar_por_frente").is(":checked")) fnGestionarCargaSitios(null, false);
         }
         panelFiltrosOffcanvas.show();
      });
   }

   $("#filtro-frente").on("change", function () {
      const valorFrente = $(this).val();
      const usaJerarquia = $("#chk_buscar_por_frente").is(":checked");
      $("#filtro-sitio").empty().append("<option value=\"\">Actualizando...</option>").trigger("change");

      if (usaJerarquia) {
         if (valorFrente) {
            fnGestionarCargaSitios(valorFrente, true);
         } else {
            $("#filtro-sitio").empty().append("<option value=\"\">Seleccione un frente...</option>").trigger("change");
            fnAsegurarSelect2($("#filtro-sitio"));
         }
      } else {
         fnGestionarCargaSitios(null, false);
      }
   });

   $("#chk_buscar_por_frente").on("change", function () {
      const usaJerarquia = $(this).is(":checked");
      const selectorFrente = $("#filtro-frente");
      const contenedorJerarquia = selectorFrente.closest(".mb-3");
      $("#filtro-sitio").empty().append("<option value=\"\">Actualizando...</option>").trigger("change");

      if (!usaJerarquia) {
         contenedorJerarquia.slideUp();
         selectorFrente.val(null).trigger("change.select2");
         fnGestionarCargaSitios(null, false);
      } else {
         contenedorJerarquia.slideDown();
         $("#filtro-sitio").empty().append("<option value=\"\">Seleccione un frente...</option>").trigger("change");
         fnAsegurarSelect2($("#filtro-sitio"));
      }
   });

   $("#filtro-buscar").on("keyup", function (eventoTeclado) {
      if (eventoTeclado.key === "Enter") {
         filtrosActivos = fnObtenerFiltrosActuales();
         fnActualizarTodo();
      }
   });

   $("#btn-ejecutar").on("click", function () {
      const formularioConfiguracion = $("#form-filtros-bi");
      const formularioValido = formularioConfiguracion.data("validator") ? formularioConfiguracion.valid() : true;
      if (!formularioValido) return;

      const itemsOrigenes = $("input[name=\"origen\"]:checked");
      const existenOrigenes = itemsOrigenes.length > 0 ? true : false;
      if (!existenOrigenes) {
         alert("Selecciona al menos un Origen de Datos.");
         return;
      }

      const instanciaBoton = $(this);
      filtrosActivos = fnObtenerFiltrosActuales();
      fnActualizarTodo(instanciaBoton);
   });

   $("#btn-limpiar-filtros").on("click", function () {
      fnEstadoInicialPanel();
      filtrosActivos = fnObtenerFiltrosEstaticos();
      fnActualizarTodo();
   });

   $("input[name=\"origen\"]").on("change", function () {
      fnGestionarVisibilidadUbicacion();
   });

   $("#btn-expandir-grafica").on("click", function () {
      const botonActual = $(this);
      const esModoExpandido = botonActual.find("i").hasClass("fa-compress") ? true : false;
      if (esModoExpandido) {
         $("#cc-table-card").slideDown(300);
         botonActual.html("<i class=\"fas fa-expand\"></i>");
         $("#cc-chart-main").removeClass("grafica-expandida-full");
      } else {
         $("#cc-table-card").slideUp(300);
         botonActual.html("<i class=\"fas fa-compress\"></i>");
         $("#cc-chart-main").addClass("grafica-expandida-full");
      }
      setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
   });

   $("#btn-expandir-tabla").on("click", function () {
      const botonActual = $(this);
      const esModoExpandido = botonActual.find("i").hasClass("fa-compress") ? true : false;
      if (esModoExpandido) {
         $("#cc-chart-card").slideDown(300);
         botonActual.html("<i class=\"fas fa-expand\"></i>");
         $("#cc-table-card").removeClass("tabla-expandida-full");
      } else {
         $("#cc-chart-card").slideUp(300);
         botonActual.html("<i class=\"fas fa-compress\"></i>");
         $("#cc-table-card").addClass("tabla-expandida-full");
      }
      setTimeout(() => {
         if (tablaResultados) tablaResultados.columns.adjust().responsive.recalc();
      }, 350);
   });
});