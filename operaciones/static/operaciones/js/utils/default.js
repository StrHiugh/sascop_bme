function aviso(tipo_aviso, parametros) {
    let obj = {
        titulo: "",
        contenido: "",
        tipo: "info",
        tiempo: 4000,
        icono: "fa fa-bell"
    };

    const estilos = {
        "exito": {
            titulo: "¡Éxito!",
            tipo: "success",
            icono: "fa fa-check-circle",
            color: "#5cb85c",
            colorClaro: "#dff0d8"
        },
        "error": {
            titulo: "Error",
            tipo: "error",
            icono: "fa fa-exclamation-circle",
            color: "#d9534f",
            colorClaro: "#f2dede"
        },
        "advertencia": {
            titulo: "Advertencia",
            tipo: "warning",
            icono: "fa fa-exclamation-triangle",
            color: "#f0ad4e",
            colorClaro: "#fcf8e3"
        },
        "proceso": {
            titulo: "Procesando",
            tipo: "info",
            icono: "fa fa-info-circle",
            color: "#5bc0de",
            colorClaro: "#d9edf7"
        },
        "default": {
            titulo: "Aviso",
            tipo: "info",
            icono: "fa fa-info-circle",
            color: "#5bc0de",
            colorClaro: "#d9edf7"
        }
    };

    const estilo = estilos[tipo_aviso] || estilos.default;

    obj.titulo = estilo.titulo;
    obj.tipo = estilo.tipo;
    obj.icono = estilo.icono;
    obj.color = estilo.color;
    obj.colorClaro = estilo.colorClaro;

    if (typeof parametros === "string") {
        obj.contenido = parametros;
    }
    $.extend(obj, parametros);

    const alertId = "smart-alert-" + Date.now();
    const alertHtml = `
        <div id="${alertId}" class="smart-alert animated fadeInRight" 
            style="background: linear-gradient(135deg, ${obj.color} 0%, ${obj.color} 100%); 
                    border-left: 4px solid ${obj.color};
                    color: white;
                    padding: 15px 20px;
                    margin-bottom: 10px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    min-height: 70px;
                    position: relative;
                    cursor: pointer;
                    width: 350px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="display: flex; align-items: flex-start;">
                <div style="margin-right: 15px; font-size: 24px;">
                    <i class="${obj.icono}" style="color: white;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 5px; color: white;">
                        ${obj.titulo}
                    </div>
                    <div style="font-size: 13px; line-height: 1.4; color: white; opacity: 0.9;">
                        ${obj.contenido}
                    </div>
                </div>
                <div style="margin-left: 10px;">
                    <i class="fa fa-times close-smart-alert" 
                        style="color: white; opacity: 0.7; cursor: pointer; font-size: 14px;"
                        onclick="cerrarSmartAviso('${alertId}')"></i>
                </div>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; 
                        background: rgba(255,255,255,0.3); border-radius: 0 0 6px 6px;">
                <div class="progress-bar" style="height: 100%; background: rgba(255,255,255,0.6); 
                        width: 100%; border-radius: 0 0 6px 6px; transition: width ${obj.tiempo}ms linear;"></div>
            </div>
        </div>
    `;

    let alertContainer = $("#smart-alert-container");
    if (alertContainer.length === 0) {
        $("body").prepend(`
            <div id="smart-alert-container" 
                style="position: fixed; top: 75px; right: 20px; z-index: 9999; 
                    max-width: 350px; pointer-events: none;"></div>
        `);
        alertContainer = $("#smart-alert-container");
    }

    alertContainer.css('pointer-events', 'auto');

    const alertasExistentes = alertContainer.find('.smart-alert').length;
    const topPosition = 20 + (alertasExistentes * 15);

    alertContainer.append(alertHtml);
    $("#" + alertId).css('top', topPosition + 'px');

    setTimeout(() => {
        $("#" + alertId + " .progress-bar").css('width', '0%');
    }, 100);

    if (obj.tiempo) {
        setTimeout(() => {
            cerrarSmartAviso(alertId);
        }, obj.tiempo);
    }

    $("#" + alertId).on('click', function (e) {
        if (!$(e.target).hasClass('close-smart-alert')) {
            cerrarSmartAviso(alertId);
        }
    });
}

