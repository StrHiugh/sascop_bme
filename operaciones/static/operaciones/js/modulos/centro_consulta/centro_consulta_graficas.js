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
            ...tooltipBase,
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (parametros) => {
               const fila = listaValida[parametros[0].dataIndex];
               const total = fila.cargados + fila.pendientes;
               const porcentaje = total > 0 ? ((fila.cargados / total) * 100).toFixed(0) : 0;
               return `<b style="color:${colores.morado}">${fila[llaveNombre]}</b><br>
                  <Cargados: <b style="color:${colores.naranja}">${fila.cargados}</b><br>
                  Pendientes: <b style="color:${colores.gris}">${fila.pendientes}</b><br>
                  Total: <>b>${total}</b> · Avance: <b style="color:${colores.naranja}">${porcentaje}%</b>`;
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
         tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" } },
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
   const fnOptDonut = (datos, llaveNombre) => {
      const listaValida = datos ? datos : [];
      const paletaDinamica = [
         colores.naranja,
         colores.azul,
         colores.amarillo,
         colores.morado,
         colores.gris,
         "#4bc0c0",
         "#ff9f40",
         "#9966ff",
         "#e83e8c",
         "#28a745"
      ];

      return {
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
               name: "Distribución",
               type: "pie",
               radius: ["40%", "70%"],
               itemStyle: { borderRadius: 10, borderColor: colores.blanco, borderWidth: 2 },
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
   };

   const fnOptEmbudo = (datos) => {
      const listaValida = datos ? datos : [];
      return {
         backgroundColor: "transparent",
         tooltip: { ...tooltipBase, trigger: "item" },
         series: [
            {
               name: "Embudo Operativo",
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
         "origenes": () => fnOptDonut(datosMaestros.distribucion_origenes, "origen"),
         "documentos": () => fnOptHorizontales(datosMaestros.tipos_documentos, "documento"),
         "clientes": () => fnOptBarras(datosMaestros.estatus_clientes, "cliente"),
         "folios": () => fnOptHorizontales(datosMaestros.avance_folios, "folio"),
         "frentes": () => fnOptDonut(datosMaestros.frentes_ot, "frente"),
         "sitios": () => fnOptDonut(datosMaestros.sitios_ot, "sitio"),
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

   const fnActualizarKPIs = (totales) => {
      const datosKPI = totales ? totales : { cargados: 0, pendientes: 0 };
      const sumaTotal = datosKPI.cargados + datosKPI.pendientes;

      const porcentajeCargados = sumaTotal > 0 ? ((datosKPI.cargados / sumaTotal) * 100).toFixed(1) : 0;
      const porcentajePendientes = sumaTotal > 0 ? ((datosKPI.pendientes / sumaTotal) * 100).toFixed(1) : 0;
      const totalLideres = datosMaestros.rendimiento_lideres ? datosMaestros.rendimiento_lideres.length : 0;

      document.getElementById("cc-kpi-total").textContent = sumaTotal.toLocaleString("es-MX");
      document.getElementById("cc-kpi-cargados").textContent = datosKPI.cargados.toLocaleString("es-MX");
      document.getElementById("cc-kpi-pendientes").textContent = datosKPI.pendientes.toLocaleString("es-MX");

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

   return { actualizar: fnActualizar };

})();