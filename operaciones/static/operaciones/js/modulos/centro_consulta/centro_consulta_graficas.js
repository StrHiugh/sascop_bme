const ccDashboard = (() => {
   const colores = {
      naranja: "#f05523",
      naranjaSuave: "#fde0d4",
      gris: "#54565a",
      grisSuave: "#e8e9ea",
      grisBorde: "#d0d1d3",
      morado: "#20145f",
      moradoSuave: "#ede9f8",
      azul: "#51c2eb",
      azulSuave: "#d6f0fb",
      amarillo: "#fad91f",
      blanco: "#ffffff",
      grid: "#f0f1f2",
      borde: "#d0d1d3"
   };

   let graficaInstancia = null;
   let pestanaActiva = "lideres";
   let datosMaestros = {};
   let sitioComportamientoSeleccionado = null;
   const tooltipBase = {
      backgroundColor: colores.blanco,
      borderColor: colores.borde,
      borderWidth: 1,
      textStyle: { color: colores.morado, fontSize: 12, fontFamily: "inherit" }
   };

   const leyendaBase = {
      bottom: 0,
      itemWidth: 11,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: colores.gris, fontFamily: "inherit" }
   };

   const gridBase = {
      top: 32, left: 12, right: 30, bottom: 52, containLabel: true
   };

   const ejeYBase = {
      type: "value",
      splitLine: { lineStyle: { color: colores.grid, type: "dashed" } },
      axisLabel: { fontSize: 10, color: colores.gris },
      axisLine: { show: false },
      axisTick: { show: false }
   };

   const fnOptBarras = (datos, llaveNombre) => {
      const listaValida = datos ? datos : [];
      return {
         backgroundColor: "transparent",
      tooltip: {
      trigger: "axis",
      formatter: function (parametrosArreglo) {
         return fnGenerarTooltipAvanzado(parametrosArreglo, listaValida);
      }
   },
         legend: { ...leyendaBase, data: ["Cargados", "Pendientes"] },
         grid: gridBase,
         xAxis: {
            type: "category",
            data: listaValida.map(item => item[llaveNombre].length > 15 ? `${item[llaveNombre].substring(0, 15)}...` : item[llaveNombre]),
            axisLabel: { fontSize: 9, color: colores.morado, interval: 0, rotate: 25 },
            axisLine: { lineStyle: { color: colores.borde } }
         },
         yAxis: ejeYBase,
         series: [
            {
               name: "Cargados",
               type: "bar",
               stack: "total",
               barMaxWidth: 45,
               data: listaValida.map(item => item.cargados),
               itemStyle: { color: colores.naranja }
            },
            {
               name: "Pendientes",
               type: "bar",
               stack: "total",
               barMaxWidth: 45,
               data: listaValida.map(item => item.pendientes),
               itemStyle: { color: colores.grisSuave, borderRadius: [4, 4, 0, 0] }
            }
         ]
      };
   };
   const fnOptHorizontales = (datos, llaveNombre) => {
      const listaValida = datos ? datos : [];
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: function (parametrosArreglo) {
               return fnGenerarTooltipAvanzado(parametrosArreglo, listaValida);
            }
         },
         legend: { ...leyendaBase, data: ["Cargados", "Pendientes"] },
         grid: { top: 12, left: 12, right: 30, bottom: 44, containLabel: true },
         xAxis: ejeYBase,
         yAxis: {
            type: "category",
            data: listaValida.map(item => item[llaveNombre].length > 25 ? `${item[llaveNombre].substring(0, 22)}...` : item[llaveNombre]),
            inverse: true,
            axisLabel: { fontSize: 9, color: colores.morado }
         },
         series: [
            {
               name: "Cargados",
               type: "bar",
               stack: "total",
               barMaxWidth: 18,
               data: listaValida.map(item => item.cargados),
               itemStyle: { color: colores.naranja }
            },
            {
               name: "Pendientes",
               type: "bar",
               stack: "total",
               barMaxWidth: 18,
               data: listaValida.map(item => item.pendientes),
               itemStyle: { color: colores.grisSuave, borderRadius: [0, 3, 3, 0] }
            }
         ]
      };
   };

   const fnOptDonut = (datos, llaveNombre, esGraficaSitios = false) => {
      const listaValida = datos ? datos : [];
      const paletaDinamica = [
         colores.naranja, colores.azul, colores.amarillo, colores.morado,
         colores.gris, "#4bc0c0", "#ff9f40", "#9966ff", "#e83e8c", "#28a745"
      ];

      const configBase = {
         backgroundColor: "transparent",
         tooltip: { ...tooltipBase, trigger: "item" },
         legend: {
            ...leyendaBase,
            bottom: 0,
            type: "scroll",
            pageIconColor: colores.naranja,
            pageTextStyle: { color: colores.gris }
         },
         series: [
            {
               name: "",
               type: "pie",
               center: ["50%", "50%"],
               radius: ["40%", "60%"],
               avoidLabelOverlap: false,
               itemStyle: {
                  borderRadius: 4,
                  borderColor: colores.blanco,
                  borderWidth: 2
               },
               label: {
                  show: false,
                  position: "center"
               },
               emphasis: {
                  label: {
                     show: true,
                     fontSize: 12,
                     fontWeight: "bold",
                     color: colores.morado,
                     formatter: "{b}\n{c} ({d}%)"
                  }
               },
               labelLine: {
                  show: false
               },
               data: listaValida.map((item, indiceItem) => ({
                  value: item.total,
                  name: item[llaveNombre],
                  itemStyle: {
                     color: item[llaveNombre] === "PTE" ? colores.naranja :
                        item[llaveNombre] === "OT" ? colores.azul :
                        item[llaveNombre] === "PROD" ? colores.amarillo :
                        paletaDinamica[indiceItem % paletaDinamica.length]
                  }
               }))
            }
         ]
      };

      if (esGraficaSitios) {
         const cantidadElementos = listaValida.length;
         const totalSitios = cantidadElementos;

         return {
            ...configBase,
            title: {
               text: `{big|${totalSitios.toLocaleString("es-MX")}}\n{small|sitios}`,
               top: 15,
               right: 20,
               textStyle: {
                  rich: {
                     big: {
                        fontSize: 32,
                        fontWeight: "bold",
                        color: colores.morado,
                        lineHeight: 40
                     },
                     small: {
                        fontSize: 12,
                        color: colores.gris,
                        fontWeight: "normal"
                     }
                  }
               },
               textAlign: "right"
            },

            legend: {
               ...configBase.legend,
               bottom: 15,
               left: 10,
               right: 10,
               height: cantidadElementos > 15 ? 200 :
                  cantidadElementos > 10 ? 160 : 120,
               itemWidth: cantidadElementos > 15 ? 20 : 25,
               itemHeight: cantidadElementos > 15 ? 10 : 14,
               pageButtonItemSize: 10,
               pageButtonGap: 3,
               pageIconSize: 10,
               orient: "horizontal",
               align: "left"
            },
            series: [
               {
                  ...configBase.series[0],
                  center: [
                     "50%",
                     cantidadElementos > 15 ? "38%" :
                     cantidadElementos > 10 ? "40%" : "42%"
                  ],
                  radius: [
                     cantidadElementos > 15 ? "35%" :
                     cantidadElementos > 10 ? "38%" : "40%",
                     cantidadElementos > 15 ? "60%" :
                     cantidadElementos > 10 ? "63%" : "65%"
                  ]
               }
            ]
         };
      }

      return configBase;
   };

   const fnOptEmbudo = (datos) => {
      const listaValida = datos ? datos : [];
      return {
         backgroundColor: "transparent",
         tooltip: { ...tooltipBase, trigger: "item" },
         series: [
            {
               name: "Estatus",
               type: "funnel",
               left: "10%",
               width: "80%",
               label: { formatter: "{b}: {c}" },
               itemStyle: { borderColor: colores.blanco, borderWidth: 2 },
               data: listaValida.map(item => ({
                  value: item.total,
                  name: item.estatus
               }))
            }
         ]
      };
   };

   const fnObtenerOpcionGrafica = (identificadorTab) => {
      const mapeoGraficas = {
         "lideres": () => fnOptBarras(datosMaestros.rendimiento_lideres, "nombre"),
         "origenes": () => fnOptDonut(datosMaestros.distribucion_origenes, "origen", false),
         "documentos": () => fnOptHorizontales(datosMaestros.tipos_documentos, "documento"),
         "clientes": () => fnOptBarras(datosMaestros.estatus_clientes, "cliente"),
         "folios": () => fnOptHorizontales(datosMaestros.avance_folios, "folio"),
         "frentes": () => fnOptDonut(datosMaestros.frentes_ot, "frente", false),
         "sitios": () => fnOptDonut(datosMaestros.sitios_ot, "sitio", true),
         "embudo": () => fnOptEmbudo(datosMaestros.embudo_estatus)
      };

      const funcionGeneradora = mapeoGraficas[identificadorTab];
      return funcionGeneradora ? funcionGeneradora() : {};
   };

   const fnRenderizarPestana = (identificadorTab) => {
      if (!graficaInstancia) return;
      pestanaActiva = identificadorTab;

      document.querySelectorAll(".cc-tab-btn").forEach(boton => {
         const esActivo = boton.dataset.tab === identificadorTab ? true : false;
         boton.classList.toggle("active", esActivo);
      });

      graficaInstancia.clear();
      const configuracionECharts = fnObtenerOpcionGrafica(identificadorTab);
      graficaInstancia.setOption(configuracionECharts, { notMerge: true });
   };


   const fnGenerarTooltipAvanzado = (parametrosArreglo, listaOriginal) => {
      const indiceFila = parametrosArreglo[0].dataIndex;
      const registro = listaOriginal[indiceFila];
      
      const valorCargados = registro.cargados ? registro.cargados : 0;
      const valorPendientes = registro.pendientes ? registro.pendientes : 0;
      const valorNoAplica = registro.no_aplica ? registro.no_aplica : 0;
      const nombreEtiqueta = parametrosArreglo[0].name;

      const totalExigible = valorCargados + valorPendientes;
      const totalAbsoluto = totalExigible + valorNoAplica;
      const porcentajeAvance = totalExigible > 0 ? Math.round((valorCargados / totalExigible) * 100) : 0;
      const existenNoAplica = valorNoAplica > 0 ? true : false;

      let htmlTooltip = `<div style="font-family: inherit; min-width: 150px;">`;
      htmlTooltip += `<strong style="color: ${colores.morado}; font-size: 13px;">${nombreEtiqueta}</strong><br/>`;
      htmlTooltip += `<span style="color: ${colores.naranja};">Cargados: <b>${valorCargados}</b></span><br/>`;
      htmlTooltip += `<span style="color: ${colores.gris};">Pendientes: <b>${valorPendientes}</b></span><br/>`;

      if (existenNoAplica) {
         htmlTooltip += `<span style="color: #6c757d;">No Aplica (Omitidos): <b>${valorNoAplica}</b></span><br/>`;
      }

      htmlTooltip += `<hr style="margin: 5px 0; border-color: ${colores.borde};">`;
      htmlTooltip += `<span style="color: ${colores.gris};">Total General: <b>${totalAbsoluto}</b></span><br/>`;
      htmlTooltip += `<span style="color: ${colores.naranja};">Avance Real: <b>${porcentajeAvance}%</b></span>`;
      htmlTooltip += `</div>`;

      return htmlTooltip;
   };

   const fnActualizarKPIs = (totales) => {
      const datosKPI = totales ? totales : { cargados: 0, pendientes: 0, no_aplica: 0 };
      const cantidadCargados = datosKPI.cargados ? datosKPI.cargados : 0;
      const cantidadPendientes = datosKPI.pendientes ? datosKPI.pendientes : 0;
      const cantidadNoAplica = datosKPI.no_aplica ? datosKPI.no_aplica : 0;
      const sumaAbsoluta = cantidadCargados + cantidadPendientes + cantidadNoAplica;

      const porcentajeCargados = sumaAbsoluta > 0 ? ((cantidadCargados / sumaAbsoluta) * 100).toFixed(1) : 0;
      const porcentajePendientes = sumaAbsoluta > 0 ? ((cantidadPendientes / sumaAbsoluta) * 100).toFixed(1) : 0;
      const totalLideres = datosMaestros.rendimiento_lideres ? datosMaestros.rendimiento_lideres.length : 0;

      document.getElementById("cc-kpi-total").textContent = sumaAbsoluta.toLocaleString("es-MX");
      document.getElementById("cc-kpi-cargados").textContent = cantidadCargados.toLocaleString("es-MX");
      document.getElementById("cc-kpi-pendientes").textContent = cantidadPendientes.toLocaleString("es-MX");

      document.getElementById("cc-kpi-pct-cargados").textContent = `${porcentajeCargados}% del total`;
      document.getElementById("cc-kpi-pct-pendientes").textContent = `${porcentajePendientes}% del total`;
      document.getElementById("cc-kpi-lideres").textContent = totalLideres;
   };

   const fnInicializar = () => {
      const contenedorDOM = document.getElementById("cc-chart-main");
      if (!contenedorDOM || typeof echarts === "undefined") return;

      graficaInstancia = echarts.init(contenedorDOM);
      window.addEventListener("resize", () => graficaInstancia ? graficaInstancia.resize() : null);

      document.querySelectorAll(".cc-tab-btn").forEach(boton => {
         boton.addEventListener("click", () => fnRenderizarPestana(boton.dataset.tab));
      });
   };

   const fnActualizar = (jsonBackend) => {
      const contenedorKPI = document.getElementById("cc-kpis-container");
      const contenedorGrafica = document.getElementById("cc-chart-card");
      if (!jsonBackend || Object.keys(jsonBackend).length === 0) {
         if (contenedorKPI) contenedorKPI.style.display = "none";
         if (contenedorGrafica) contenedorGrafica.style.display = "none";
         return;
      }

      datosMaestros = jsonBackend;
      if (!graficaInstancia) fnInicializar();
      if (contenedorKPI) contenedorKPI.style.display = "";
      if (contenedorGrafica) contenedorGrafica.style.display = "";

      fnActualizarKPIs(datosMaestros.totales_generales);
      fnRenderizarPestana(pestanaActiva);
      setTimeout(() => {
         if (graficaInstancia) graficaInstancia.resize();
      }, 100);
   };

   return {
      actualizar: fnActualizar ,
      obtenerConfiguracion: fnObtenerOpcionGrafica
   };

})();


