/*
 * __filename__   : registro_actividad.js
 * __author__     : Armando Perera
 * __copyright__  : Armando Perera
 * __description__: Funciones para logs en el sistema.
 * __version__    : 1.0.0
 * __app__        : SASCOP
*/


class RegistroActividad{

	constructor(tabla_log, registro_id, evento){
		this._tabla_log = tabla_log; // Id de la tabla o vista
		this._registro_id = registro_id; // Id del registro afectado
		this._evento = evento; // Evento a aplicar

		this._actuales_lista = []; // Lista que guarda los objetos antes de ser manipulados.

		this._temp = {}; // Cambios temporales en para campos temporales
		this._cambios = []; // Cambios entre la versión inicial y la versión final del formulario
		this._cambios_lista = []; // Cambios entre la versión inicial y la versión final de las listas proporcionadas

		this._renombra = ["Seleccione", undefined]
		this._campos_dependientes = {
		}
	}

	actualiza_registro_id(id){ this._registro_id = id; }

	actualiza_tabla_log( tabla_log ){ this._tabla_log = tabla_log; }

	agregar_actividad(actividad, reset_cambios) {
		if (reset_cambios){ this._cambios = []; }
		this._cambios.push(actividad);
	}

	transforma_cambios(f){ this._cambios = this._cambios.map(f); }

	campos(formulario, ordenado){
		let campos = $(formulario).serializeArray(),
			 valores_formulario = ordenado ? [] : {},
			 valores_duplicados = [];

		for (let c in campos){
			const campo = campos[c], query = `${formulario} [name="${campo.name}"]`,
					input = $(query)[0];
			let valor = null;

			if(input.type == "hidden" || valores_duplicados.includes(campo.name)){ continue }

			if (input.type == "select-multiple") {
				let v_temp = $(query).select2('data');
				valor = v_temp.map(e => e.text.trim()).join(" - ");
				valores_duplicados.push(campo.name);
			}
			else if(input.type == "select-one"){ valor = $(`${query} option:selected`).text(); }
			else if(input.type == "radio"){ valor = $(`${query}:checked`).parent('label').text(); }
			else { valor = input.value }

			if (ordenado) {
				// Ordena los campos, si de este dependen otros campos, se agregar a los primeros.
				const nuevo_campo = { nombre: campo.name,  valor: valor.trim() },
				dependiente = Object.values(this._campos_dependientes).includes(campo.name);

				nuevo_campo["dependiente"] = this._campos_dependientes[campo.name];
				dependiente ? valores_formulario.unshift(nuevo_campo) : valores_formulario.push(nuevo_campo);

			}
			else { valores_formulario[campo.name] = valor.trim(); }
		}

		return valores_formulario
	}

	registra_actuales(formulario, id){
		if (id){ this._registro_id = id; }
		this._actuales = this.campos(formulario);
		this._cambios = [];
	}

	detecta_cambios(formulario){
		this._cambios = [];
		const campos = this.campos(formulario, true);

		for(let c in campos){

			const campo = campos[c], nombre = campo.nombre, valor = campo.valor;
			this._temp[nombre] = valor;

			if (this.campo_dependiente(nombre)){ continue }

			if (valor != this._actuales[nombre]) {
				this._cambios.push({
					nombre: nombre,
					valor_anterior: this._renombra.includes(this._actuales[nombre]) ? "" : this._actuales[nombre],
					valor_actual: this._renombra.includes(valor) ? "" : valor,
					detalle: ""
				});

			}

		}
		this._temp = {};
	}

	registra_lista_actuales(lista){
		lista.forEach(e => this._actuales_lista.push( Object.freeze(e) ) );
	}

	detecta_cambios_lista(lista, config){
		if(config.reset_cambios_lista){ this._cambios_lista = []; }

		const arrays = this._actuales_lista.concat(lista),
				ids = new Set( arrays.map(e => e[config.id]) );
		let cambios = [];

		for (let i of ids) {

			const q = e => e[config.id] == i,
					f = e => Array.isArray(e) ? e.join(" - ") : e,
				   existencia_anterior = this._actuales_lista.find(q),
				   existencia_actual = lista.find(q);

			let accion = null, detalle = config.detalle, valor = config.valor;

			if (existencia_actual && existencia_anterior) {

				if (existencia_actual[valor] == existencia_anterior[valor]) { continue }
				accion = "modificar_";
				detalle = detalle ?  existencia_actual[detalle] : "" ;
			}
			else if(existencia_actual && !existencia_anterior){
				accion = "agregar_";
				detalle = detalle ?  existencia_actual[detalle] : "" ;
			}
			else if(!existencia_actual && existencia_anterior){
				accion = "eliminar_";
				detalle = detalle ?  existencia_anterior[detalle] : "" ;
			}

			this._cambios_lista.push({
				nombre: accion + config.nombre,
				valor_anterior: f(existencia_anterior ? existencia_anterior[valor] : ""),
				valor_actual: f(existencia_actual ? existencia_actual[valor] : ""),
				detalle: detalle + ", " + (config.detalle_texto ? config.detalle_texto : "")
			});
		}

	}

