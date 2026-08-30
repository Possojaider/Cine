import { URL_IMAGEN_TMDB } from "./config.js";

let peliculas = [];
let peliculaSeleccionada = null;
let funcionSeleccionada = null;
let asientosSala = [];
let asientosSeleccionados = new Set();
let operacionEnCurso = false;
let cantidadEntradas = 1;
let mensajeOperacion = null;
const PRECIO_BASE = 18000;
const HISTORIAL_KEY = "cine-historial";

let funcionesActuales = [];

const identificadoresGeneros = {
  drama: [18, 10749, 10752, 36],
  thriller: [53, 80, 9648, 27],
  animacion: [16, 10751],
  documental: [99],
};

const MESES_ABREVIADOS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function formatearFechaEstreno(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return "";
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = MESES_ABREVIADOS[fecha.getMonth()];
  return `${dia} ${mes}`;
}
