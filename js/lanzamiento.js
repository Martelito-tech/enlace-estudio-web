// Oferta de lanzamiento de las tarjetas NFC: 20 % para los 10 primeros
// negocios o hasta el último día, lo que llegue antes.
//
// - Para alargarla: cambia ULTIMO_DIA.
// - Cada venta con el descuento: baja PLAZAS en 1. Con 0 se quita sola.
// - Al tocar este archivo, sube su ?v= en los tres index.html.
//
// Termina a medianoche del último día, hora de invierno de Lituania (UTC+2;
// si algún día se alarga más allá de finales de marzo, cambia +02:00 por
// +03:00). Desde entonces la página enseña los precios normales sin tocar el
// HTML: lo de .solo-lanzamiento se oculta y lo de .solo-normal aparece.
// Se carga en el <head>, antes del CSS, para que no se vean ni un instante
// los precios rebajados una vez acabada.
var LANZAMIENTO = { ULTIMO_DIA: '2026-11-15', PLAZAS: 8 };

(function () {
  var dia = new Date(LANZAMIENTO.ULTIMO_DIA + 'T00:00:00+02:00').getTime();
  var fin = dia + 24 * 60 * 60 * 1000;
  var n = LANZAMIENTO.PLAZAS;
  var activa = Date.now() < fin && n > 0;
  var html = document.documentElement;
  html.classList.add(activa ? 'con-lanzamiento' : 'sin-lanzamiento');
  if (!activa) return;

  // Fecha y plazas en el idioma de la página. El HTML ya trae los valores de
  // hoy, así que sin JS se lee igual.
  document.addEventListener('DOMContentLoaded', function () {
    var lang = (html.lang || 'en').slice(0, 2);
    var fecha = '';
    try {
      fecha = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
        day: 'numeric', month: 'long', timeZone: 'Europe/Vilnius'
      }).format(new Date(dia + 12 * 60 * 60 * 1000));
    } catch (e) {}
    var forma = 'other';
    try { forma = new Intl.PluralRules(lang).select(n); } catch (e) {}
    var plazas = {
      en: n === 1 ? 'Only 1 place left.' : n + ' places left.',
      es: n === 1 ? 'Queda 1 plaza.' : 'Quedan ' + n + ' plazas.',
      lt: 'Liko ' + n + ' ' + (forma === 'one' ? 'vieta' : forma === 'few' ? 'vietos' : 'vietų') + '.'
    }[lang];
    if (fecha) document.querySelectorAll('[data-lanzamiento="fecha"]').forEach(function (el) { el.textContent = fecha; });
    if (plazas) document.querySelectorAll('[data-lanzamiento="plazas"]').forEach(function (el) { el.textContent = plazas; });
  });
})();
