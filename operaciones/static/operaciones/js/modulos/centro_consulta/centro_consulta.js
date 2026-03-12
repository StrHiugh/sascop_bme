const fnFormatearFecha = (fecha) => {
   const anio = fecha.getFullYear();
   const mes = String(fecha.getMonth() + 1).padStart(2, "0");
   const dia = String(fecha.getDate()).padStart(2, "0");
   return `${anio}-${mes}-${dia}`;
};

const fnObtenerFiltrosEstaticos = () => {
   return {
      "origenes": ["PTE", "OT", "PROD"],
      "check_entregados": false,
      "check_no_entregados": false,
      "fecha_inicio": "",
      "fecha_fin": "",
      "lideres_id": [],
      "clientes_id": [],
      "frentes_id": [],
      "sitios_id": [],
      "nombres_doc": [],
      "estatus_proceso_id": [],
      "buscar_por_frente": "0",
      "texto_busqueda": ""
   };
};

const fnObtenerFiltrosEstaticosInfo = () => {
   return {
      "ots_id":        [],
      "tipos_tiempo":  ["TE", "CMA"],
      "anexos":        [],
      "clientes_id":   [],
      "lideres_id":    [],
      "fecha_inicio":  "",
      "fecha_fin":     "",
      "es_excedente":  null,
      "texto_busqueda": ""
   };
};

const fnEstadoInicialPanel = () => {
   const filtrosPorDefecto = fnObtenerFiltrosEstaticos();

   $("#fecha_inicio").val("");
   $("#fecha_fin").val("");

   $("input[name=\"origen\"]").prop("checked", false);
   $("#orig_pte").prop("checked", true);
   $("#orig_ot").prop("checked", true);
   $("#chk_entregados").prop("checked", true);
   $("#chk_pendientes").prop("checked", true);
   $("#chk_buscar_por_frente").prop("checked", true);

   $(".select2, .form-select").val(null).trigger("change");
   $("#filtro-buscar").val("");
   $("#filtro-sitio").empty().trigger("change");

   $("#orig_pro").prop("checked", true);
   const modoAntes = $("input[name='prod_tabs']:checked").val();
   if (modoAntes !== "informacion") {
      $("input[name='prod_tabs'][value='documentacion']").prop("checked", true);
   }
   $("#filtro-ot").val(null).trigger("change");
   $("#filtro-anexo").val(null).trigger("change");
   $("#chk_tipo_normal").prop("checked", true).prop("disabled", false);
   $("#chk_tipo_extraordinario").prop("checked", true).prop("disabled", false);
   $("#chk_excedentes").prop("checked", false);
   $("#chk_estado_prog_ejec").prop("checked", true);
   $("#chk_estado_prog_sin_ejec").prop("checked", false);
   $("#chk_estado_ejec_sin_prog").prop("checked", true);
   const validador = $("#form-filtros-bi").data("validator");
   if (validador) {
      validador.resetForm();
      $(".group-checkboxes").removeClass("border border-danger rounded p-1");
      $(".origen-error").remove();
   }
   fnGestionarVisibilidadUbicacion();
};

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

const fnObtenerFiltrosActuales = () => {
   const itemsOrigenes = $("input[name=\"origen\"]:checked");
   const listaOrigenes = itemsOrigenes.length > 0 ? itemsOrigenes.map(function () { return $(this).val(); }).get() : [];
   const esBusquedaPorFrente = $("#chk_buscar_por_frente").is(":checked") ? "1" : "0";

   const lideresSeleccionados = $("#filtro-lider").val();
   const clientesSeleccionados = $("#filtro-cliente").val();
   const frentesSeleccionados = $("#filtro-frente").val();
   const sitiosSeleccionados = $("#filtro-sitio").val();
   const documentosSeleccionados = $("#filtro-tipo-doc").val();
   const estatusSeleccionados = $("#filtro-estatus").val();

   const otsSeleccionados = $("#filtro-ot").val();

   return {
      "origenes": listaOrigenes,
      "check_entregados": $("#chk_entregados").is(":checked"),
      "check_no_entregados": $("#chk_pendientes").is(":checked"),
      "fecha_inicio": $("#fecha_inicio").val(),
      "fecha_fin": $("#fecha_fin").val(),
      "lideres_id": lideresSeleccionados ? lideresSeleccionados : [],
      "clientes_id": clientesSeleccionados ? clientesSeleccionados : [],
      "frentes_id": frentesSeleccionados ? frentesSeleccionados : [],
      "sitios_id": sitiosSeleccionados ? sitiosSeleccionados : [],
      "nombres_doc": documentosSeleccionados ? documentosSeleccionados : [],
      "estatus_proceso_id": estatusSeleccionados ? estatusSeleccionados : [],
      "buscar_por_frente": esBusquedaPorFrente,
      "texto_busqueda": $("#filtro-buscar").val(),
      "ots_id": otsSeleccionados ? otsSeleccionados : []
   };
};

let filtrosActivos = {};


const fnActualizarPeriodo = (filtros = null) => {
   const containerPeriodo = $("#cc-periodo-container");
   const periodoTexto = $("#cc-periodo-texto");
   const tablaPeriodoTexto = $("#tabla-periodo-texto");

   const fInicio = (filtros && filtros.fecha_inicio !== undefined) ? filtros.fecha_inicio : $("#fecha_inicio").val();
   const fFin = (filtros && filtros.fecha_fin !== undefined) ? filtros.fecha_fin : $("#fecha_fin").val();

   const formatearLegible = (fechaStr) => {
      const partes = fechaStr.split("-");
      const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      return `${partes[2]}/${meses[parseInt(partes[1]) - 1]}/${partes[0]}`;
   };

   let textoFinal;
   if (fInicio && fFin) {
      textoFinal = `${formatearLegible(fInicio)} - ${formatearLegible(fFin)}`;
   } else if (fInicio) {
      textoFinal = `Desde ${formatearLegible(fInicio)}`;
   } else if (fFin) {
      textoFinal = `Hasta ${formatearLegible(fFin)}`;
   } else {
      textoFinal = "Periodo Histórico";
   }

   periodoTexto.text(textoFinal);
   tablaPeriodoTexto.text(textoFinal);
   containerPeriodo.show();
};

const fn_actualizarLabelOts = () => {
   const contenedor = $("#cc-ots-container");
   const otsData = fn_getSelect2Data("#filtro-ot");
   if (!otsData || otsData.length === 0) {
      contenedor.hide();
      return;
   }
   const textoOts = otsData.map(ot => ot.text).join(" / ");
   $("#cc-ots-texto").text(`OTs: ${textoOts}`);
   contenedor.show();
};

let modoPrevio = "documentacion";

const estadoFiltrosDoc = {
   ots: [], lideres: [], clientes: [], frentes: [], sitios: [],
   tipoDoc: [], estatus: [],
   fechaInicio: "", fechaFin: "",
   entregados: true, pendientes: true, buscarPorFrente: true, excedentes: false
};