	campo_dependiente(campo){
		if (!this._campos_dependientes[campo]){ return false }

		const campo_a_depender = this._campos_dependientes[campo];

		if (this._actuales[campo_a_depender] != this._temp[campo_a_depender]) { return true }
		else { return false }
	}

	guardar_registros(formulario){
		const campos = this.campos(formulario);

		for(let c in campos){

			const campo = campos[c];

			if (this._renombra.includes(campo)) { continue }

			if (campo != "") {

				this._cambios.push({
					nombre: c,
					valor_anterior: "",
					valor_actual: campo,
					detalle: ""
				});

			}
		}
	}

	serializa(formulario, extra, f, obtener_cambios=true){

		let campos_formulario = $(formulario).serializeArray();

		if (this._evento == "REGISTRAR" && obtener_cambios) { this.guardar_registros(formulario); }
		else if (obtener_cambios){ this.detecta_cambios(formulario); }

		if (f) { this.transforma_cambios(f); }

		let form = campos_formulario.reduce((campos, c) => {

			if (campos[c.name]) {
				campos[c.name] = Array.isArray(campos[c.name]) ? campos[c.name] : [campos[c.name]];
				campos[c.name].push(c.value);
			}
			else{ campos[c.name] = c.value; }

			return campos;

		}, {});


		for (let c in form){
			// En este bloque se detectan los select agrupadores y se les da el siguiente formato => 1, 2, 3
			// Replantear en caso de necesitar el cambio de " por ' en el selector multiple
			// replace(/(\[)|(\])|("\d")|(")/g, (m, p1, p2, p3, p4) => p4 ? '\'' : '' );

			if ( Array.isArray(form[c]) ) {
				form[c] = JSON.stringify(form[c]).replace(/(\[)|(\])|(")/g, "");
			}
		}

		let datos = extra ? $.extend({}, form, extra ) : form ;

		datos.registro_actividad = this.actividad ? JSON.stringify(this.actividad) : {};

		return datos;
	}

	get actividad(){

		if (!this._cambios.length && !this._cambios_lista.length){ return null }

		let cambios = this._cambios_lista.length > 0
			 ? this._cambios_lista.concat(this._cambios)
			 : this._cambios ;

		return {
			cambios: cambios,
			tabla_log: this._tabla_log,
			registro_id: this._registro_id,
			evento: this._evento
		}

	}

	get cambios(){ return this._cambios }
	get cambios_lista(){ return this._cambios_lista }

}



const FORMATEA_EVENTO = [
	{
    	campos: ["proceso_nomina_individual_automatica", "proceso_nomina_individual", "proceso_nomina_ente"],
    	str_g: "<$ Procesó $> la nómina #(proceso_nomina_individual_automatica|automáticamente:) de <$ #detalle_evento $>",
    	str_i: "<$ Procesó $> la nómina #(proceso_nomina_individual_automatica|automáticamente:)"
	},
	{
    	campos: ["descarte_masivo_conceptos"],
		str_g: "Se <$ eliminó $> con la <$ #detalle_evento $> el concepto: <$ #valor_anterior $> del perfil <$ #valor_actual $>",
		str_i: "Se <$ eliminó $> con la <$ #detalle_evento $> el concepto: <$ #valor_anterior $>"
	},
	{
    	campos: ["registro_tipo_trabajador"], str_g: "<$ Creó $> el tipo de trabajador <$ #detalle_evento $>"
	},
	{
    	campos: ["registro_pension", "registro_descuento"],
    	str_g: "<$ Creó $> #(registro_pension|la pension alimenticia:el descuento mercantil) del empleado <$ #0 $> con el #(registro_pension|beneficiario:acreedor) <$ #1 $>"
	},
	{
    	campos: ["estatus_pension_lista_activar", "estatus_pension_lista_desactivar"],
    	str_g: "<$ #(estatus_pension_lista_activar|Activó:Desactivó) $> el descuento #valor_actual, empleado #detalle_evento",
    	str_i: "<$ #(estatus_pension_lista_activar|Activó:Desactivó) $> el descuento"
	},
	{
    	campos: ["estatus_pension_lista_bono_activar", "estatus_pension_lista_bono_desactivar"],
    	str_g: "<$ #(estatus_pension_lista_bono_activar|Activó:Desactivó) $> para bono el descuento #valor_actual, empleado #detalle_evento",
    	str_i: "<$ #(estatus_pension_lista_bono_activar|Activó:Desactivó) $> para bono el descuento"
	},
	{
    	campos: ["estatus_juicio_lista_activar", "estatus_juicio_lista_desactivar"],
    	str_g: "<$ #(estatus_juicio_lista_activar|Activó:Desactivó) $> el descuento #valor_actual, empleado #detalle_evento",
    	str_i: "<$ #(estatus_juicio_lista_activar|Activó:Desactivó) $> el descuento"
	},
	{
    	campos: ["estatus_juicio_lista_bono_activar", "estatus_juicio_lista_bono_desactivar"],
    	str_g: "<$ #(estatus_juicio_lista_bono_activar|Activó:Desactivó) $> para bono el descuento #valor_actual, empleado #detalle_evento",
		str_i: "<$ #(estatus_juicio_lista_bono_activar|Activó:Desactivó) $> para bono el descuento"
	},
	{
    	campos: ["eliminar_pension", "eliminar_descuento"],
		str_g: "<$ Eliminó $> #(eliminar_pension|la pensión alimenticia:el descuento mercantil) del empleado <$ #0 $> con el #(eliminar_pension|beneficiario:acreedor) <$ #1 $>"
	},
	{
    	campos: ["apertura_nomina_lista", "cierre_nomina_lista", "apertura_nomina_vista", "cierre_nomina_vista"],
    	str_g: "<$ #(cierre_nomina_lista:cierre_nomina_vista|Cerró:Abrió) $> la nómina <$ #0 $>  del periodo <$ #1 #2  $> del ente <$ #3  $>  desde la #(apertura_nomina_vista:cierre_nomina_vista|vista:lista)"
	},
	{
    	campos: ["agregar_concepto_categoria", "eliminar_concepto_categoria"],
    	str_g: "<$ #(agregar_concepto_categoria|Agregó:Eliminó) $> el concepto <$ #(agregar_concepto_categoria|#valor_actual:#valor_anterior) $> a la categoría <$ #0 $> con el monto <$ #1 $>",
    	str_i: "<$ #(agregar_concepto_categoria|Agregó:Eliminó) $> el concepto <$ #(agregar_concepto_categoria|#valor_actual:#valor_anterior) $>"
	},
	{
    	campos: ["modificar_concepto_categoria"],
    	str_g: "<$ Modificó $> el importe del concepto <$ #1 $> a la categoría <$ #0 $> de <$ #valor_anterior $> a <$ #valor_actual $>. "
	},
	{
    	campos: ["modificar_calculo_categoria"],
    	str_g: "<$ Modificó $> el cálculo de la categoría <$ #valor_actual $> con los siguientes valores #detalle_evento.",
    	str_i: "<$ Modificó $> el cálculo con los siguientes valores <$ #detalle_evento $>.",
	},
	{
    	campos: ["agregar_partida_presupuestal_tabular", "eliminar_partida_presupuestal_tabular"],
    	str_g: "<$ #(agregar_partida_presupuestal_tabular|Agregó:Eliminó) $> la partida presupuestal <$ #(agregar_partida_presupuestal_tabular|#valor_actual:#valor_anterior) $> con nombramiento <$ #0 $> al concepto <$ #1 $>",
	},
	{
    	campos: ["modificar_partida_presupuestal_tabular"],
    	str_g: "<$ Modificó $> la partida presupuestal de <$ #valor_actual $> a <$ #valor_anterior $> del nombramiento <$ #0 $> al concepto <$ #1 $>"
	},
	{	
		campos: ["historico_perfil_banco", "historico_perfil_cuenta_bancaria", "historico_perfil_clabe_bancaria", "historico_perfil_forma_pago"], 
		str_i: "<$ Reasignó $> el dato #campo <$ #valor_anterior $> a <$ #valor_actual $> ",
		str_g: "<$ Reasignó $> el dato #campo <$ #valor_anterior $> a <$ #valor_actual $>  del empleado <$ #detalle_evento $>"  
	},
	{
    	campos: ["historico_perfil_descuento"],
    	str_i: "<$ Reasignó $> el registro <$ #valor_anterior $> a <$ #valor_actual $> ",
		str_g: "<$ Reasignó $> el registro <$ #valor_anterior $> a <$ #valor_actual $>  del empleado <$ #detalle_evento $>"  
	},
	{
    	campos: ["historico_perfil_reasignar"],
    	str_i: "<$ Restableció $> los datos <$ #valor_actual $> ",
		str_g: "<$ Restableció $> los datos <$ #valor_actual $> del empleado <$ #detalle_evento $>"  
	},
	{
		campos: ["registro_pension_v2"],
		str_g: "<$ Creó $> la PENSIÓN ALIMENTICIA del empleado <$ #valor_anterior_vacio $>, con beneficiario <$ #valor_actual_vacio $>, #detalle_evento"  
	},
	{
		campos: ["registro_juicio_v2"],
		str_g: "<$ Creó $> el DESCUENTO MERCANTIL del empleado <$ #valor_actual_vacio $>, con el acreedor <$ #valor_anterior_vacio $>, #detalle_evento"  
	},
	{
		campos: ["CREAR"], str_g: "<$ Creó $> #detalle_evento <$ #valor_actual $>"
	},
	{
		campos: ["CLONAR"], str_g: "<$ Clonó $> #detalle_evento"
	},
	{
		campos: ["REGISTRAR"], str_g: "<$ Registró $> #detalle_evento"
   },
   {
      campos: ["ELIMINAR"], str_g: "<$ Eliminó $> #detalle_evento #valor_anterior"
   },
	{
		campos: ["INSERTAR"], str_g: "<$ Insertó $> #detalle_evento"
	},
	{
		campos: ["APLICAR"], str_g: "<$ Aplicó $> #detalle_evento"
	},
	{
		campos: ["TRANSFERIR"], str_g: "<$ Transfirió $> #detalle_evento"
	},
	{
		campos: ["AÑADIR"], str_g: "<$ Se añadió $> #detalle_evento"
	},
	{
    	campos: ["MODIFICAR", "NOMBRE VARIABLE CONFLICTO"], str_g: "<$ Modificó $> el campo #campo de <$ #valor_anterior $> a <$ #valor_actual $> #detalle_evento"
	},
   {
    	campos: ["MODIFICAR PERFIL NOMINA"], str_g: "<$ Modificó $> el campo #campo de <$ #valor_anterior $> a <$ #valor_actual $> #detalle_evento"
   },
	{
		campos: ["MEZCLAR"], str_g: "<$ Mezcló $> #detalle_evento"
	},
	{
   	campos: ["ACTUALIZAR"], str_g: "<$ Actualizó $> #detalle_evento"   	
	},
	{
		campos: ["IMPORTAR"], str_g: "<$ Importó $> #detalle_evento"   	
	},
	{
		campos: ["ACTUALIZACION"], str_g: "La columna <$ #campo $> #detalle_evento"   	
   },
   {
   		campos: ["modificar_compensacion_garantizada"],
   		str_g: "<$ Modificó $> el campo #campo de <$ #valor_anterior $> a <$ #valor_actual $> en la categoría <$ #detalle_evento $>",
   		str_i: "<$ Modificó $> el campo #campo de <$ #valor_anterior $> a <$ #valor_actual $>"
   },
   {
	   campos: ["reactivar_descuento"], str_g: "<$ Reactivó $> #campo #detalle_evento"
   },
   {
		campos: ["nomina_cerrada"],
		str_g: "<$ Cerró $> la nómina <$ #detalle_evento $>",
		str_i: "<$ Cerró $> la nómina <$ #detalle_evento $>",
   },
   {
		campos: ["abrir_nomina"],
		str_g: "<$ Abrió $> la nomina #detalle_evento",
   },
   {
		campos: ["procesar_perfil"],
		str_g: "<$ Procesó $> el empleado #detalle_evento",
		str_i: "<$ Procesó $> el empleado #detalle_evento",
   },
   {
		campos: ["procesar_reintegro", "procesar_recalculo"],
		str_g: "<$ Procesó $> #detalle_evento",
		str_i: "<$ Procesó $> #detalle_evento",
   },
   {
		campos: ["PROCESAR"],
		str_g: "<$ Procesó $> todos los perfiles de la nómina #detalle_evento"
   },
   {
		campos: ["CERRAR"],
		str_g: "<$ Cerró $> la nómina #detalle_evento"
   },
	{
		campos: ["eliminar_perfil"],
		str_g: "<$ Eliminó $> el empleado #detalle_evento",
		str_i: "<$ Eliminó $> el empleado #detalle_evento",
   },
	{
		campos: ["Activó", "Desactivó", "ACTIVÓ", "DESACTIVÓ", "DESACTIVAR", "ACTIVAR"],
		str_g: "<$ #campo $> #detalle_evento",
		str_i: "<$ #campo $> #detalle_evento",
   },
	{
		campos: ["migraciones_bonos"],
		str_g: "<$ Migró $> la nómina #detalle_evento",
		str_i: "<$ Migró $> la nómina #detalle_evento",
	},
	{
		campos: ["concepto"],
		str_g: "Concepto <$ #detalle_evento $>",
		str_i: "Concepto <$ #detalle_evento $>",
	},
	{
		campos: ["ajuste_presupuestal"],
		str_g: "Se ajustó el presupuesto con los filtros: <$ #detalle_evento $>"
	},
	{
		campos: ["ajuste_presupuestal_contador"],
		str_g: "Se ajustó el presupuesto de <$ #valor_anterior $> a <$ #valor_actual $>"
	},
	{
	campos: ["nueva_plantilla"],
	str_g: "Creó una nómina de tipo <$ #detalle_evento $>",
	str_i: "Creó una nómina de tipo <$ #detalle_evento $>",
	},
	{
		campos: ["GENERÓ", "CANCELAR", "TIMBRAR", "MIGRAR", "ESTATUS PERIODO", "MODIFICAR ASIGNACIÓN", "REABRIR", "AMPLIAR", "REDUCIR"],
		str_g: "<$ #campo $> #detalle_evento",
	},
	{
		campos: ["INVITAR"],
		str_g: "<$ Invitó $> al usuarió <$#campo$> #detalle_evento",
	},
	{
		campos: ["MODIFICAR PENSION", "MODIFICAR JUICIO"],
		str_g: "<$ Modificó $> el campo <$ #campo $> de #valor_anterior_vacio a <$ #valor_actual_vacio $> #detalle_evento",
		str_i: "<$ Modificó $> el campo <$ #campo $> de #valor_anterior_vacio a <$ #valor_actual_vacio $> "
	},
	{
		campos: ["BORRAR"],
		str_g: "Se <$ Borró $> valor <$#campo$> de #valor_anterior a #valor_actual #detalle_evento ",
	},
	{
		campos: ["CALCULAR"],
		str_g: "<$ Cálculo $> #detalle_evento",
	},
],

estiliza_campo = {
	// 0 - Concepto Tabulador
	"0":{},
	// 1 - Variable
	"1":{
		"nombre_variable": "nombre de la variable",
		"nombre sistema": "nombre asignado por el sistema",
	},
	"2": {},
	"3": {},
	"4": {},
	"5": {
		"reactivar_descuento": "la pensión alimenticia",
		"razon_social" : "Razón social",
		"nombre_comercial" : "Nombre",
		"registro_fiscal": "Registro Fiscal",
		"dir_telefono" : "Teléfono",
		"dir_movil": "Celular",
		"dir_email": "Correo Electrónico",
		"tipo_persona_id" :"Tipo de persona",
		"regimen_fiscal_id": "Régimen fiscal",
		"curp": "CURP",
		"pais_id": "País",
		"estado_id": "Estado",
		"municipio_id" : "Municipio",
		"localidad_id" : "Localidad",
		"dir_calle": "Calle",
		"dir_num_ext": "Núm. exterior",
		"dir_num_int": "Núm. interior",
		"dir_colonia": "Colonia",
		"dir_cp" : "Código postal"
	},
	// 6 - Descuento Mercantil
	"6": {
		"reactivar_descuento": "el descuento mercantil"
	},
	"7": {},
	// 8 - Categoria
	"8": {
		"tipo_general_id": "tipo categoría",
		"hora_equivalente": "horas equivalentes",
		"utm": "UTM",
		"modificar_compensacion_garantizada": "compensación garantizada"
	},
	"9": {},
	"10": {},
	"11": {},
	"12": {
		"historico_perfil_banco": "BANCO",
		"historico_perfil_cuenta_bancaria": "CUENTA BANCARIA",
		"historico_perfil_clabe_bancaria": "CLABE BANCARIA",
		"historico_perfil_forma_pago": "TIPO DE PAGO",
		"historico_perfil_borrado_banco": "banco",
		"historico_perfil_borrado_forma_pago": "forma de pago",
		"historico_perfil_borrado_clabe_bancaria": "clabe bancaria",
		"historico_perfil_borrado_cuenta_bancaria": "cuenta bancaria"
	},
	"13": {
		"ejercicio"				: "Ejercicio",
		"numero"				: "Número",
		"fecha_inicio" 			: "Fecha inicial",
		"fecha_fin" 			: "Fecha final",
		"descripcion"			: "Descripción",
		"periodo_id"			: "Periodo ordinario",
		"periodo_carga"			: "Cargar perfiles del periodo",
		"hcc_nombramiento"		: "Tipo nombramiento",
		"ente"					: "Entes participantes",
		"filtro_mes"			: "Mes",
		"filtro_tipo"			: "Tipo",
		"filtro_estatus"		: "Estatus",
		"migracion_mes"			: "Mes integrador",
		"migracion_periodo_id"	: "PERIODOS"
	},
	"14": {
		"ente_id"					: "Ente",
		"unidad_administrativa_id"	: "Unidad",
		"proyecto_id"				: "Programa",
		"clave"						: "Clave",
		"nombre"					: "Nombre"
	},
	"15": {
		"unidad_administrativa_id"	: "Unidad administrativa",
		"unidad"					: "Unidad administrativa",
		"clave"						: "Clave",
		"nombre" 					: "Nombre"
	},
	"16": {},
	"17": {
		"nombre"			: "Nombre del reporte",
		"archivo"			: "Nombre archivo",
		"tipo_formato"		: "Tipo Formato",
		"espacio_firma"		: "Incluir espacio para firma",
		"leyenda"			: "Leyenda",
		"complemento_leyenda": "Activar complemento leyenda",
		"leyenda_quincinal"	: "Leyenda quincenal",
		"segunda_quincena"	: "Segunda quincena",
		"nominas"			: "Nóminas",
		"ente"				: "Ente presupuestal",
		"agrupador"			: "Agrupador",
		"proyecto_finanzas"	: "Proyecto finanzas",
		"porcentaje" 		: "Porcentaje"
	},
	"18":{
		"clave"			: "Clave",
		"nombre"		: "Nombre",
		"estado_id"		: "Estado",
		"municipio_id"	: "Municipio",
		"localidad_id"	: "Localidad",
		"calle"			: "Calle",
		"num_exterior"	: "Núm. Exterior",
		"num_interior"	: "Núm. Interior",
		"colonia" 		: "Colonia",
		"codigo_postal"	:"Código postal"
	},
	"19":{
		"es_bono"			: "Reprocesar concepto",
		"gravable"			: "Gravable",
		"nombre_timbre"		: "Nombre timbre",
		"tipo" 				: "Tipo",
		"clave_sat_id" 		: "Clave SAT",
		"clave"				: "Clave",
		"nombre"			: "Nombre",
		"tipo_ente_id"		: "Tipo ente",
		"acronimo"			: "Acrónimo",
		"titular"			: "Titular",
		"responsable"		: "Responsable",
		"estado_id"			: "Estado",
		"municipio_id"		: "Municipio",
		"localidad_id"		: "Localidad",
		"calle"				: "Calle",
		"num_exterior"		: "Núm. exterior",
		"num_interior"		: "Núm. interior",
		"colonia"			: "Colonia",
		"telefono"			: "Teléfono",
		"correo_electronico": "Correo electrónico",
		"clasificacion"		: "Clasificación del ente",
		"cuenta_cliente"	: "Cuenta Cliente",
		"regimen_fiscal"	: "Régimen fiscal",
		"nombre_emisor"		: "Nombre Emisor",
		"rfc"				: "RFC",
		"codigo_postal"		: "Código postal",
		"folio_timbre"		: "Folio timbrado",
		"entidad_sncf"		: "Entidad SNCF",
	},
	"20":{
		"clave"			: "Clave",
		"nombre"			: "Nombre",
		"ente_id"		: "Entes",
		"es_local" 		: "Tipo",
	},
	"21":{},
	"22":{},
	"23":{
		"clave"		  : "Clave",
		"quinquenio_1": "Quinquenio 1",
		"quinquenio_2": "Quinquenio 2",
		"quinquenio_3": "Quinquenio 3",
		"quinquenio_4": "Quinquenio 4",
		"quinquenio_5": "Quinquenio 5",
		"slc_categorias":"Categorias",
	},
	"24":{
		"firma_nombre": "Nombre",
		"nota_informativa": "Nota informativa",
		"slc_nombramiento_id": "Tipo nombramiento",
		"slc_ente_id": "Ente",
		"slc_pagador_id": "Pagador",
		"firma_puesto": "Puesto",
		"firma_titulo": "Título",
		"firma_orden": "Orden",
		
	},
	"25": {},
	"26": {},
	"27": {
		"sobre_leyenda": "Sobre Leyenda",
		"sobre_leyenda_corta": "Sobre Leyenda Corta",
		"slc_leyenda_tipo": "Tipo de leyenda",
		"slc_concepto_id": "Concepto",
		"sobre_orden": "Sobre orden",
	},
	"28": {},
	"29": {},
	"30": {},
	"31": {
		"ente_id" : "Ente",
		"proyecto_id" : "Proyecto",
		"Registró" : "Registró",
		"nom_tipo_trabajador_id" : "Tipo de Trabajador",
		"unidad_id" : "Unidad administrativa",
		"programa_id" : "Programa",
		"hcc_nombramiento_id" : "Nombramiento",
		"nom_tipo_categoria_id" : "Tipo de categoría",
		"categoria_nivel_id" : "Nivel de categoría",
	},
	"32": {
		"articulo" : "Artículo",
		"limite_superior" : "Límite superior",
		"limite_inferior" : "Límite inferior",
		"cuota_fija" : "Cuota fija",
		"porcentaje" : "Porcentaje",
	},
	"33": {
		"articulo" : "Artículo",
		"limite_superior" : "Límite superior",
		"limite_inferior" : "Límite inferior",
		"cuota_fija" : "Cuota fija",
		"subsidio" : "Subsidio",
	},
	"34": {},
	"35":{},
	"36":{
		"clasificacion_ente" : "Clasificación del ente",
		"radio_estructura" : "Tipo de estructura",
		"tipo_descuento" : "Tipo de descuento",
		"nombramiento_consulta" : "Nombramiento",
		"pagador_consulta" : "Pagador",
		"ente_consulta" : "Ente",
		"slc_tipo_trabajador" : "Tipo de trabajador",
		"slc_tipo_categoria" : "Tipo Categoría",
		"slc_nivel_categoria" : "Nivel de categoría",
		"slc_categoria" : "Categoría",
		"proyectos_finanzas" : "Proyecto",
		"slc_firmas_id" : "Firmas",
		"nombre_archivo" : "Nombre de Archivo",
		"leyenda" : "Leyenda",
		"slc_ua" : "Unidad Administrativa",
		"nom_pagador" : "Pagador",
		"slc_proyecto" : "Proyecto",
		"slc_ente" : "Ente",
		"estructura_sobre" : "Tipo de Estructura",
		"rango_filas" : "Rango filas",
		"rango_espacios" : "Rango espacios",
		"slc_nombramiento" : "Nombramiento",
		"slc_departamento" : "Departamento",
		"slc_ordenamiento" : "Ordenamiento",
		"tipo_formato" : "Formato",
		"sobre_serie_inicio" : "Serie Inicio",
		"sobre_serie_fin" : "Serie Fin",
		"slc_unidad_administrativa" : "Unidad Administrativa",
		"columnas_concepto_frente" : "Columnas Conceptos Frente",
		"columnas_concepto_reverso": "Columnas Conceptos Reverso",
		"tamanio_sobre" : "Tamaño Sobre",
		"slc_firmas" : "Firmas",
		"slc-titulos" : "Titulos",
		"leyenda_periodo" : "Leyendas",
		"tipo_categoria":"Tipo Categoria",
		"ente":"Ente",
		"fuente_financiamiento":"Fuente Financiera",
		"nombramiento":"Nombramiento",
		"radio_hojas":"Numero Hojas",
		"slc_hojas_doc": "Numero Hojas",
		"pagador":"Pagador",
		"radio_tipo_1":"Tipo Estructura",
		"categoria":"Categoria",
		"tipo_trabajador":"Tipo Trabajador",
		"categoria_nivel":"Nivel Categoria",
		"incluir_auxiliares":"Incluir Auxiliares",
		"categoria_tipo":"Tipo Categoria",
		"agrupador":"Agrupador",
		"proyecto":"Proyecto",
		"firmas":"Firmas",
		"ente_clasificacion":"Clasificacion del ente",
		"complemento":"Complemento",
		"aplicacion_isset":"Aplicacion ISSET",
	},
	"37":{
		"nombre":"Nombre",
		"nombre_archivo":"Nombre Archivo",
		"formato":"Formato",
		"slc_clasificaciones":"Clasificaciones",
		"slc_ente":"Ente",
		"slc_nombramiento":"Nombramiento",
		"slc_categoria":"Categoria",
		"slc_tipo_categoria":"Tipo Categoria",
		"slc_nivel_categoria":"Nivel Categoria",
		"nom_pagador":"Pagador",
		"slc_banco":"Banco",
		"tipo_trabajador":"Tipo Trabajador",
		"delimitador":"Delimitador",
	},
	
	// Generales
	"fecha_vigencia": "Fecha vigencia",
	"nom_pagador_id": "Pagador ",
	"cuenta_bancaria": "Cuenta bancaria",
	"clabe_bancaria": "Clabe bancaria",
	"hcc_banco_id": "Banco",
	"forma_pago_id ": "Forma de pago",
	"rfc_beneficiario": "RFC beneficiario",
	"curp_beneficiario": "CURP beneficiario",
	"fecha_ingreso": "Fecha ingreso",
	"expediente_empleado ": "Expediente empleado",
	"ap_paterno_empleado": "Apellido paterno empleado",
	"ap_materno_empleado": "Apellido paterno empleado",
	"nombre_empleado": "Nombre empleado",
	"fecha_nacimiento": "Fecha de nacimiento",
	"registro_fiscal": "RFC empleado",
	"ap_paterno_beneficiario": "Apellido paterno beneficiario",
	"ap_materno_beneficiario": "Apellido materno beneficiario",
	"ap_paterno_acreedor": "Apellido paterno acreedor",
	"ap_materno_acreedor": "Apellido materno acreedor",
	"nombre_beneficiario": "Nombre beneficiario",
	"valor": "Valor descuento",
	"nom_concepto_id": "Concepto pensión",
	"periodo_id": "Periodo aplicación",
	"direccion_organo": "dirección órgano",
	"rfc_organo": "RFC órgano",
	"organo_judicial": "Órgano judicial",
	"slc_concepto": "Concepto",
	"fuente_recurso": "Fuente recurso",
	"observaciones": "Observaciones",
	"nom_variable_id": "Variable",
	"nombre" : "Nombre",
	"select_conceptos": "Conceptos",
	"horas" : "Horas",
	"nom_categoria_id" : "Categoría",
	"descripcion" : "Descripción",
	"titulo" : "Título",
	"tipo_reporte" : "Tipo de reporte",
	"salario_minimo" : "Salario mínimo",
	"clave" : "Clave",
	"slc_ente":"Ente",
	"slc_tipo_nombramiento":"Nombramiento",
	"motivo_movimiento":"Tipos de movimiento",
	"tipo_movimiento":"Tipo de movimiento",
	"nom_reporte":"Nombre",
	"tope líquido quincenal": "Tope líquido quincenal",
	"tope líquido mensual": "Tope líquido mensual",
	"categoría": "Categoría",
	"concepto": "Concepto"
}


function fnFormatCampo(datos){

	let campo = datos.campo, id = datos.tabla_log, info = null;
	info = estiliza_campo[campo] && estiliza_campo[campo] // Busca en generales si existe el campo, si existe asignalo.
	info = info ? info : estiliza_campo[id][campo] && estiliza_campo[id][campo]; // si existe no modifiques el valor, si no buscalo en su tabla "id".
	if (info) return info

	return campo.replace(/_/g, " ")
					.replace(/(\bnom\b|\bhcc\b|\bnom\b|\bap\b|\bid\b)/g, "")
}

function fnFormatDescripcion(datos){

	datos["valor_actual_vacio"] = datos.valor_actual || "______"
	datos["valor_anterior_vacio"] = datos.valor_anterior || "______"

	const f = FORMATEA_EVENTO.find(e => e.campos.includes(datos.campo) || e.campos.includes(datos.evento));

   detalle = !datos.detalle_evento || datos.detalle_evento.split(",");

   const tags = (_match, abrir, _cerrar) => abrir ? "<strong>" : "</strong>",
         repl = (_match, p1, p2) => p2 ? detalle[p2] : p1 == "campo" ? fnFormatCampo(datos) : datos[p1] ,
         opts = (_match, p1) => {

            const array = p1.split("|")[0], opciones = p1.split("|")[1];

            return array.split(":").includes(datos.campo) ? opciones.split(":")[0] : opciones.split(":")[1];
         };

   if (f){
      const str = datos.tabla == "individual" && f.str_i ? f.str_i : f.str_g;

	  return str.replace(/#([a-z_]+)|#([0-9]+)/g, repl)
				.replace(/(<\$)|(\$>)/g, tags)
				.replace(/#\((.*?)\)/g, opts);

   }
   return " - "
}