const ccDashboardInfo = (() => {
   const colores = {
      naranja: "#f05523", gris: "#54565a", morado: "#20145f",
      azul: "#51c2eb", amarillo: "#fad91f", blanco: "#ffffff",
      borde: "#d0d1d3", grid: "#f0f1f2"
   };

   let graficaInstancia = null;
   let pestanaActiva    = "ejecucion";
   let datosMaestros    = {};
   let nivelBase        = "dia";
   let nivelActual      = "dia";
   let filtroActivo     = null;
   let clavesEjecucion  = [];
   let pilaNavegacion   = [];
   let sitioComportamientoSeleccionado = null;

   const fnFormatoMoneda = (valor) =>
      `$${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

   const fnFormatoMonedaCorta = (valor) => {
      const num = Number(valor);
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
      return `$${num.toFixed(0)}`;
   };

   const ejeValorBase = {
      type: "value",
      splitLine: { lineStyle: { color: colores.grid, type: "dashed" } },
      axisLabel: { fontSize: 10, color: colores.gris, formatter: (v) => fnFormatoMonedaCorta(v) },
      axisLine: { show: false },
      axisTick: { show: false }
   };

   const fn_parsearFecha = (fechaStr) => {
      const [d, m, a] = fechaStr.split("/");
      return new Date(Number(a), Number(m) - 1, Number(d));
   };

   const fn_detectarNivel = (lista) => {
      if (!lista.length) return "dia";
      const timestamps = lista.map(r => fn_parsearFecha(r.fecha).getTime());
      const diffDias = (Math.max(...timestamps) - Math.min(...timestamps)) / 86400000;
      if (diffDias <= 60) return "dia";
      if (diffDias <= 730) return "mes";
      return "año";
   };

   const fn_agregarPorMes = (lista) => {
      const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      const mapa = {};
      lista.forEach(r => {
         const f = fn_parsearFecha(r.fecha);
         const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
         if (!mapa[clave]) mapa[clave] = { fecha: `${MESES[f.getMonth()]} ${f.getFullYear()}`, clave, importe_producido: 0, importe_programado: 0 };
         mapa[clave].importe_producido += Number(r.importe_producido);
         mapa[clave].importe_programado += Number(r.importe_programado);
      });
      return Object.values(mapa).sort((a, b) => a.clave.localeCompare(b.clave));
   };

   const fn_agregarPorAnio = (lista) => {
      const mapa = {};
      lista.forEach(r => {
         const clave = String(fn_parsearFecha(r.fecha).getFullYear());
         if (!mapa[clave]) mapa[clave] = { fecha: clave, clave, importe_producido: 0, importe_programado: 0 };
         mapa[clave].importe_producido += Number(r.importe_producido);
         mapa[clave].importe_programado += Number(r.importe_programado);
      });
      return Object.values(mapa).sort((a, b) => a.clave.localeCompare(b.clave));
   };

   const fn_obtenerDatosEjecucion = () => {
      const listaCompleta = datosMaestros.por_fecha ? datosMaestros.por_fecha : [];
      let listaBase = listaCompleta;
      if (filtroActivo) {
         listaBase = listaCompleta.filter(r => {
            const f = fn_parsearFecha(r.fecha);
            const claveAnio = String(f.getFullYear());
            const claveMes = `${claveAnio}-${String(f.getMonth() + 1).padStart(2, "0")}`;
            return filtroActivo.length === 4 ? claveAnio === filtroActivo : claveMes === filtroActivo;
         });
      }
      if (nivelActual === "año") {
         const agregado = fn_agregarPorAnio(listaBase);
         clavesEjecucion = agregado.map(r => r.clave);
         return agregado;
      }
      if (nivelActual === "mes") {
         const agregado = fn_agregarPorMes(listaBase);
         clavesEjecucion = agregado.map(r => r.clave);
         return agregado;
      }
      clavesEjecucion = listaBase.map(r => r.fecha);
      return listaBase;
   };

   const fnOptEjecucion = (lista) => {
      const datos = lista ? lista : [];
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "axis",
            backgroundColor: colores.blanco,
            borderColor: colores.borde,
            borderWidth: 1,
            textStyle: { color: colores.morado, fontSize: 12 },
            formatter: (params) => {
               const fecha = params[0] ? params[0].name : "";
               let html = `<strong style="color:${colores.morado}">${fecha}</strong><br/>`;
               params.forEach(p => {
                  html += `<span style="color:${p.color};">● ${p.seriesName}: <b>${fnFormatoMoneda(p.value)}</b></span><br/>`;
               });
               if (nivelActual !== "dia") {
                  html += `<small style="color:${colores.gris};font-style:italic;">Clic para ver detalle</small>`;
               }
               return html;
            }
         },
         legend: { bottom: 0, itemWidth: 11, itemHeight: 8, textStyle: { fontSize: 11, color: colores.gris } },
         grid: { top: 32, left: 12, right: 30, bottom: 52, containLabel: true },
         dataZoom: [{ type: "inside", xAxisIndex: 0 }],
         xAxis: {
            type: "category",
            data: datos.map(r => r.fecha),
            axisLabel: { fontSize: 9, color: colores.gris, rotate: 30 },
            axisLine: { lineStyle: { color: colores.borde } },
            triggerEvent: true
         },
         yAxis: ejeValorBase,
         series: [
            {
               name: "Programado",
               type: "line",
               data: datos.map(r => r.importe_programado),
               smooth: true,
               symbol: "none",
               triggerLineEvent: true,
               lineStyle: { color: colores.azul, width: 2 },
               itemStyle: { color: colores.azul }
            },
            {
               name: "Producido",
               type: "line",
               data: datos.map(r => r.importe_producido),
               smooth: true,
               symbol: nivelActual !== "dia" ? "circle" : "none",
               symbolSize: 7,
               triggerLineEvent: true,
               lineStyle: { color: colores.naranja, width: 2 },
               itemStyle: { color: colores.naranja },
               areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(240,85,35,0.15)" }, { offset: 1, color: "rgba(240,85,35,0)" }] } }
            }
         ]
      };
   };

   const fn_actualizarBreadcrumb = () => {
      const btnVolver = document.getElementById("cc-ejecucion-volver");
      if (!btnVolver) return;
      if (!pilaNavegacion.length) {
         btnVolver.style.display = "none";
         return;
      }
      const textos = { "año": "años", "mes": "meses", "dia": "días" };
      const nivelAnterior = pilaNavegacion[pilaNavegacion.length - 1].nivel;
      btnVolver.textContent = `← Ver por ${textos[nivelAnterior]}`;
      btnVolver.style.display = "inline-block";
   };

   const fn_volverNivel = () => {
      if (!pilaNavegacion.length) return;
      const estadoAnterior = pilaNavegacion.pop();
      nivelActual  = estadoAnterior.nivel;
      filtroActivo = estadoAnterior.filtro;
      sitioComportamientoSeleccionado = estadoAnterior.sitio;
      pestanaActiva === "comportamiento" ? fn_renderizarComportamientoInteligente() : fn_renderizarEjecucionInteligente();
   };

   const fn_renderizarEjecucionInteligente = (resetear = false) => {
      if (resetear) {
         const listaCompleta = datosMaestros.por_fecha ? datosMaestros.por_fecha : [];
         nivelBase      = fn_detectarNivel(listaCompleta);
         nivelActual    = nivelBase;
         filtroActivo   = null;
         pilaNavegacion = [];
      }
      const lista = fn_obtenerDatosEjecucion();
      graficaInstancia.clear();
      graficaInstancia.setOption(fnOptEjecucion(lista), { notMerge: true });
      fn_actualizarBreadcrumb();
   };

   const fn_agregarComportamientoPorMes = (lista) => {
      const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      const mapa = {};
      lista.forEach(r => {
         const f = fn_parsearFecha(r.fecha);
         const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
         const key = `${clave}|${r.sitio}`;
         if (!mapa[key]) mapa[key] = { fecha: `${MESES[f.getMonth()]} ${f.getFullYear()}`, clave, sitio: r.sitio, importe: 0, programado: 0 };
         mapa[key].importe += Number(r.importe);
         mapa[key].programado += Number(r.programado);
      });
      return Object.values(mapa).sort((a, b) => a.clave.localeCompare(b.clave));
   };

   const fn_agregarComportamientoPorAnio = (lista) => {
      const mapa = {};
      lista.forEach(r => {
         const clave = String(fn_parsearFecha(r.fecha).getFullYear());
         const key = `${clave}|${r.sitio}`;
         if (!mapa[key]) mapa[key] = { fecha: clave, clave, sitio: r.sitio, importe: 0, programado: 0 };
         mapa[key].importe += Number(r.importe);
         mapa[key].programado += Number(r.programado);
      });
      return Object.values(mapa).sort((a, b) => a.clave.localeCompare(b.clave));
   };

   const fn_obtenerDatosComportamiento = () => {
      const listaCompleta = datosMaestros.por_fecha_sitio ? datosMaestros.por_fecha_sitio : [];
      let listaBase = listaCompleta;
      if (filtroActivo) {
         listaBase = listaCompleta.filter(r => {
            const f = fn_parsearFecha(r.fecha);
            const claveAnio = String(f.getFullYear());
            const claveMes = `${claveAnio}-${String(f.getMonth() + 1).padStart(2, "0")}`;
            return filtroActivo.length === 4 ? claveAnio === filtroActivo : claveMes === filtroActivo;
         });
      }
      if (nivelActual === "año") {
         const agregado = fn_agregarComportamientoPorAnio(listaBase);
         clavesEjecucion = [...new Set(agregado.map(r => r.clave))];
         return agregado;
      }
      if (nivelActual === "mes") {
         const agregado = fn_agregarComportamientoPorMes(listaBase);
         clavesEjecucion = [...new Set(agregado.map(r => r.clave))];
         return agregado;
      }
      clavesEjecucion = [...new Set(listaBase.map(r => r.fecha))];
      return listaBase;
   };

   const fn_renderizarComportamientoInteligente = (resetear = false) => {
      if (resetear) {
         const listaCompleta = datosMaestros.por_fecha_sitio ? datosMaestros.por_fecha_sitio : [];
         nivelBase      = fn_detectarNivel(listaCompleta);
         nivelActual    = nivelBase;
         filtroActivo   = null;
         sitioComportamientoSeleccionado = null;
         pilaNavegacion = [];
      }
      const lista = fn_obtenerDatosComportamiento();
      graficaInstancia.clear();
      graficaInstancia.setOption(fnOptComportamientoDiario(lista), { notMerge: true });
      fn_actualizarBreadcrumb();
   };

   const fnOptTiempos = (datos) => {
      const lista = datos ? datos : [];
      const paleta = [colores.naranja, colores.azul, colores.amarillo, colores.morado, colores.gris];
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "item",
            backgroundColor: colores.blanco,
            borderColor: colores.borde,
            borderWidth: 1,
            formatter: (p) => `<strong>${p.name}</strong><br/>${fnFormatoMoneda(p.value)}<br/><b>${p.percent}%</b>`
         },
         legend: { bottom: 0, itemWidth: 11, itemHeight: 8, textStyle: { fontSize: 11, color: colores.gris } },
         series: [{
            type: "pie",
            radius: ["40%", "70%"],
            center: ["50%", "45%"],
            data: lista.map((r, i) => ({ name: r.tipo, value: r.importe, itemStyle: { color: paleta[i % paleta.length] } })),
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold" } }
         }]
      };
   };

   const fnOptSitios = (datos) => {
      const lista = datos ? datos : [];
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: colores.blanco,
            borderColor: colores.borde,
            borderWidth: 1,
            formatter: (params) => `<strong>${params[0].name}</strong><br/>${fnFormatoMoneda(params[0].value)}`
         },
         grid: { top: 12, left: 12, right: 60, bottom: 12, containLabel: true },
         xAxis: ejeValorBase,
         yAxis: {
            type: "category",
            data: lista.map(r => r.sitio.length > 22 ? `${r.sitio.substring(0, 20)}…` : r.sitio),
            inverse: true,
            axisLabel: { fontSize: 9, color: colores.morado }
         },
         series: [{
            type: "bar",
            data: lista.map(r => r.importe),
            barMaxWidth: 20,
            itemStyle: { color: colores.naranja, borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: "right", fontSize: 9, color: colores.gris, formatter: (p) => fnFormatoMonedaCorta(p.value) }
         }]
      };
   };

   const fnOptLideres = (datos) => {
      const lista = datos ? datos : [];
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "axis",
            backgroundColor: colores.blanco,
            borderColor: colores.borde,
            borderWidth: 1,
            formatter: (params) => `<strong>${params[0].name}</strong><br/>${fnFormatoMoneda(params[0].value)}`
         },
         grid: { top: 32, left: 12, right: 30, bottom: 52, containLabel: true },
         xAxis: {
            type: "category",
            data: lista.map(r => r.lider.length > 15 ? `${r.lider.substring(0, 13)}…` : r.lider),
            axisLabel: { fontSize: 9, color: colores.morado, rotate: 25 },
            axisLine: { lineStyle: { color: colores.borde } }
         },
         yAxis: ejeValorBase,
         series: [{
            type: "bar",
            data: lista.map(r => r.importe),
            barMaxWidth: 45,
            itemStyle: { color: colores.naranja, borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: "top", fontSize: 9, color: colores.gris, formatter: (p) => fnFormatoMonedaCorta(p.value) }
         }]
      };
   };

   const fnOptComportamientoDiario = (datos) => {
      const lista = datos ? datos : [];
      if (!lista.length) return {};

      const paleta = [colores.naranja, colores.azul, colores.morado, "#4CAF50", "#9C27B0", colores.amarillo, "#FF5722", "#795548", "#607D8B", colores.gris];
      const fechas = [...new Set(lista.map(r => r.fecha))];
      const sitiosUnicos = [...new Set(lista.map(r => r.sitio))];

      const pivote = {};
      lista.forEach(r => {
         if (!pivote[r.sitio]) pivote[r.sitio] = {};
         pivote[r.sitio][r.fecha] = r.importe;
      });

      let series = [];
      let leyendaData = [];

      if (sitioComportamientoSeleccionado) {
            const datosSitio = lista.filter(r => r.sitio === sitioComportamientoSeleccionado);
            const pivote = {};
            datosSitio.forEach(r => pivote[r.fecha] = r);

            series = [
               {
                  name: "Programado " + sitioComportamientoSeleccionado,
                  type: "line",
                  smooth: true,
                  symbol: "none",
                  triggerLineEvent: true,
                  data: fechas.map(f => pivote[f] ? pivote[f].programado : 0),
                  lineStyle: { color: colores.azul, width: 2, type: 'dashed' },
                  itemStyle: { color: colores.azul }
               },
               {
                  name: "Producido Real " + sitioComportamientoSeleccionado,
                  type: "line",
                  smooth: true,
                  symbol: nivelActual !== "dia" ? "circle" : "none",
                  symbolSize: 7,
                  triggerLineEvent: true,
                  data: fechas.map(f => pivote[f] ? pivote[f].importe : 0),
                  lineStyle: { color: colores.naranja, width: 3 },
                  itemStyle: { color: colores.naranja },
                  areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(240,85,35,0.15)" }, { offset: 1, color: "rgba(240,85,35,0)" }] } }
               }
         ];
         leyendaData = ["Programado " + sitioComportamientoSeleccionado, "Producido Real " + sitioComportamientoSeleccionado];
      } 
      // CASO B: Vista General (Todos los sitios juntos)
      else {
         const sitiosUnicos = [...new Set(lista.map(r => r.sitio))];
         const pivote = {};
         lista.forEach(r => {
               if (!pivote[r.sitio]) pivote[r.sitio] = {};
               pivote[r.sitio][r.fecha] = r.importe;
         });

         series = sitiosUnicos.map((sitio, idx) => ({
               id: sitio, // ID oculto para saber el nombre original al darle click
               name: sitio.length > 20 ? `${sitio.substring(0, 18)}…` : sitio,
               type: "line",
               smooth: true,
               symbol: nivelActual !== "dia" ? "circle" : "none",
               symbolSize: 7,
               triggerLineEvent: true,
               connectNulls: false,
               data: fechas.map(f => pivote[sitio][f] ?? null),
               lineStyle: { color: paleta[idx % paleta.length], width: 2 },
               itemStyle: { color: paleta[idx % paleta.length] }
         }));
         leyendaData = sitiosUnicos.map(s => s.length > 20 ? `${s.substring(0, 18)}…` : s);
      }


      return {
         backgroundColor: "transparent",
         title: sitioComportamientoSeleccionado ? {
               text: `Frente: ${sitioComportamientoSeleccionado}`,
               left: 'center',
               top: 0,
               textStyle: { fontSize: 13, color: colores.morado }
         } : null,
         tooltip: {
               trigger: "axis",
               backgroundColor: colores.blanco,
               borderColor: colores.borde,
               borderWidth: 1,
               textStyle: { color: colores.morado, fontSize: 12 },
               formatter: (params) => {
                  const fecha = params[0] ? params[0].name : "";
                  let html = `<strong style="color:${colores.morado}">${fecha}</strong><br/>`;
                  params.forEach(p => {
                     if (p.value !== null && p.value !== undefined) {
                           html += `<span style="color:${p.color};">● ${p.seriesName}: <b>${fnFormatoMoneda(p.value)}</b></span><br/>`;
                     }
                  });
                  
                  if (!sitioComportamientoSeleccionado) {
                     html += `<small style="color:${colores.gris};font-style:italic; margin-top:5px; display:block;">👆 Clic en una línea para ver su Programado</small>`;
                  } else if (nivelActual !== "dia") {
                     html += `<small style="color:${colores.gris};font-style:italic; margin-top:5px; display:block;">Clic para ver detalle por fecha</small>`;
                  }
                  return html;
               }
         },
         legend: {
               bottom: 0, type: "scroll",
               data: leyendaData,
               itemWidth: 11, itemHeight: 8,
               textStyle: { fontSize: 10, color: colores.gris }
         },
         grid: { top: sitioComportamientoSeleccionado ? 40 : 32, left: 12, right: 30, bottom: 72, containLabel: true },
         dataZoom: [{ type: "inside", xAxisIndex: 0 }],
         xAxis: {
               type: "category",
               data: fechas,
               axisLabel: { fontSize: 9, color: colores.gris, rotate: 30 },
               axisLine: { lineStyle: { color: colores.borde } },
               triggerEvent: true
         },
         yAxis: ejeValorBase,
         series
      };
   };

   const fnOptOts = (datos) => {
      const lista = datos ? datos : [];
      const etiquetas = lista.map(r => r.ot.length > 22 ? `${r.ot.substring(0, 20)}…` : r.ot);
      return {
         backgroundColor: "transparent",
         tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: colores.blanco,
            borderColor: colores.borde,
            borderWidth: 1,
            formatter: (params) => {
               const nombre = params[0] ? params[0].name : "";
               let html = `<strong style="color:${colores.morado}">${nombre}</strong><br/>`;
               params.forEach(p => {
                  const val = p.seriesName === "Importe" ? fnFormatoMoneda(p.value) : Number(p.value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  html += `<span style="color:${p.color};">● ${p.seriesName}: <b>${val}</b></span><br/>`;
               });
               return html;
            }
         },
         legend: { bottom: 0, itemWidth: 11, itemHeight: 8, textStyle: { fontSize: 11, color: colores.gris } },
         grid: { top: 12, left: 12, right: 60, bottom: 32, containLabel: true },
         xAxis: [
            { ...ejeValorBase, name: "Importe", nameTextStyle: { fontSize: 9 } },
            {
               type: "value",
               splitLine: { show: false },
               axisLabel: { fontSize: 9, color: colores.gris, formatter: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v },
               axisLine: { show: false },
               axisTick: { show: false },
               name: "Volumen",
               nameTextStyle: { fontSize: 9 }
            }
         ],
         yAxis: {
            type: "category",
            data: etiquetas,
            inverse: true,
            axisLabel: { fontSize: 9, color: colores.morado }
         },
         series: [
            {
               name: "Importe",
               type: "bar",
               xAxisIndex: 0,
               data: lista.map(r => r.importe),
               barMaxWidth: 18,
               itemStyle: { color: colores.azul, borderRadius: [0, 4, 4, 0] },
               label: { show: true, position: "right", fontSize: 9, color: colores.gris, formatter: (p) => fnFormatoMonedaCorta(p.value) }
            },
            {
               name: "Volumen",
               type: "scatter",
               xAxisIndex: 1,
               data: lista.map(r => r.volumen),
               symbolSize: 8,
               itemStyle: { color: colores.naranja },
               label: { show: false }
            }
         ]
      };
   };

   const fnObtenerOpcion = (tab) => {
      const mapa = {
         "tiempos":         () => fnOptTiempos(datosMaestros.por_tipo_tiempo),
         "sitios":          () => fnOptSitios(datosMaestros.por_sitio),
         "lideres":         () => fnOptLideres(datosMaestros.por_lider),
         "ots":             () => fnOptOts(datosMaestros.por_ot),
      };
      return mapa[tab] ? mapa[tab]() : {};
   };

   const fnRenderizarPestana = (tab) => {
      if (!graficaInstancia) return;
      pestanaActiva = tab;
      document.querySelectorAll(".cc-tab-btn-info").forEach(btn => {
         btn.classList.toggle("active", btn.dataset.infoTab === tab);
      });
      const btnVolver = document.getElementById("cc-ejecucion-volver");
      if (tab === "ejecucion") {
         fn_renderizarEjecucionInteligente(true);
         return;
      }
      if (tab === "comportamiento") {
         fn_renderizarComportamientoInteligente(true);
         return;
      }
      if (btnVolver) btnVolver.style.display = "none";
      graficaInstancia.clear();
      graficaInstancia.setOption(fnObtenerOpcion(tab), { notMerge: true });
   };

   const fnActualizarKPIs = (resumen) => {
      if (!resumen) return;
      const total    = resumen.total_importe_producido || 0;
      const dias     = resumen.dias_unicos || 0;
      const promedio = dias > 0 ? total / dias : 0;

      document.getElementById("info-kpi-produccion").textContent  = fnFormatoMoneda(total);
      document.getElementById("info-kpi-promedio").textContent    = fnFormatoMoneda(promedio);
      document.getElementById("info-kpi-proyectos").textContent   = (resumen.proyectos_ejecutados || 0).toLocaleString("es-MX");
      document.getElementById("info-kpi-mejor-dia").textContent   = fnFormatoMoneda(resumen.mejor_dia_importe || 0);
      document.getElementById("info-kpi-mejor-dia-fecha").textContent = resumen.mejor_dia_fecha || "—";
   };

   const fnInicializar = () => {
      const contenedor = document.getElementById("cc-chart-info-main");
      if (!contenedor || typeof echarts === "undefined") return;
      if (graficaInstancia) return;

      const contenedorChart = document.getElementById("cc-chart-info");
      if (contenedorChart) {
         const btnVolver = document.createElement("button");
         btnVolver.id = "cc-ejecucion-volver";
         btnVolver.style.cssText = `display:none; margin-bottom:6px; background:transparent; border:1px solid ${colores.borde}; color:${colores.morado}; font-size:11px; padding:3px 10px; border-radius:4px; cursor:pointer;`;
         btnVolver.addEventListener("click", fn_volverNivel);
         contenedorChart.parentNode.insertBefore(btnVolver, contenedorChart);
      }

      graficaInstancia = echarts.init(contenedor);
      window.addEventListener("resize", () => { if (graficaInstancia) graficaInstancia.resize(); });

      graficaInstancia.on("click", (params) => {
         if (pestanaActiva !== "ejecucion" && pestanaActiva !== "comportamiento") return;

         let actualizarRender = false;
         let sitioClickeado = null;
         let fechaClickeada = null;

         if (params.componentType === "series") {
            if (pestanaActiva === "comportamiento" && !sitioComportamientoSeleccionado) {
               sitioClickeado = params.seriesId || params.seriesName;
            }
            if (nivelActual !== "dia") {
               fechaClickeada = clavesEjecucion[params.dataIndex];
            }
         } 
         else if (params.componentType === "xAxis" && nivelActual !== "dia") {
            const xData = graficaInstancia.getOption().xAxis[0].data;
            const index = xData.indexOf(params.value);
            if (index !== -1) {
               fechaClickeada = clavesEjecucion[index];
            }
         }

         if (sitioClickeado || fechaClickeada) {
            pilaNavegacion.push({ 
               nivel: nivelActual, 
               filtro: filtroActivo, 
               sitio: sitioComportamientoSeleccionado 
            });
            
            if (sitioClickeado) {
               sitioComportamientoSeleccionado = sitioClickeado;
            }
            if (fechaClickeada) {
               filtroActivo = fechaClickeada;
               nivelActual  = nivelActual === "año" ? "mes" : "dia";
            }
            
            actualizarRender = true;
         }

         if (actualizarRender) {
            pestanaActiva === "ejecucion" ? fn_renderizarEjecucionInteligente() : fn_renderizarComportamientoInteligente();
         }
      });

      document.querySelectorAll(".cc-tab-btn-info").forEach(btn => {
         btn.addEventListener("click", () => fnRenderizarPestana(btn.dataset.infoTab));
      });
   };

   const fnActualizar = (dashboard) => {
      const contenedorKPI    = document.getElementById("cc-kpis-info");
      const contenedorChart  = document.getElementById("cc-chart-info");

      if (!dashboard || Object.keys(dashboard).length === 0) {
         if (contenedorKPI) contenedorKPI.style.display = "none";
         if (contenedorChart) contenedorChart.style.display = "none";
         return;
      }

      datosMaestros = dashboard;
      if (!graficaInstancia) fnInicializar();

      if (contenedorKPI) contenedorKPI.style.display = "";
      if (contenedorChart) contenedorChart.style.display = "";

      fnActualizarKPIs(datosMaestros.resumen);
      fnRenderizarPestana(pestanaActiva);
      setTimeout(() => { if (graficaInstancia) graficaInstancia.resize(); }, 100);
   };

   const fnCapturarGraficas = (tabsSeleccionadas) => {
      if (!graficaInstancia || !tabsSeleccionadas || tabsSeleccionadas.length === 0) return [];

      const opcionesPorTab = {
         "ejecucion":      () => fnOptEjecucion(fn_obtenerDatosEjecucion()),
         "comportamiento": () => fnOptComportamientoDiario(fn_obtenerDatosComportamiento()),
         "tiempos":        () => fnOptTiempos(datosMaestros.por_tipo_tiempo),
         "sitios":         () => fnOptSitios(datosMaestros.por_sitio),
         "lideres":        () => fnOptLideres(datosMaestros.por_lider),
      };

      const nombresPorTab = {
         "ejecucion":      "Ejecución",
         "comportamiento": "Comportamiento Diario",
         "tiempos":        "Tiempos",
         "sitios":         "Sitios",
         "lideres":        "Líderes",
      };

      const imagenes = [];
      tabsSeleccionadas.forEach(tab => {
         const fnOpc = opcionesPorTab[tab];
         if (!fnOpc) return;
         const opcion = fnOpc();
         opcion.animation = false;
         graficaInstancia.clear();
         graficaInstancia.setOption(opcion, { notMerge: true });
         imagenes.push({
            "nombre": nombresPorTab[tab] || tab,
            "imagen": graficaInstancia.getDataURL({ type: "png", backgroundColor: "#ffffff", pixelRatio: 2 })
         });
      });

      fnRenderizarPestana(pestanaActiva);
      return imagenes;
   };

   return { fnActualizar, fnInicializar, fnCapturarGraficas };
})();