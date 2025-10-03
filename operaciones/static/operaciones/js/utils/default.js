function aviso(tipo_aviso, parametros) {
    let obj = {
        titulo: "",
        contenido: "",
        tipo: "info", // Bootstrap alert types: success, danger, warning, info
        tiempo: 3000,
    };
    switch (tipo_aviso) {
        case "proceso":
            obj.titulo = "Procesando la información...";
            obj.contenido = "Espere un momento por favor.";
            obj.tipo = "info";
            obj.tiempo = 3000;
            break;
        case "exito":
            obj.titulo = "¡Listo!";
            obj.contenido = "Operación completada satisfactoriamente.";
            obj.tipo = "success";
            obj.tiempo = 3000;
            break;
        case "error":
            obj.titulo = "Lo sentimos...";
            obj.contenido = "La operación no pudo ser completada. Por favor inténtelo de nuevo más tarde.";
            obj.tipo = "danger";
            obj.tiempo = 3000;
            break;
        case "advertencia":
            obj.titulo = "¡Advertencia!";
            obj.contenido = "Por favor inténtelo de nuevo más tarde.";
            obj.tipo = "warning";
            obj.tiempo = 3000;
            break;
        default:
            obj.titulo = "¡Aviso!";
            obj.contenido = "Aquí va el aviso.";
            obj.tipo = "info";
            obj.tiempo = 3000;
            break;
    }

    if (typeof parametros === "string") {
        obj.contenido = parametros;
    }
    $.extend(obj, parametros);
    
    // Crear alerta de Bootstrap
    const alertId = "alert-" + Date.now();
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${obj.tipo} alert-dismissible fade show" style="font-size: 0.8rem; max-height:90px;" role="alert">
            <strong>${obj.titulo}</strong>
            <p>${obj.contenido}</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Agregar al contenedor de alertas (crear si no existe)
    let alertContainer = $("#alert-container");
    if (alertContainer.length === 0) {
        $("body").prepend(
            '<div id="alert-container" style="position: fixed; top: 50px; right: 20px; z-index: 9999; min-width: 400px; max-width: 400px; max-height:20px"></div>'
        );
        alertContainer = $("#alert-container");
    }

    alertContainer.append(alertHtml);

    // Auto-remover si tiene tiempo definido
    if (obj.tiempo) {
        setTimeout(() => {
            $("#" + alertId).alert("close");
        }, obj.tiempo);
    }
}

/* Funcion para el formato de números */
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

    // Redondeamos
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

    // Damos formato
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

// ADAPTADA: Cargar contenido via AJAX (compatible con Django CSRF)
function cargarURL(url, container, parametros) {
    const obj = { data: {} };
    $.extend(obj, parametros);

    // Agregar CSRF token para Django
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

// NUEVA: Función específica para Django CSRF
function djangoAjax(url, data = {}, method = "POST", mostrarLoad = true) {
    /*
        Función adaptada para Django que incluye CSRF token automáticamente
    */
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
            console.error("AJAX Error:", status, error);
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

// Sistema de loading
function iniciarLoader(parametros = {}) {
    let objeto = {
        mostrarTitulo: true,
        titulo: "Procesando...",
        mostrarSubtitulo: false,
    };
    $.extend(objeto, parametros);

    // Crear overlay de loading si no existe
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

// Inicialización cuando el documento está listo
$(document).ready(function () {
    /* Convertir texto a mayúsculas */
    $(".mayuscula").blur(function () {
        $(this).val($(this).val().toUpperCase());
    });

    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Exportar funciones para uso global
window.aviso = aviso;
window.formatoNumero = formatoNumero;
window.djangoAjax = djangoAjax;
window.ns_utilidades = ns_utilidades;
window.iniciarLoader = iniciarLoader;
window.finalizarLoader = finalizarLoader;