function cerrarSmartAviso(alertId) {
    $("#" + alertId)
        .removeClass("fadeInRight")
        .addClass("fadeOutRight")
        .delay(300)
        .queue(function (next) {
            $(this).remove();
            next();
            reorganizarAlertas();
        });
}

function reorganizarAlertas() {
    const alertContainer = $("#smart-alert-container");
    const alertas = alertContainer.find('.smart-alert');

    alertas.each(function (index) {
        $(this).css('top', (20 + (index * 90)) + 'px');
    });

    if (alertas.length === 0) {
        alertContainer.css('pointer-events', 'none');
    }
}
if (!$('#smart-alert-styles').length) {
    $('head').append(`
        <style id="smart-alert-styles">
            .smart-alert {
                position: absolute;
                right: 0;
                transition: all 0.3s ease-in-out;
                pointer-events: auto;
            }
            .smart-alert:hover {
                transform: translateX(-5px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            .close-smart-alert:hover {
                opacity: 1 !important;
            }
            .progress-bar {
                transition: width 4s linear !important;
            }
        </style>
    `);
}

var existeContenedorDHMensaje = false;
(function ($) {
    $.BMensaje = function (configuracion) {

        configuracion = $.extend({
            titulo: "",
            subtitulo: ""
        }, configuracion);

        existeInput = false;

        if (!existeContenedorDHMensaje) {
            existeContenedorDHMensaje = true;
            $("body").append("<div id='div-dh-mensaje'></div>");
        }

        var cajaMensaje = $("<div>", { class: "contenedor-mensaje-alerta" });
        var divMensaje = $("<div>", { class: "mensaje" }).appendTo(cajaMensaje);
        var contenedor = $("<div>", { class: "container" }).appendTo(divMensaje);

        var titulo = $("<h2>", {
            class: "titulo",
            html: configuracion.titulo
        }).appendTo(contenedor);

        var p = $("<p>", {
            class: "subtitulo",
            html: configuracion.subtitulo
        }).appendTo(contenedor);

        if (configuracion.tipo_input != undefined) {
            switch (configuracion.tipo_input) {
                case "select":
                    var divInput = $("<div>", {
                        class: "select",
                        style: "width: 50%"
                    });
                    var input = $("<select>", { class: "dhm-input" });
                    if ((configuracion.opciones != undefined) && typeof configuracion.opciones === "object") {
                        for (var i = 0; i < configuracion.opciones.length; i++) {
                            opcion = configuracion.opciones[i];
                            $("<option/>", {
                                value: opcion.valor,
                                text: opcion.texto
                            }).appendTo(input);
                        }
                    }
                    input.appendTo(divInput);
                    divInput.append("<i></i>");
                    existeInput = true;
                    break;
                case "text":
                    var divInput = $("<div>", {
                        class: "input",
                        style: "width: 50%"
                    });
                    var input = $("<input>", {
                        class: "dhm-input",
                        type: "text"
                    });
                    input.appendTo(divInput);
                    existeInput = true;
                    break;
            }
            if (existeInput) {
                var divFormulario = $("<div>", {
                    class: "dhm-formulario smart-form"
                });
                divInput.appendTo(divFormulario);
                divFormulario.appendTo(contenedor);
            }
        }

        var botonera = $("<div>", { class: "botones" }).appendTo(contenedor);
        if (configuracion.botones != undefined && typeof configuracion.botones === "object") {
            botones = configuracion.botones;

            for (var i = 0; i < botones.length; i++) {
                var objBoton = botones[i];
                if (objBoton.clase == undefined) {
                    var claseBoton = "btn btn-primary";
                } else {
                    var claseBoton = "btn " + objBoton.clase;
                }

                var nuevoBoton = $("<button/>", {
                    id: "dhm-bnt-" + i,
                    type: "button",
                    class: claseBoton,
                    "data-dhm_posicion": i
                });

                if (typeof objBoton.icono === "string") {
                    var icono = $("<i>", { class: "la " + objBoton.icono });
                    nuevoBoton.append(icono);
                }
                nuevoBoton.append(objBoton.texto);
                nuevoBoton.appendTo(botonera);

                if (typeof objBoton.funcion === "function") {
                    if (existeInput) {
                        nuevoBoton[0].addEventListener("click", function () {
                            var valor = $(".dhm-input").val();
                            var posicion = $(this).data("dhm_posicion");
                            botones[posicion].funcion(valor);
                        });
                    } else {
                        nuevoBoton[0].addEventListener("click", objBoton.funcion);
                    }
                }
                nuevoBoton.click(function (e) {
                    cajaMensaje.fadeOut(400, function () {
                        cajaMensaje.remove();
                    });
                    e.preventDefault();
                });
            }
        } else {
            var nuevoBoton = $("<button/>", {
                type: "button",
                class: "btn btn-default",
                text: "Cerrar"
            }).appendTo(botonera);
            nuevoBoton[0].addEventListener("click", function (e) {
                cajaMensaje.remove();
                e.preventDefault();
            });
        }
        cajaMensaje.hide();
        cajaMensaje.appendTo("#div-dh-mensaje");
        cajaMensaje.fadeIn();
        return;
    };
})(jQuery);

