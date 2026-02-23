/* =============================================================================
   centro_consulta_graficas.js
============================================================================= */

const ccDashboard = (() => {

   // ── Paleta Institucional ──────────────────────────────────────────────────
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
               paletaDinamica[indiceItem % paletaDinamica.length]
               }
            }))
         }
      ]
   };

   // Si es la gráfica de sitios, aplicamos configuración especial
   if (esGraficaSitios) {
      const cantidadElementos = listaValida.length;
      const totalSitios = cantidadElementos;

      return {
         ...configBase,
         // Título personalizado - usando title en lugar de graphic (más confiable)
         title: {
            text: `{big|${totalSitios.toLocaleString('es-MX')}}\n{small|sitios}`,
            top: 15,
            right: 20,
            textStyle: {
               rich: {
                  big: {
                     fontSize: 32,
                     fontWeight: 'bold',
                     color: colores.morado,
                     lineHeight: 40
                  },
                  small: {
                     fontSize: 12,
                     color: colores.gris,
                     fontWeight: 'normal'
                  }
               }
            },
            textAlign: 'right'
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
            orient: 'horizontal',
            align: 'left'
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