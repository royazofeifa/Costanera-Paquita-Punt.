"use strict";

// Cambie estos valores para adaptar el formulario a otra congregación.
const TELEFONO_DESTINO = "50683335665";
const CONFIG = {
  congregacion: "Costanera-Paquita, Punt.",
  whatsapp: TELEFONO_DESTINO,
  mapsUrl: "https://www.google.com/maps/place/9%C2%B027'44.6%22N+84%C2%B010'59.2%22W/@9.462401,-84.1856709,17z/data=!3m1!4b1!4m4!3m3!8m2!3d9.462401!4d-84.183096?entry=ttu&g_ep=EgoyMDI2MDkyMS4wIKXMDSoASAFQAw%3D%3D"
};
const $ = (id) => document.getElementById(id);
const CAMPOS = ["fecha", "orador", "congregacion", "tema", "bosquejo", "cancion"];
const LIMITES = { fecha: 16, orador: 150, congregacion: 180, tema: 300, bosquejo: 4, cancion: 4 };
let datosDiscurso = null;
let toastTimer;

// Texto externo siempre se muestra con textContent; nunca se interpreta como HTML.
function limpiarTexto(valor) {
  return String(valor ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}
function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 16) === valor && Number(valor.slice(0, 4)) > 0;
}
function numeroOpcionalValido(valor) {
  return valor === "" || (/^\d{1,4}$/.test(valor) && Number(valor) >= 1);
}
function formatearFecha(valor) {
  // El enlace representa hora de Costa Rica, no la zona del dispositivo receptor.
  const fecha = new Date(`${valor}:00-06:00`);
  const opciones = { timeZone: "America/Costa_Rica" };
  const dia = new Intl.DateTimeFormat("es-CR", { ...opciones, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fecha);
  const hora = new Intl.DateTimeFormat("es-CR", { ...opciones, hour: "numeric", minute: "2-digit", hour12: true }).format(fecha);
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora };
}
function contenedorError(id) {
  return $(id + "-group") || $(id).closest(".field");
}
function mostrarError(id, mensaje) {
  const contenedor = contenedorError(id);
  contenedor.classList.add("field-error");
  contenedor.querySelectorAll("input, textarea").forEach((campo) => campo.setAttribute("aria-invalid", "true"));
  $(id + "-error").textContent = mensaje;
}
function limpiarError(id) {
  const contenedor = contenedorError(id);
  contenedor.classList.remove("field-error");
  contenedor.querySelectorAll("input, textarea").forEach((campo) => campo.removeAttribute("aria-invalid"));
  $(id + "-error").textContent = "";
}
function enfocarPrimerError(formulario) {
  const primero = formulario.querySelector(".field-error");
  if (!primero) return;
  primero.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  primero.querySelector("input, textarea")?.focus({ preventScroll: true });
}
function validarCampoGenerador(id) {
  const valor = limpiarTexto($(id).value);
  let mensaje = "";
  if ($(id).required && !valor) mensaje = "Este dato es necesario para generar el enlace.";
  else if (id === "fecha" && !fechaValida(valor)) mensaje = "Indique una fecha y hora válidas.";
  else if (["bosquejo", "cancion"].includes(id) && (!numeroOpcionalValido(valor) || $(id).validity.badInput)) mensaje = "Indique un número entero entre 1 y 9999, o deje el campo vacío.";
  else if (valor.length > LIMITES[id]) mensaje = "Este dato es demasiado largo.";
  if (mensaje) mostrarError(id, mensaje); else limpiarError(id);
  return !mensaje;
}
function validarGenerador() {
  const valido = CAMPOS.map(validarCampoGenerador).every(Boolean);
  if (!valido) enfocarPrimerError($("generator-form"));
  return valido;
}
function generarEnlace() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  const parametros = new URLSearchParams({ modo: "confirmar" });
  CAMPOS.forEach((id) => {
    const valor = limpiarTexto($(id).value);
    if (valor) parametros.set(id, valor);
  });
  // URLSearchParams se encarga de codificar espacios, acentos y signos una sola vez.
  url.search = parametros.toString();
  return url.href;
}
function mostrarToast(mensaje) {
  clearTimeout(toastTimer);
  $("toast").textContent = mensaje;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 5000);
}
async function copiarEnlace() {
  try {
    await navigator.clipboard.writeText($("generated-link").value);
    mostrarToast("Enlace copiado correctamente");
  } catch {
    $("generated-link").focus();
    $("generated-link").select();
    mostrarToast("No se pudo copiar automáticamente. El enlace está seleccionado para que pueda copiarlo.");
  }
}
function iniciarGenerador() {
  $("coordinador").hidden = false;
  $("generator-form").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!validarGenerador()) return;
    const enlace = generarEnlace();
    $("generated-link").value = enlace;
    $("test-link").href = enlace;
    const mensaje = `Hola hermano. Le compartimos el formulario para confirmar el discurso que tiene programado con nuestra congregación ${CONFIG.congregacion}. Muchas gracias.\n\n${enlace}`;
    $("share-link").href = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    $("local-notice").hidden = !["file:", "localhost", "127.0.0.1"].some((valor) => window.location.protocol === valor || window.location.hostname === valor);
    $("generator-result").hidden = false;
    $("generator-result").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    $("generator-result").focus({ preventScroll: true });
  });
  CAMPOS.forEach((id) => $(id).addEventListener("input", () => {
    if (contenedorError(id).classList.contains("field-error")) validarCampoGenerador(id);
    // Una edición invalida el resultado anterior para evitar compartir datos antiguos.
    $("generator-result").hidden = true;
  }));
  $("copy-link").addEventListener("click", copiarEnlace);
}
function seleccion(nombre) {
  return document.querySelector(`input[name="${nombre}"]:checked`)?.value || "";
}
function validarPersonas() {
  if (seleccion("hospitalidad") !== "si") { limpiarError("personas"); return true; }
  const valores = [$("adultos").value, $("ninos").value];
  let mensaje = "";
  if (!valores.every((valor) => /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) <= 999)) mensaje = "Indique cantidades enteras entre 0 y 999 en ambos campos.";
  else if (valores.reduce((suma, valor) => suma + Number(valor), 0) < 1) mensaje = "Por favor indique cuántas personas participarán de la hospitalidad.";
  if (mensaje) mostrarError("personas", mensaje); else limpiarError("personas");
  return !mensaje;
}
function obtenerTitulo() {
  return datosDiscurso?.tema || limpiarTexto($("tema-discursante").value);
}
function validarTituloDiscursante() {
  if (datosDiscurso?.tema) return true;
  const titulo = obtenerTitulo();
  let mensaje = "";
  if (!titulo) mensaje = "Por favor indique el título del discurso que presentará.";
  else if (titulo.length > LIMITES.tema) mensaje = "El título debe tener un máximo de 300 caracteres.";
  if (mensaje) mostrarError("tema-discursante", mensaje); else limpiarError("tema-discursante");
  return !mensaje;
}
function validarConfirmacion() {
  if (!datosDiscurso) return false;
  let valido = validarTituloDiscursante();
  ["asistencia", "hospitalidad"].forEach((nombre) => {
    if (!seleccion(nombre)) { mostrarError(nombre, "Por favor seleccione una opción."); valido = false; }
    else limpiarError(nombre);
  });
  if (!validarPersonas()) valido = false;
  if (!valido) enfocarPrimerError($("confirmation-form"));
  return valido;
}
function crearMensajeWhatsApp() {
  const fecha = formatearFecha(datosDiscurso.fecha);
  const partes = ["Hola hermano Roy.", `Le envío la confirmación del discurso para la congregación ${CONFIG.congregacion}.`, `📅 Fecha y hora:\n${fecha.dia}, ${fecha.hora}`, `👤 Discursante:\n${datosDiscurso.orador}`, `👥 Congregación:\n${datosDiscurso.congregacion}`, `📖 Discurso:\n${obtenerTitulo()}`];
  if (datosDiscurso.bosquejo) partes.push(`📝 Bosquejo:\n${datosDiscurso.bosquejo}`);
  if (datosDiscurso.cancion) partes.push(`🎵 Canción:\n${datosDiscurso.cancion}`);
  partes.push(`✅ Confirmación:\n${seleccion("asistencia") === "si" ? "Sí, confirmo el discurso." : "No podré presentar el discurso."}`);
  const hospitalidad = seleccion("hospitalidad") === "si";
  partes.push(`🍽️ Hospitalidad:\n${hospitalidad ? "Sí" : "No"}`);
  if (hospitalidad) {
    const adultos = Number($("adultos").value), ninos = Number($("ninos").value);
    partes.push(`👨‍👩‍👧 Personas:\n${adultos} ${adultos === 1 ? "adulto" : "adultos"}\n${ninos} ${ninos === 1 ? "niño" : "niños"}`);
  }
  partes.push(`💬 Comentario:\n${$("comentario").value.trim().slice(0, 800) || "Sin comentarios"}`);
  return partes.join("\n\n");
}
function iniciarConfirmacion(parametros) {
  $("confirmacion").hidden = false;
  $("mode-badge").textContent = "Discursante";
  const datos = {};
  let valido = true;
  CAMPOS.forEach((id) => {
    datos[id] = limpiarTexto(parametros.get(id));
    if (parametros.getAll(id).length > 1 || datos[id].length > LIMITES[id]) valido = false;
  });
  valido = valido && ["fecha", "orador", "congregacion"].every((id) => datos[id]) && fechaValida(datos.fecha) && numeroOpcionalValido(datos.bosquejo) && numeroOpcionalValido(datos.cancion);
  if (!valido) {
    $("invalid-link").hidden = false;
    $("discourse-info").hidden = true;
    $("confirmation-form").querySelectorAll("input, textarea, button").forEach((campo) => { campo.disabled = true; });
    $("confirmation-form").addEventListener("submit", (evento) => evento.preventDefault());
    return;
  }
  datosDiscurso = datos;
  // Solo se solicita un título cuando el coordinador no lo incluyó en el enlace.
  const necesitaTitulo = !datos.tema;
  $("tema-discursante-group").hidden = !necesitaTitulo;
  $("tema-discursante").disabled = !necesitaTitulo;
  $("tema-discursante").required = necesitaTitulo;
  $("topic-heading").hidden = necesitaTitulo;
  $("topic-card").hidden = necesitaTitulo && !datos.bosquejo && !datos.cancion;
  $("tema-discursante").addEventListener("input", () => {
    if ($("tema-discursante-group").classList.contains("field-error")) validarTituloDiscursante();
  });
  const fecha = formatearFecha(datos.fecha);
  $("info-fecha").textContent = fecha.dia;
  $("info-hora").textContent = fecha.hora;
  CAMPOS.filter((id) => id !== "fecha").forEach((id) => { $("info-" + id).textContent = datos[id]; });
  ["bosquejo", "cancion"].forEach((id) => { $(id + "-detail").hidden = !datos[id]; });
  ["asistencia", "hospitalidad"].forEach((nombre) => {
    document.querySelectorAll(`input[name="${nombre}"]`).forEach((radio) => radio.addEventListener("change", () => {
      limpiarError(nombre);
      if (nombre === "hospitalidad") {
        const mostrar = seleccion(nombre) === "si";
        $("personas-group").hidden = !mostrar;
        ["adultos", "ninos"].forEach((id) => { $(id).disabled = !mostrar; $(id).required = mostrar; });
        limpiarError("personas");
      }
    }));
  });
  ["adultos", "ninos"].forEach((id) => $(id).addEventListener("input", () => {
    if ($("personas-group").classList.contains("field-error")) validarPersonas();
  }));
  $("comentario").addEventListener("input", () => { $("comment-count").textContent = `${$("comentario").value.length} / 800`; });
  $("confirmation-form").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!validarConfirmacion()) return;
    // Navegación directa evita bloqueadores de ventanas. El envío lo confirma el hermano en WhatsApp.
    window.location.assign(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(crearMensajeWhatsApp())}`);
  });
}
document.querySelectorAll("[data-congregacion]").forEach((elemento) => { elemento.textContent = CONFIG.congregacion; });
document.querySelectorAll("[data-maps]").forEach((elemento) => { elemento.href = CONFIG.mapsUrl; });
const mensajeContacto = "Hola hermano Roy. Le escribo con relación al discurso programado con la congregación Costanera-Paquita.";
$("contact-coordinator").href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensajeContacto)}`;
const parametros = new URLSearchParams(window.location.search);
if (parametros.get("modo") === "confirmar") iniciarConfirmacion(parametros);
else iniciarGenerador();