function formatoNumero(numero) {
    var decimales = 2;
    var separadorDecimal = ".";
    var separadorMiles = ",";
    var partes, array;

    if (!isFinite(numero) || isNaN((numero = parseFloat(numero)))) {
        return "";
    }
    if (typeof separadorDecimal === "undefined") {
        separadorDecimal = ",";
    }
    if (typeof separadorMiles === "undefined") {
        separadorMiles = "";
    }

    if (!isNaN(parseInt(decimales))) {
        if (decimales >= 0) {
            numero = numero.toFixed(decimales);
        } else {
            numero = (
                Math.round(numero / Math.pow(10, Math.abs(decimales))) *
                Math.pow(10, Math.abs(decimales))
            ).toFixed();
        }
    } else {
        numero = numero.toString();
    }

    partes = numero.split(".", 2);
    array = partes[0].split("");
    for (var i = array.length - 3; i > 0 && array[i - 1] !== "-"; i -= 3) {
        array.splice(i, 0, separadorMiles);
    }
    numero = array.join("");

    if (partes.length > 1) {
        numero += separadorDecimal + partes[1];
    }

    return numero;
}

function cargarURL(url, container, parametros) {
    const obj = { data: {} };
    $.extend(obj, parametros);

    obj.data.csrfmiddlewaretoken = $("[name=csrfmiddlewaretoken]").val();

    $.ajax({
        type: "POST",
        url: url,
        dataType: "html",
        cache: false,
        data: obj.data,
        beforeSend: function () {
            container.html(
                '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Cargando...</p></div>'
            );
        },
        success: function (data) {
            container
                .css({ opacity: "0.0" })
                .html(data)
                .delay(50)
                .animate({ opacity: "1.0" }, 300);
        },
        error: function (xhr, ajaxOptions, thrownError) {
            container.html(
                '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Error al cargar el contenido. Por favor inténtelo de nuevo.</div>'
            );
        },
    });
}

function getFormDataToJson($form) {
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function (n, i) {
        indexed_array[n["name"]] = n["value"];
    });

    return indexed_array;
}