const estadoFiltrosInfo = {
   ots: [], lideres: [], clientes: [], sitios: [],
   anexos: [], partidas: [],
   fechaInicio: "", fechaFin: "",
   tipoNormal: true, tipoExtraordinario: true, excedentes: false,
   progEjec: true, progSinEjec: false, ejecSinProg: true
};

const fn_restaurarSelect2 = (selector, items) => {
   const $el = $(selector);
   $el.val(null).trigger("change");
   (items || []).forEach(item => {
      if (!$el.find(`option[value="${item.id}"]`).length) {
         $el.append(new Option(item.text, item.id, true, true));
      } else {
         $el.find(`option[value="${item.id}"]`).prop("selected", true);
      }
   });
   $el.trigger("change");
};

const fn_getSelect2Data = (selector) => {
   const $el = $(selector);
   return ($el.length && $el.data("select2")) ? $el.select2("data") || [] : [];
};

const fn_guardarEstadoFiltros = (modo) => {
   if (modo === "documentacion") {
      estadoFiltrosDoc.ots           = fn_getSelect2Data("#filtro-ot");
      estadoFiltrosDoc.lideres       = fn_getSelect2Data("#filtro-lider");
      estadoFiltrosDoc.clientes      = fn_getSelect2Data("#filtro-cliente");
      estadoFiltrosDoc.frentes       = fn_getSelect2Data("#filtro-frente");
      estadoFiltrosDoc.sitios        = fn_getSelect2Data("#filtro-sitio");
      estadoFiltrosDoc.tipoDoc       = fn_getSelect2Data("#filtro-tipo-doc");
      estadoFiltrosDoc.estatus       = fn_getSelect2Data("#filtro-estatus");
      estadoFiltrosDoc.fechaInicio   = $("#fecha_inicio").val();
      estadoFiltrosDoc.fechaFin      = $("#fecha_fin").val();
      estadoFiltrosDoc.entregados    = $("#chk_entregados").is(":checked");
      estadoFiltrosDoc.pendientes    = $("#chk_pendientes").is(":checked");
      estadoFiltrosDoc.buscarPorFrente = $("#chk_buscar_por_frente").is(":checked");
      estadoFiltrosDoc.excedentes    = $("#chk_excedentes").is(":checked");
   } else {
      estadoFiltrosInfo.ots               = fn_getSelect2Data("#filtro-ot");
      estadoFiltrosInfo.lideres           = fn_getSelect2Data("#filtro-lider");
      estadoFiltrosInfo.clientes          = fn_getSelect2Data("#filtro-cliente");
      estadoFiltrosInfo.sitios            = fn_getSelect2Data("#filtro-sitio");
      estadoFiltrosInfo.anexos            = fn_getSelect2Data("#filtro-anexo");
      estadoFiltrosInfo.partidas          = $("#filtro-partida").val() || [];
      estadoFiltrosInfo.fechaInicio       = $("#fecha_inicio").val();
      estadoFiltrosInfo.fechaFin          = $("#fecha_fin").val();
      estadoFiltrosInfo.tipoNormal         = $("#chk_tipo_normal").is(":checked");
      estadoFiltrosInfo.tipoExtraordinario = $("#chk_tipo_extraordinario").is(":checked");
      estadoFiltrosInfo.excedentes         = $("#chk_excedentes").is(":checked");
      estadoFiltrosInfo.progEjec           = $("#chk_estado_prog_ejec").is(":checked");
      estadoFiltrosInfo.progSinEjec        = $("#chk_estado_prog_sin_ejec").is(":checked");
      estadoFiltrosInfo.ejecSinProg        = $("#chk_estado_ejec_sin_prog").is(":checked");
   }
};

const fn_restaurarEstadoFiltros = (modo) => {
   if (modo === "documentacion") {
      fn_restaurarSelect2("#filtro-ot",       estadoFiltrosDoc.ots);
      fn_restaurarSelect2("#filtro-lider",    estadoFiltrosDoc.lideres);
      fn_restaurarSelect2("#filtro-cliente",  estadoFiltrosDoc.clientes);
      fn_restaurarSelect2("#filtro-frente",   estadoFiltrosDoc.frentes);
      fn_restaurarSelect2("#filtro-sitio",    estadoFiltrosDoc.sitios);
      fn_restaurarSelect2("#filtro-tipo-doc", estadoFiltrosDoc.tipoDoc);
      fn_restaurarSelect2("#filtro-estatus",  estadoFiltrosDoc.estatus);
      $("#fecha_inicio").val(estadoFiltrosDoc.fechaInicio);
      $("#fecha_fin").val(estadoFiltrosDoc.fechaFin);
      $("#chk_entregados").prop("checked", estadoFiltrosDoc.entregados);
      $("#chk_pendientes").prop("checked", estadoFiltrosDoc.pendientes);
      $("#chk_buscar_por_frente").prop("checked", estadoFiltrosDoc.buscarPorFrente);
      $("#chk_excedentes").prop("checked", estadoFiltrosDoc.excedentes);
   } else {
      fn_restaurarSelect2("#filtro-ot",      estadoFiltrosInfo.ots);
      fn_restaurarSelect2("#filtro-lider",   estadoFiltrosInfo.lideres);
      fn_restaurarSelect2("#filtro-cliente", estadoFiltrosInfo.clientes);
      fn_restaurarSelect2("#filtro-sitio",   estadoFiltrosInfo.sitios);
      fn_restaurarSelect2("#filtro-anexo",   estadoFiltrosInfo.anexos);
      $("#filtro-partida").val(estadoFiltrosInfo.partidas).trigger("change");
      $("#fecha_inicio").val(estadoFiltrosInfo.fechaInicio);
      $("#fecha_fin").val(estadoFiltrosInfo.fechaFin);
      $("#chk_excedentes").prop("checked", estadoFiltrosInfo.excedentes);
      $("#chk_estado_prog_ejec").prop("checked", estadoFiltrosInfo.progEjec);
      $("#chk_estado_prog_sin_ejec").prop("checked", estadoFiltrosInfo.progSinEjec);
      $("#chk_estado_ejec_sin_prog").prop("checked", estadoFiltrosInfo.ejecSinProg);
      const tipoTiempoDeshabilitado = estadoFiltrosInfo.progSinEjec;
      $("#chk_tipo_normal").prop("disabled", tipoTiempoDeshabilitado).prop("checked", tipoTiempoDeshabilitado ? false : estadoFiltrosInfo.tipoNormal);
      $("#chk_tipo_extraordinario").prop("disabled", tipoTiempoDeshabilitado).prop("checked", tipoTiempoDeshabilitado ? false : estadoFiltrosInfo.tipoExtraordinario);
   }
};

