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

   const fnOptEjecucion = (datos) => {
      const lista = datos ? datos : [];
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
               return html;
            }
         },
         legend: { bottom: 0, itemWidth: 11, itemHeight: 8, textStyle: { fontSize: 11, color: colores.gris } },
         grid: { top: 32, left: 12, right: 30, bottom: 52, containLabel: true },
         xAxis: {
            type: "category",
            data: lista.map(r => r.fecha),
            axisLabel: { fontSize: 9, color: colores.gris, rotate: 30 },
            axisLine: { lineStyle: { color: colores.borde } }
         },
         yAxis: ejeValorBase,
         series: [
            {
               name: "Programado",
               type: "line",
               data: lista.map(r => r.importe_programado),
               smooth: true,
               symbol: "none",
               lineStyle: { color: colores.azul, width: 2 },
               itemStyle: { color: colores.azul }
            },
            {
               name: "Producido",
               type: "line",
               data: lista.map(r => r.importe_producido),
               smooth: true,
               symbol: "circle",
               symbolSize: 5,
               lineStyle: { color: colores.naranja, width: 2 },
               itemStyle: { color: colores.naranja },
               areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(240,85,35,0.15)" }, { offset: 1, color: "rgba(240,85,35,0)" }] } }
            }
         ]
      };
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

      const series = sitiosUnicos.map((sitio, idx) => ({
         name: sitio.length > 20 ? `${sitio.substring(0, 18)}…` : sitio,
         type: "line",
         smooth: true,
         symbol: "none",
         connectNulls: false,
         data: fechas.map(f => pivote[sitio][f] ?? null),
         lineStyle: { color: paleta[idx % paleta.length], width: 2 },
         itemStyle: { color: paleta[idx % paleta.length] }
      }));

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
                  if (p.value !== null && p.value !== undefined) {
                     html += `<span style="color:${p.color};">● ${p.seriesName}: <b>${fnFormatoMoneda(p.value)}</b></span><br/>`;
                  }
               });
               return html;
            }
         },
         legend: {
            bottom: 0, type: "scroll",
            itemWidth: 11, itemHeight: 8,
            textStyle: { fontSize: 10, color: colores.gris }
         },
         grid: { top: 32, left: 12, right: 30, bottom: 72, containLabel: true },
         xAxis: {
            type: "category",
            data: fechas,
            axisLabel: { fontSize: 9, color: colores.gris, rotate: 30 },
            axisLine: { lineStyle: { color: colores.borde } }
         },
         yAxis: ejeValorBase,
         series
      };
   };

   const fnObtenerOpcion = (tab) => {
      const mapa = {
         "ejecucion":       () => fnOptEjecucion(datosMaestros.por_fecha),
         "comportamiento":  () => fnOptComportamientoDiario(datosMaestros.por_fecha_sitio),
         "tiempos":         () => fnOptTiempos(datosMaestros.por_tipo_tiempo),
         "sitios":          () => fnOptSitios(datosMaestros.por_sitio),
         "lideres":         () => fnOptLideres(datosMaestros.por_lider),
      };
      return mapa[tab] ? mapa[tab]() : {};
   };

   const fnRenderizarPestana = (tab) => {
      if (!graficaInstancia) return;
      pestanaActiva = tab;
      document.querySelectorAll(".cc-tab-btn-info").forEach(btn => {
         btn.classList.toggle("active", btn.dataset.infoTab === tab);
      });
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

      graficaInstancia = echarts.init(contenedor);
      window.addEventListener("resize", () => { if (graficaInstancia) graficaInstancia.resize(); });

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

   return { fnActualizar, fnInicializar };
})();