function BMAjax(url, data = {}, method = "POST", mostrarLoad = true) {
    if (mostrarLoad) {
        iniciarLoader();
    }

    if (method === "POST") {
        data.csrfmiddlewaretoken = $("[name=csrfmiddlewaretoken]").val();
    }

    return $.ajax({
        url: url,
        data: data,
        type: method,
        dataType: "json",
    })
        .always(function () {
            if (mostrarLoad) {
                finalizarLoader();
            }
        })
        .done(function (respuesta) {
            if (respuesta.tipo_aviso) {
                aviso(respuesta.tipo_aviso, respuesta.detalles);
            }
            return respuesta;
        })
        .fail(function (xhr, status, error) {
            aviso("error", {
                contenido: "Error en la comunicación con el servidor.",
            });
        });
}

String.prototype.format = function () {
    var content = this;
    for (var i = 0; i < arguments.length; i++) {
        var replacement = "{" + i + "}";
        content = content.replace(replacement, arguments[i]);
    }
    return content;
};

var ns_utilidades = {
    esInteger: function (number) {
        return (
            $.isNumeric(number) &&
            parseInt(Number(number)) == number &&
            $.isNumeric(parseInt(number, 10))
        );
    },

    convierteAInt: function (str) {
        if (typeof str == "string") {
            str = parseInt(str.replace(/[^0-9\.]+/g, ""));
        }
        return $.isNumeric(str) ? str : 0;
    },

    convierteAFloat: function (str) {
        if (typeof str == "string") {
            str = parseFloat(str.replace(/[^0-9\.]+/g, ""));
        }
        return $.isNumeric(str) ? str : 0;
    },

    currencyFormat: function (number) {
        return "$ " + this.numberFormat(number, 2);
    },

    numberFormat: function (number, decimalplaces) {
        var decimalcharacter = ".";
        var thousandseparater = ",";
        number = parseFloat(number);
        var sign = number < 0 ? "-" : "";
        var formatted = new String(number.toFixed(decimalplaces));

        if (decimalcharacter.length && decimalcharacter != ".") {
            formatted = formatted.replace(/\./, decimalcharacter);
        }

        var integer = "";
        var fraction = "";
        var strnumber = new String(formatted);
        var dotpos = decimalcharacter.length
            ? strnumber.indexOf(decimalcharacter)
            : -1;

        if (dotpos > -1) {
            if (dotpos) {
                integer = strnumber.substr(0, dotpos);
            }
            fraction = strnumber.substr(dotpos + 1);
        } else {
            integer = strnumber;
        }

        if (integer) {
            integer = String(Math.abs(integer));
        }

        while (fraction.length < decimalplaces) {
            fraction += "0";
        }

        temparray = [];
        while (integer.length > 3) {
            temparray.unshift(integer.substr(-3));
            integer = integer.substr(0, integer.length - 3);
        }

        temparray.unshift(integer);
        integer = temparray.join(thousandseparater);
        return sign + integer + decimalcharacter + fraction;
    },
};

function iniciarLoader(parametros = {}) {
    let objeto = {
        mostrarTitulo: true,
        titulo: "Procesando...",
        mostrarSubtitulo: false,
    };
    $.extend(objeto, parametros);

    if ($("#bm-loader-overlay").length === 0) {
        $("body").append(`
            <div id="bm-loader-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div class="text-center text-white">
                <div class="spinner-border" style="width: 3rem; height: 3rem;"></div>
                ${objeto.mostrarTitulo
                ? `<p class="mt-2">${objeto.titulo}</p>`
                : ""
            }
                </div>
            </div>
        `);
    } else {
        $("#bm-loader-overlay").show();
    }
}

function finalizarLoader() {
    $("#bm-loader-overlay").hide();
}

$(document).ready(function () {
    $(".mayuscula").blur(function () {
        $(this).val($(this).val().toUpperCase());
    });

    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

window.aviso = aviso;
window.formatoNumero = formatoNumero;
window.BMAjax = BMAjax;
window.BMensaje = $.BMensaje;
window.ns_utilidades = ns_utilidades;
window.iniciarLoader = iniciarLoader;
window.finalizarLoader = finalizarLoader;