const fnActualizarTodo = (botonEjecutar = null) => {
   const textoOriginal = botonEjecutar ? botonEjecutar.html() : "";
   filtrosActivos = fnObtenerFiltrosActuales();

   const tieneFechaInicio = filtrosActivos.fecha_inicio !== "" && filtrosActivos.fecha_inicio !== null;
   const tieneFechaFin = filtrosActivos.fecha_fin !== "" && filtrosActivos.fecha_fin !== null;
   if (!tieneFechaInicio) filtrosActivos.fecha_inicio = null;

   const fechaInicioLabel = filtrosActivos.fecha_inicio;
   const fechaFinLabel    = tieneFechaFin ? filtrosActivos.fecha_fin : null;

   if (!tieneFechaFin) filtrosActivos.fecha_fin = tieneFechaInicio ? fnFormatearFecha(new Date()) : null;

   fnActualizarPeriodo({ ...filtrosActivos, fecha_inicio: fechaInicioLabel, fecha_fin: fechaFinLabel });
   fn_actualizarLabelOts();

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

   const usarGrupos = fn_usarModoGrupos();
   if (usarGrupos) {
      $("#tabla-doc-wrapper").hide();
      $("#tabla-grupos-wrapper").show();
      $("#select-length").hide();
      $("#select-tamano-grupos-top").show();
   } else {
      $("#tabla-grupos-wrapper").hide();
      $("#tabla-doc-wrapper").show();
      $("#select-length").show();
      $("#select-tamano-grupos-top").hide();
   }

   const promesaTabla = usarGrupos
      ? fn_actualizarTablaGrupos(true)
      : new Promise((resolver) => {
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
      elementoSitio.empty().trigger("change");
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
let tablaProduccionInfo = null;
let tablaGrupos = null;
let panelFiltrosOffcanvas = null;
let periodoActivoInfo = null;

const fn_usarModoGrupos = () => {
   const origenes = $("input[name=\"origen\"]:checked").map(function () { return $(this).val(); }).get();
   return origenes.some(o => o === "PTE" || o === "OT" || o === "PROD");
};

const fn_celdaAccionDetalle = (fila) => {
   const clasesFlex = "d-inline-flex align-items-center justify-content-center gap-1";
   const estiloBadge = "font-size: 0.75rem; min-width: 90px; padding: 5px 8px;";
   const tieneArchivo = (fila.archivo && fila.archivo.trim() !== "") ? true : false;

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

const fn_nombreMes = (mes) => ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][mes - 1] || "Sin mes";

const fn_htmlContenedorDetalle = (idPadre, titulo = "Documentos") => {
   return `
      <div class="detalle-grupo-container p-2 ps-4" style="background-color: #f8f9fa;">
         <div class="detalle-grupo-content">
            <h6 class="mb-3">${titulo}</h6>
            <table id="tabla-detalle-${idPadre}" class="table table-sm table-bordered w-100"></table>
         </div>
      </div>`;
};

const fn_htmlContenedorMeses = (idPadre) => {
   return `
      <div class="detalle-grupo-container p-2 ps-4" style="background-color: #f8f9fa;">
         <div class="detalle-grupo-content">
            <h6 class="mb-3">Períodos de producción</h6>
            <table id="tabla-meses-${idPadre}" class="table table-sm table-bordered w-100"></table>
         </div>
      </div>`;
};

const fn_inicializarTablaDetalleDocs = (idPadre, tipo) => {
   $(`#tabla-detalle-${idPadre}`).DataTable({
      processing: true,
      serverSide: false,
      searching: true,
      paging: true,
      pageLength: 10,
      info: true,
      lengthChange: false,
      ordering: false,
      language: DT_IDIOMA,
      dom: "<\"row\"<\"col-sm-12 mb-2\"f><\"col-sm-12\"tr>><\"row\"<\"col-sm-12 col-md-6\"i><\"col-sm-12 col-md-6\"p>>",
      ajax: function (_parametros, callback) {
         $.ajax({
            url: urlDetalleGrupo,
            type: "POST",
            data: JSON.stringify({ "tipo": tipo, "id_grupo": idPadre, "filtros": filtrosActivos }),
            contentType: "application/json",
            headers: { "X-CSRFToken": csrfToken },
            success: function (respuesta) {
               callback({ data: respuesta.data || [] });
            },
            error: function () {
               callback({ data: [] });
            }
         });
      },
      columns: [
         {
            title: "Documento / Entregable", data: null, className: "align-middle",
            render: (_d, _t, fila) => {
               const docTexto = (tipo !== "PROD_MES" && fila.orden_paso && fila.orden_paso !== "0")
                  ? `${fila.orden_paso} — ${fila.documento}`
                  : fila.documento;
               return `<div class="texto-principal" style="font-size: 0.85rem;">${docTexto}</div><div class="texto-secundario">${fila._descripcion_estatus || "—"}</div>`;
            }
         },
         { title: "Fecha", data: "fecha", width: "110px", className: "align-middle text-nowrap", render: (d) => fnFormatFecha(d || "") },
         { title: "Acción", data: null, width: "90px", className: "text-center align-middle", orderable: false, render: (_d, _t, fila) => fn_celdaAccionDetalle(fila) }
      ],
      initComplete: function () {
         const tablaDetalle = this.api();
         const placeholder = "Escriba algo para filtrar...";
         $(`#tabla-detalle-${idPadre}_filter`).html(`
            <div class="input-group input-group-sm">
               <span class="input-group-text bg-light border-end-0"><i class="fas fa-search"></i></span>
               <input type="text" class="form-control border-start-0" placeholder="${placeholder}">
            </div>
         `);
         $(`#tabla-detalle-${idPadre}_filter input`).on("keyup", function () {
            tablaDetalle.search($(this).val()).draw();
         });
      }
   });
};

const fn_inicializarTablaMeses = (idPadre) => {
   const tablaMeses = $(`#tabla-meses-${idPadre}`).DataTable({
      processing: true,
      serverSide: false,
      searching: false,
      paging: false,
      info: false,
      lengthChange: false,
      language: DT_IDIOMA,
      dom: "<\"row\"<\"col-sm-12\"tr>>",
      ajax: function (_parametros, callback) {
         $.ajax({
            url: urlDetalleGrupo,
            type: "POST",
            data: JSON.stringify({ "tipo": "PROD", "id_grupo": idPadre, "filtros": filtrosActivos }),
            contentType: "application/json",
            headers: { "X-CSRFToken": csrfToken },
            success: function (respuesta) {
               callback({ data: respuesta.data || [] });
            },
            error: function () {
               callback({ data: [] });
            }
         });
      },
      columns: [
         {
            title: "Período", data: null, className: "align-middle",
            render: (_d, _t, fila) => {
               const label = (fila.mes && fila.anio) ? `${fn_nombreMes(fila.mes)} ${fila.anio}` : "Sin Fecha";
               const idMes = `${idPadre}_${fila.mes}_${fila.anio}`;
               return `<button class="btn-toggle-mes btn btn-sm p-0 me-1 text-secondary border-0 bg-transparent" data-id-padre="${idMes}" title="Expandir ${label}"><i class="fas fa-plus-square"></i></button>${label}`;
            }
         },
         {
            title: "Documentos", data: "total_docs", width: "150px", className: "align-middle text-muted",
            render: (d) => `${d} documento${d !== 1 ? "s" : ""}`
         }
      ]
   });

   $(`#tabla-meses-${idPadre}`).on("click", ".btn-toggle-mes", function () {
      const $btn      = $(this);
      const idPadreMes = $btn.data("id-padre");
      const $tr       = $btn.closest("tr");
      const $icono    = $btn.find("i");
      const filaMes   = tablaMeses.row($tr);

      if (filaMes.child.isShown()) {
         const $tablaDocsMes = $(`#tabla-detalle-${idPadreMes}`);
         if ($tablaDocsMes.length && $.fn.DataTable.isDataTable($tablaDocsMes)) {
            $tablaDocsMes.DataTable().destroy();
         }
         filaMes.child.hide();
         $icono.removeClass("fa-minus-square").addClass("fa-plus-square");
      } else {
         $icono.removeClass("fa-plus-square").addClass("fa-minus-square");
         filaMes.child($("<div>").html(fn_htmlContenedorDetalle(idPadreMes, "Documentos del período"))).show();
         fn_inicializarTablaDetalleDocs(idPadreMes, "PROD_MES");
      }
   });
};

const DT_IDIOMA = {
   "lengthMenu": "_MENU_",
   "processing": "Procesando...",
   "info": "Mostrando _END_ de _TOTAL_ registros.",
   "infoEmpty": "No hay registros disponibles",
   "infoFiltered": "(filtrado de _MAX_ registros totales)",
   "emptyTable": "Ningún dato disponible en esta tabla",
   "zeroRecords": "No se encontraron resultados",
   "paginate": { "previous": "‹", "next": "›" }
};

const fn_inicializarTablaGrupos = () => {
   if (tablaGrupos) return;
   tablaGrupos = $("#tabla-grupos").DataTable({
      serverSide: true,
      processing: true,
      pageLength: 10,
      dom: '<"d-none"l><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
      responsive: true,
      searching: false,
      lengthChange: true,
      language: DT_IDIOMA,
      ajax: function (parametrosDT, callbackDT) {
         const payloadPaginacion = {
            "draw": parametrosDT.draw,
            "start": parametrosDT.start,
            "length": parametrosDT.length,
            "filtros": filtrosActivos
         };
         $.ajax({
            url: urlBusquedaGrupos,
            type: "POST",
            data: JSON.stringify(payloadPaginacion),
            contentType: "application/json",
            headers: { "X-CSRFToken": csrfToken },
            success: function (respuestaServidor) {
               $("#badge-registros").text(`${respuestaServidor.recordsTotal} Registros`);
               callbackDT(respuestaServidor);
            },
            error: function (error) {
               console.error("Error en tabla grupos:", error);
               callbackDT({ "draw": parametrosDT.draw, "recordsTotal": 0, "recordsFiltered": 0, "data": [] });
            }
         });
      },
      columns: [
         {
            title: "", data: null, width: "1%",
            className: "text-center align-middle", orderable: false,
            render: (_datoColumna, _tipoRender, fila) => {
               const esExpandible = (fila.tipo === "PTE" || fila.tipo === "OT" || fila.tipo === "PROD");
               return esExpandible
                  ? `<button class="btn-toggle-grupo btn btn-sm p-0 text-secondary border-0 bg-transparent" data-id-padre="${fila.id_padre}" data-tipo="${fila.tipo}" title="Expandir"><i class="fas fa-plus-square"></i></button>`
                  : "";
            }
         },
         {
            title: "Origen", data: null, width: "90px",
            className: "text-center align-middle", orderable: false,
            render: (_datoColumna, _tipoRender, fila) => fnBadgeTipo(fila.tipo)
         },
         {
            title: "Folio / Proyecto", data: null, className: "align-middle",
            render: (_datoColumna, _tipoRender, fila) => fnCeldaFolio(fila)
         },
         {
            title: "Metadatos (Líder/Frente)", data: null, className: "align-middle",
            render: (_datoColumna, _tipoRender, fila) => {
               const sitioMostrable = fila.sitio && fila.sitio !== "NO APLICA" && fila.sitio !== "SIN UBICACIÓN";
               const htmlSitio = sitioMostrable
                  ? `<div class="meta-sitio"><i class="fas fa-map-marker-alt"></i>${fila.sitio}</div>`
                  : "";
               const htmlFrente = (fila.frente && fila.frente !== "N/A")
                  ? `<div class="texto-secundario">Frente: ${fila.frente}</div>`
                  : `<div class="texto-secundario">Cliente: ${fila.cliente}</div>`;
               return `<div class="celda-contenedor">
                  <div class="texto-lider">${fila.lider || "Sin Líder"}</div>
                  ${htmlFrente}
                  ${htmlSitio}
               </div>`;
            }
         },
      ],
      initComplete: function () {
         const contenedorSelector = $("#tabla-grupos_length").detach();
         $("#select-tamano-grupos-top").html(contenedorSelector);
         const selectGrupos = $("#select-tamano-grupos-top select");
         selectGrupos.addClass("form-select form-select-sm d-inline-block w-auto mx-2");
      }
   });
};

const fn_actualizarTablaGrupos = (resetPagina = true) => {
   fn_inicializarTablaGrupos();
   return new Promise((resolver) => {
      tablaGrupos.ajax.reload(() => resolver(), resetPagina);
   });
};

$(document).ready(function () {
   const elementoDOMPanel = document.getElementById("panelFiltros");

   const opcionesAjaxSelect2 = (url, placeholder) => ({
      width: "100%",
      dropdownParent: $("#panelFiltros"),
      multiple: true,
      placeholder,
      allowClear: true,
      minimumInputLength: 2,
      language: {
         inputTooShort: () => "Escribe al menos 2 caracteres",
         noResults: () => "Sin resultados"
      },
      ajax: {
         url,
         dataType: "json",
         delay: 300,
         data: (params) => ({ q: params.term || "", page: params.page || 1 }),
         processResults: (datos) => ({ results: datos.results, pagination: { more: datos.more } })
      }
   });

   $("#filtro-ot").select2(opcionesAjaxSelect2(urlObtenerOts, "Buscar OT..."));
   $("#filtro-partida").select2({
      width: "100%",
      dropdownParent: $("#panelFiltros"),
      multiple: true,
      placeholder: "Buscar partida...",
      allowClear: true,
      minimumInputLength: 2,
      language: {
         inputTooShort: () => "Escribe al menos 2 caracteres",
         noResults: () => "Sin resultados"
      },
      ajax: {
         url: urlBuscarProductosCatalogo,
         dataType: "json",
         delay: 300,
         data: (params) => ({ q: params.term || "" }),
         processResults: (datos) => ({ results: datos.results })
      }
   });

   fnEstadoInicialPanel();
   filtrosActivos = fnObtenerFiltrosEstaticos();
   fnActualizarPeriodo(filtrosActivos);
   tablaResultados = $("#tabla-resultados").DataTable({
      serverSide: true,
      processing: true,
      pageLength: 10,
      dom: '<"d-none"l><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
      responsive: true,
      searching: false,
      lengthChange: true,
      language: DT_IDIOMA,
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
         const selectDoc = $("#select-length select");
         selectDoc.addClass("form-select form-select-sm d-inline-block w-auto mx-2");
         selectDoc.val("10");
         if (fn_usarModoGrupos()) {
            $("#tabla-doc-wrapper").hide();
            $("#tabla-grupos-wrapper").show();
            $("#select-length").hide();
            $("#select-tamano-grupos-top").show();
            fn_actualizarTablaGrupos(true);
         }
      }
   });

   const peticionInicialDashboard = $.ajax({
      url: urlObtenerDashboard,
      type: "POST",
      data: JSON.stringify({ "filtros": filtrosActivos }),
      contentType: "application/json",
      headers: { "X-CSRFToken": csrfToken }
   });
   peticionInicialDashboard.then(res => {
      ccDashboard.actualizar(res.data);
      fnActualizarPeriodo(filtrosActivos);
   });

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
         fnCargarTiposDoc();
         fnGestionarVisibilidadFiltroOt();
         fnAsegurarSelect2("#filtro-sitio");
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
      $("#filtro-sitio").empty().trigger("change");

      if (usaJerarquia) {
         if (valorFrente) {
            fnGestionarCargaSitios(valorFrente, true);
         } else {
            $("#filtro-sitio").empty().trigger("change");
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
      $("#filtro-sitio").empty().trigger("change");

      if (!usaJerarquia) {
         contenedorJerarquia.slideUp();
         selectorFrente.val(null).trigger("change.select2");
         fnGestionarCargaSitios(null, false);
      } else {
         contenedorJerarquia.slideDown();
         $("#filtro-sitio").empty().trigger("change");
         fnAsegurarSelect2($("#filtro-sitio"));
      }
   });

   $("#chk_estado_prog_sin_ejec").on("change", function () {
      const programadaSinEjecActiva = $(this).is(":checked");
      $("#chk_tipo_normal, #chk_tipo_extraordinario")
         .prop("disabled", programadaSinEjecActiva)
         .prop("checked", !programadaSinEjecActiva);
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

      if (fnModoActual() === "informacion") {
         const estadosActivos = $("#chk_estado_prog_ejec, #chk_estado_prog_sin_ejec, #chk_estado_ejec_sin_prog").filter(":checked").length;
         if (estadosActivos === 0) {
            alert("Selecciona al menos un Estado de Producción.");
            return;
         }
         periodoActivoInfo = fnObtenerFiltrosProdInfo();
         fnActualizarPeriodo(periodoActivoInfo);
         fn_actualizarLabelOts();
         instanciaBoton.prop("disabled", true).html("<i class=\"fas fa-spinner fa-spin me-2\"></i>Consultando...");
         fnInicializarTablaInfo();
         $("#select-length-info select").val("10").trigger("change");
         tablaProduccionInfo.ajax.reload(() => {
            instanciaBoton.prop("disabled", false).html("<i class=\"fas fa-search me-2\"></i>Buscar");
         }, true);
         const existePanel = typeof panelFiltrosOffcanvas !== "undefined" && panelFiltrosOffcanvas ? true : false;
         if (existePanel) panelFiltrosOffcanvas.hide();
         return;
      }

      $("#select-length select").val("10").trigger("change");
      filtrosActivos = fnObtenerFiltrosActuales();
      fnActualizarTodo(instanciaBoton);
   });

   $("#btn-limpiar-filtros").on("click", function () {
      const modoPrevio = fnModoActual();
      fnEstadoInicialPanel();

      if (modoPrevio === "informacion") {
         $("#filtro-frente").closest(".mb-3").stop(true).hide();
         $("#filtro-sitio").closest(".mb-3").stop(true).hide();
         $("#contenedor-switch-frente").stop(true).hide();
         $("input[name='prod_tabs'][value='informacion']").prop("checked", true);
         fnMostrarModoInformacion();
         periodoActivoInfo = fnObtenerFiltrosProdInfo();
         fnActualizarPeriodo(periodoActivoInfo);
         fn_actualizarLabelOts();
         $("#select-length-info select").val("10").trigger("change");
         fnRecargarTablaInfo();
      } else {
         fnMostrarModoDocumentacion();
         filtrosActivos = fnObtenerFiltrosEstaticos();
         $("#select-length select").val("10").trigger("change");
         fnActualizarTodo();
      }
   });

   $("input[name=\"origen\"]").on("change", function () {
      fnGestionarVisibilidadUbicacion();
      fnGestionarVisibilidadFiltroOt();
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

   $(document).on("click", ".btn-toggle-grupo", function () {
      const $btn      = $(this);
      const idPadre   = $btn.data("id-padre");
      const tipo      = $btn.data("tipo");
      const $trHeader = $btn.closest("tr");
      const $icono    = $btn.find("i");
      const filaTabla = tablaGrupos.row($trHeader);

      if (filaTabla.child.isShown()) {
         const selectorTablaHija = tipo === "PROD" ? `#tabla-meses-${idPadre}` : `#tabla-detalle-${idPadre}`;
         const $tablaHija = $(selectorTablaHija);
         if ($tablaHija.length && $.fn.DataTable.isDataTable($tablaHija)) {
            $tablaHija.DataTable().destroy();
         }
         filaTabla.child.hide();
         $icono.removeClass("fa-minus-square").addClass("fa-plus-square");
      } else {
         $icono.removeClass("fa-plus-square").addClass("fa-minus-square");
         if (tipo === "PROD") {
            filaTabla.child($("<div>").html(fn_htmlContenedorMeses(idPadre))).show();
            fn_inicializarTablaMeses(idPadre);
         } else {
            filaTabla.child($("<div>").html(fn_htmlContenedorDetalle(idPadre, `Documentos de la ${tipo}`))).show();
            fn_inicializarTablaDetalleDocs(idPadre, tipo);
         }
      }
   });

   $("#grupos-paginacion").on("click", "li.paginate_button", function () {
      if ($(this).hasClass("disabled") || $(this).hasClass("active")) return;
      const totalPaginas = Math.ceil(estadoPaginaGrupos.total / estadoPaginaGrupos.tamano) || 1;
      if ($(this).hasClass("previous")) {
         if (estadoPaginaGrupos.pagina <= 1) return;
         estadoPaginaGrupos.pagina--;
      } else if ($(this).hasClass("next")) {
         if (estadoPaginaGrupos.pagina >= totalPaginas) return;
         estadoPaginaGrupos.pagina++;
      } else {
         estadoPaginaGrupos.pagina = parseInt($(this).data("pagina"));
      }
      fn_actualizarTablaGrupos(false);
   });

   $("#select-tamano-grupos").on("change", function () {
      estadoPaginaGrupos.tamano = parseInt($(this).val());
      fn_actualizarTablaGrupos(true);
   });

   $("#btn-expandir-grafica-info").on("click", function () {
      const botonActual = $(this);
      const esModoExpandido = botonActual.find("i").hasClass("fa-compress") ? true : false;
      if (esModoExpandido) {
         $("#cc-table-info-card").slideDown(300);
         botonActual.html("<i class=\"fas fa-expand\"></i>");
         $("#cc-chart-info-main").removeClass("grafica-expandida-full");
      } else {
         $("#cc-table-info-card").slideUp(300);
         botonActual.html("<i class=\"fas fa-compress\"></i>");
         $("#cc-chart-info-main").addClass("grafica-expandida-full");
      }
      setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
   });

   $("#btn-expandir-tabla-info").on("click", function () {
      const botonActual = $(this);
      const esModoExpandido = botonActual.find("i").hasClass("fa-compress") ? true : false;
      if (esModoExpandido) {
         $("#cc-kpis-info, #cc-chart-info").slideDown(300);
         botonActual.html("<i class=\"fas fa-expand\"></i>");
         $("#cc-table-info-card").removeClass("tabla-expandida-full");
      } else {
         $("#cc-kpis-info, #cc-chart-info").slideUp(300);
         botonActual.html("<i class=\"fas fa-compress\"></i>");
         $("#cc-table-info-card").addClass("tabla-expandida-full");
      }
      setTimeout(() => {
         if (tablaProduccionInfo) tablaProduccionInfo.columns.adjust().responsive.recalc();
      }, 350);
   });

   $("#btn-exportar-excel").on("click", function (eventoClick) {
      eventoClick.preventDefault();

      const botonExportar = $(this);
      const textoOriginal = botonExportar.html();
      const esModuloInfo = $("#tab-info").is(":checked");

      let urlEndpoint, payloadExportacion, nombreArchivo;
      const fechaGeneracion = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      if (esModuloInfo) {
         if (!periodoActivoInfo) {
            alert("Primero ejecuta una búsqueda en el módulo de Información.");
            return;
         }
         urlEndpoint = "/operaciones/centro_consulta/descargar-excel-info/";
         payloadExportacion = { "filtros": periodoActivoInfo };
         nombreArchivo = `Reporte_Produccion_${fechaGeneracion}.xlsx`;
      } else {
         urlEndpoint = "/operaciones/centro_consulta/descargar-excel/";
         payloadExportacion = { "filtros": filtrosActivos };
         nombreArchivo = `Reporte_SASCOP_BI_${fechaGeneracion}.xlsx`;
      }

      botonExportar.prop("disabled", true).html("<i class=\"fas fa-spinner fa-spin me-2\"></i>Generando Reporte...");

      fetch(urlEndpoint, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
         },
         body: JSON.stringify(payloadExportacion)
      })
      .then(respuestaServidor => {
         const esValida = respuestaServidor.ok ? true : false;
         if (!esValida) throw new Error("El servidor no pudo generar el archivo.");
         return respuestaServidor.blob();
      })
      .then(archivoBinario => {
         const urlDescarga = window.URL.createObjectURL(archivoBinario);
         const enlaceDescarga = document.createElement("a");
         enlaceDescarga.href = urlDescarga;
         enlaceDescarga.download = nombreArchivo;

         document.body.appendChild(enlaceDescarga);
         enlaceDescarga.click();

         enlaceDescarga.remove();
         window.URL.revokeObjectURL(urlDescarga);
      })
      .catch(errorPeticion => {
         console.error("Error al exportar Excel:", errorPeticion);
         alert("Hubo un problema al intentar generar el archivo Excel.");
      })
      .finally(() => {
         botonExportar.prop("disabled", false).html(textoOriginal);
      });
   });


   const modalCorreoInstancia = new bootstrap.Modal($("#modal-enviar-correo")[0]);
   const modalExitoInstancia = new bootstrap.Modal($("#modal-exito-correo")[0]);

   if (typeof $.validator !== "undefined") {
      $.validator.addMethod("correosMultiples", function (valorAValidar, elementoDOM) {
         if (this.optional(elementoDOM)) {
            return true;
         }
         const expresionRegular = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
         const arregloCorreos = valorAValidar.split(",");

         for (let i = 0; i < arregloCorreos.length; i++) {
            const correoLimpio = arregloCorreos[i].trim();
            if (correoLimpio !== "" && !expresionRegular.test(correoLimpio)) {
               return false;
            }
         }
         return true;
      }, "Por favor, ingresa correos válidos separados por comas.");
   }

   const validadorModalCorreo = $("#form-enviar-correo").validate({
      errorClass: "is-invalid",
      validClass: "is-valid",
      rules: {
         correos_destino: {
            required: true,
            correosMultiples: true
         }
      },
      messages: {
         correos_destino: {
            required: "Por favor, ingresa al menos un correo electrónico."
         }
      },
      errorPlacement: function (error, element) {
         error.addClass("invalid-feedback fw-bold mt-1");
         error.insertAfter(element);
      }
   });

   $("#modal-enviar-correo").on("hidden.bs.modal", function () {
      $("#form-enviar-correo")[0].reset();
      if (validadorModalCorreo) {
         validadorModalCorreo.resetForm();
      }
      $("#input-correos").removeClass("is-invalid is-valid");
   });

   $("#btn-enviar-correo").on("click", function (eventoClick) {
      eventoClick.preventDefault();
      const esInfoMode = fnModoActual() === "informacion";
      $("#contenedor-graficas-correo").toggle(!esInfoMode);
      $("#contenedor-graficas-correo-info").toggle(esInfoMode);
      modalCorreoInstancia.show();
   });

   const fnGenerarImagenesBase64 = (listaSeleccion) => {
      const contenedorOculto = $("<div></div>").css({
         "width": "800px",
         "height": "400px",
         "display": "none"
      });
      $("body").append(contenedorOculto);

      const graficaTemporal = echarts.init(contenedorOculto[0]);
      const arregloImagenes = [];

      listaSeleccion.forEach(llaveGrafica => {
         const configuracion = ccDashboard.obtenerConfiguracion(llaveGrafica);
         configuracion.animation = false;
         graficaTemporal.setOption(configuracion);

         const base64Imagen = graficaTemporal.getDataURL({
            type: "png",
            backgroundColor: "#ffffff",
            pixelRatio: 2
         });

         arregloImagenes.push({
            "nombre": llaveGrafica,
            "imagen": base64Imagen
         });
         graficaTemporal.clear();
      });

      graficaTemporal.dispose();
      contenedorOculto.remove(); 
      return arregloImagenes;
   };

   const fnEsProdActivo = () => $("#orig_pro").is(":checked");
   const fnModoActual = () => $("input[name='prod_tabs']:checked").val();

   const fnGestionarVisibilidadFiltroOt = () => {
      const otActivo = $("#orig_ot").is(":checked");
      const prodActivo = fnEsProdActivo();

      if (otActivo || prodActivo) {
         $("#contenedor-filtro-ot").slideDown();
      } else {
         $("#contenedor-filtro-ot").slideUp();
         $("#filtro-ot").val(null).trigger("change");
      }
   };

   const fnObtenerFiltrosProdInfo = () => {
      const tiposSeleccionados = [];
      if ($("#chk_tipo_normal").is(":checked")) tiposSeleccionados.push($("#chk_tipo_normal").val());
      if ($("#chk_tipo_extraordinario").is(":checked")) tiposSeleccionados.push($("#chk_tipo_extraordinario").val());

      const anexos         = $("#filtro-anexo").val();
      const partidasData   = $("#filtro-partida").select2("data");
      const partidas       = partidasData.map(d => {
         const partes = d.text.split(" - ");
         return {
            partida:     d.partida,
            descripcion: partes.slice(1, -1).join(" - "),
            clave_anexo: d.clave_anexo
         };
      });
      const ots         = $("#filtro-ot").val();
      const clientes    = $("#filtro-cliente").val();
      const lideres     = $("#filtro-lider").val();
      const sitios      = $("#filtro-sitio").val();
      return {
         "ots_id":        ots ? ots : [],
         "tipos_tiempo":  tiposSeleccionados,
         "anexos":        anexos ? anexos : [],
         "partidas_id":   partidas,
         "clientes_id":   clientes ? clientes : [],
         "lideres_id":    lideres ? lideres : [],
         "sitios_id":     sitios ? sitios : [],
         "fecha_inicio":  $("#fecha_inicio").val() || null,
         "fecha_fin":     $("#fecha_fin").val() || null,
         "es_excedente":        $("#chk_excedentes").is(":checked") ? true : null,
         "texto_busqueda":      $("#filtro-buscar-info").val(),
         "estado_prog_ejec":    $("#chk_estado_prog_ejec").is(":checked"),
         "estado_prog_sin_ejec": $("#chk_estado_prog_sin_ejec").is(":checked"),
         "estado_ejec_sin_prog": $("#chk_estado_ejec_sin_prog").is(":checked")
      };
   };

   const fnSincronizarOpcionesProdTipoDoc = () => {
      const elementoSelect = $("#filtro-tipo-doc");
      if (!elementoSelect.find("option").length) return;

      elementoSelect.find("option[data-prod]").remove();

      if (fnEsProdActivo() && fnModoActual() === "documentacion") {
         elementoSelect.append(`<option value="REPORTE MENSUAL" data-prod="1">REPORTE MENSUAL</option>`);
         elementoSelect.append(`<option value="GENERADOR DE PRECIOS UNITARIOS" data-prod="1">GENERADOR DE PRECIOS UNITARIOS</option>`);
      }

      if (elementoSelect.hasClass("select2-hidden-accessible")) {
         fnAsegurarSelect2(elementoSelect);
      }
   };

   const fnCargarTiposDoc = () => {
      const elementoSelect = $("#filtro-tipo-doc");
      if (elementoSelect.find("option").length > 1) {
         fnSincronizarOpcionesProdTipoDoc();
         return;
      }

      $.ajax({
         url: urlObtenerTiposDoc,
         type: "GET",
         dataType: "json",
         success: function (datosBackend) {
            const primeraOpcion = elementoSelect.find("option:first").detach();
            elementoSelect.empty().append(primeraOpcion);
            const listaRespuesta = datosBackend ? datosBackend : [];
            listaRespuesta.forEach(item => {
               elementoSelect.append(`<option value="${item.id}">${item.descripcion}</option>`);
            });
            fnSincronizarOpcionesProdTipoDoc();
            fnAsegurarSelect2(elementoSelect);
         },
         error: function (errorPeticion) {
            console.error(`Error en catálogo:`, errorPeticion);
         }
      });
   };

   const fnMostrarModoDocumentacion = () => {
      $("#cc-kpis-container").show();
      $("#cc-chart-card").show();
      $("#cc-table-card").show();
      $("#cc-table-info-card").hide();
      $("#cc-kpis-info").hide();
      $("#cc-chart-info").hide();
      setTimeout(() => window.dispatchEvent(new Event("resize")), 100);

      $("#contenedor-origen-datos").show();
      $("#contenedor-filtro-disponibilidad").show();
      $("#contenedor-filtro-tipo-doc").show();
      $("#contenedor-filtro-estatus").show();
      $("#prod-info-filtros").hide();
      $("#section-title-detalles").text("Detalles del Documento");

      $("#orig_pte, #orig_ot").prop("disabled", false).prop("checked", true)
         .closest(".form-check").css({ "opacity": "", "cursor": "" });
      fnGestionarVisibilidadUbicacion();
      fnSincronizarOpcionesProdTipoDoc();
      fnGestionarVisibilidadFiltroOt();
   };

   const fnMostrarModoInformacion = () => {
      if (!fnEsProdActivo()) {
         $("#orig_pro").prop("checked", true);
      }
      fnCargarCatalogo(urlObtenerAnexos, "#filtro-anexo");
      fnAsegurarSelect2($("#filtro-anexo"));

      fnGestionarVisibilidadFiltroOt();

      $("#cc-kpis-container").hide();
      $("#cc-chart-card").hide();
      $("#cc-table-card").hide();
      $("#cc-table-info-card").show();

      $("#contenedor-origen-datos").hide();
      $("#contenedor-filtro-disponibilidad").hide();
      $("#contenedor-filtro-tipo-doc").hide();
      $("#contenedor-filtro-estatus").hide();
      $("#prod-info-filtros").show();
      $("#section-title-detalles").text("Rango de Fechas");

      $("#orig_pte, #orig_ot").prop("checked", false).prop("disabled", true)
         .closest(".form-check").css({ "opacity": "0.35", "cursor": "not-allowed" });

      $("#filtro-frente").closest(".mb-3").stop(true, true).hide();
      $("#contenedor-switch-frente").stop(true, true).hide();
      $("#filtro-frente").val(null).trigger("change.select2");

      const opcionesSitioInfo = $("#filtro-sitio option").length;
      if (opcionesSitioInfo <= 1) fnGestionarCargaSitios(null, false);
      fnAsegurarSelect2($("#filtro-sitio"));
      $("#filtro-sitio").closest(".mb-3").stop(true, true).show();

      if (typeof ccDashboardInfo !== "undefined") ccDashboardInfo.fnInicializar();
   };

   const fnInicializarTablaInfo = () => {
      if (tablaProduccionInfo) return;

      tablaProduccionInfo = $("#tabla-produccion-info").DataTable({
         serverSide: true,
         processing: true,
         pageLength: 10,
         dom: '<"d-none"l><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
         responsive: true,
         searching: false,
         lengthChange: true,
         language: DT_IDIOMA,
         ajax: function (parametrosDT, callbackDT) {
            const payloadPaginacion = {
               "draw": parametrosDT.draw,
               "start": parametrosDT.start,
               "length": parametrosDT.length,
               "filtros": fnObtenerFiltrosProdInfo()
            };

            $.ajax({
               url: urlBusquedaProdInfo,
               type: "POST",
               data: JSON.stringify(payloadPaginacion),
               contentType: "application/json",
               headers: { "X-CSRFToken": csrfToken },
               success: function (respuestaServidor) {
                  callbackDT(respuestaServidor);
                  if (typeof ccDashboardInfo !== "undefined") {
                     ccDashboardInfo.fnActualizar(respuestaServidor.dashboard || {});
                  }
               },
               error: function (error) {
                  console.error("Error en tabla producción info:", error);
                  callbackDT({ "draw": parametrosDT.draw, "recordsTotal": 0, "recordsFiltered": 0, "data": [] });
               }
            });
         },
         columns: [
            { title: "OT", data: "ot", className: "align-middle" },
            { title: "Anexo", data: "anexo", width: "70px", className: "align-middle text-center" },
            { title: "Partida", data: "partida", className: "align-middle" },
            { title: "Vol. Producido", data: "vol_producido", width: "110px", className: "align-middle text-end" },
            { title: "Vol. Programado", data: "vol_programado", width: "120px", className: "align-middle text-end" },
            { title: "Fecha", data: "fecha_produccion", width: "100px", className: "align-middle text-nowrap" },
            { title: "Tipo", data: "tipo_tiempo", width: "70px", className: "align-middle text-center" },
            { title: "Sitio", data: "sitio", className: "align-middle" }
         ],
         drawCallback: function () {
            const api = this.api();
            const filasActuales = api.data().toArray();
            const hayProgramado = filasActuales.some(
               fila => fila.vol_programado !== null && fila.vol_programado !== undefined
            );
            if (api.column(4).visible() !== hayProgramado) {
               api.column(4).visible(hayProgramado, false);
            }
         },
         initComplete: function () {
            const contenedorSelector = $("#tabla-produccion-info_length").detach();
            $("#select-length-info").html(contenedorSelector);
            const selectInfo = $("#select-length-info select");
            selectInfo.addClass("form-select form-select-sm d-inline-block w-auto mx-2");
            if (!selectInfo.val()) selectInfo.val("10").trigger("change");
         }
      });
   };

   const fnRecargarTablaInfo = () => {
      fnInicializarTablaInfo();
      tablaProduccionInfo.ajax.reload(null, true);
   };

   $("#orig_pro").on("change", function () {
      const estaActivo = $(this).is(":checked");
      if (estaActivo) {
         fnCargarCatalogo(urlObtenerAnexos, "#filtro-anexo");
         fnAsegurarSelect2($("#filtro-anexo"));
         fnGestionarVisibilidadFiltroOt();
         if (fnModoActual() === "informacion") {
            fnMostrarModoInformacion();
         } else {
            fnSincronizarOpcionesProdTipoDoc();
         }
      } else {
         fnGestionarVisibilidadFiltroOt();
         fnMostrarModoDocumentacion();
         $("input[name='prod_tabs'][value='documentacion']").prop("checked", true);
      }
   });

   $("input[name='prod_tabs']").on("change", function () {
      const modoSeleccionado = $(this).val();
      fn_guardarEstadoFiltros(modoPrevio);
      modoPrevio = modoSeleccionado;
      fn_restaurarEstadoFiltros(modoSeleccionado);
      fn_actualizarLabelOts();
      if (modoSeleccionado === "informacion") {
         fnMostrarModoInformacion();
         if (periodoActivoInfo === null) {
            const fechaInicio = $("#fecha_inicio").val();
            const fechaFin    = $("#fecha_fin").val();
            if (!fechaInicio || !fechaFin) {
               const filtrosEstaticos = fnObtenerFiltrosEstaticosInfo();
               $("#fecha_inicio").val(filtrosEstaticos.fecha_inicio);
               $("#fecha_fin").val(filtrosEstaticos.fecha_fin);
               periodoActivoInfo = fnObtenerFiltrosProdInfo();
               fnRecargarTablaInfo();
               $("#fecha_inicio").val("");
               $("#fecha_fin").val("");
            } else {
               periodoActivoInfo = fnObtenerFiltrosProdInfo();
               fnRecargarTablaInfo();
            }
         } else {
            $("#cc-kpis-info").show();
            $("#cc-chart-info").show();
            setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
         }
         fnActualizarPeriodo(periodoActivoInfo);
      } else {
         fnMostrarModoDocumentacion();
         fnActualizarPeriodo(filtrosActivos);
      }
   });

   $("#filtro-buscar-info").on("keyup", function (eventoTeclado) {
      if (eventoTeclado.key === "Enter" && tablaProduccionInfo) {
         tablaProduccionInfo.ajax.reload(null, true);
      }
   });

   $("#btn-procesar-envio").on("click", function () {
      const formularioCorreo = $("#form-enviar-correo");
      const esValido = formularioCorreo.valid();
      if (!esValido) return;

      const cadenaCorreosCruda = $("#input-correos").val().trim();
      const arregloLimpio = cadenaCorreosCruda.split(",").map(correo => correo.trim()).filter(correo => correo !== "");
      const cadenaCorreosFinal = arregloLimpio.join(", ");

      const botonProcesar = $(this);
      const textoOriginal = botonProcesar.html();
      botonProcesar.prop("disabled", true).html("<i class=\"fas fa-spinner fa-spin me-2\"></i>Enviando...");

      let imagenesExtraidas = [];
      let payloadCorreo = {};
      let urlEnvio = "";

      if (fnModoActual() === "informacion") {
         const tabsSeleccionadas = $(".chk-grafica-info:checked").map(function () { return $(this).val(); }).get();
         imagenesExtraidas = ccDashboardInfo.fnCapturarGraficas(tabsSeleccionadas);
         payloadCorreo = { "correos": cadenaCorreosFinal, "filtros": periodoActivoInfo, "graficas": imagenesExtraidas };
         urlEnvio = urlEnviarCorreoInfo;
      } else {
         const checksActivos = $(".chk-grafica-exportar:checked");
         const graficasSeleccionadas = checksActivos.length > 0
            ? checksActivos.map(function () { return $(this).val(); }).get()
            : [];
         imagenesExtraidas = fnGenerarImagenesBase64(graficasSeleccionadas);
         payloadCorreo = { "correos": cadenaCorreosFinal, "filtros": fnObtenerFiltrosActuales(), "graficas": imagenesExtraidas };
         urlEnvio = urlEnviarCorreoBi;
      }

      fetch(urlEnvio, {
         method: "POST",
         headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
         body: JSON.stringify(payloadCorreo)
      })
      .then(respuestaServidor => {
         const peticionExitosa = respuestaServidor.ok ? true : false;
         if (!peticionExitosa) throw new Error("Error al enviar el correo desde el servidor.");
         return respuestaServidor.json();
      })
      .then(() => {
         modalCorreoInstancia.hide();
         $("#destinatarios-exito").text(cadenaCorreosFinal);
         modalExitoInstancia.show();
      })
      .catch(errorPeticion => {
         console.error("Error en envio de correo:", errorPeticion);
         $("#texto-error-global").text("Ocurrió un problema de red o de servidor al intentar enviar el correo. Por favor, intenta de nuevo.");
         const modalError = bootstrap.Modal.getOrCreateInstance($("#modal-error-global")[0]);
         modalError.show();
      })
      .finally(() => {
         botonProcesar.prop("disabled", false).html(textoOriginal);
      });
   });
});