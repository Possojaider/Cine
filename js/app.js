import {
  obtenerCartelera,
  obtenerDetallesPelicula,
  buscarCarteleraProgramada,
  obtenerTrailerPelicula,
  obtenerFuncionesPelicula,
  obtenerAsientosSala,
  obtenerDisponibilidadPorFuncion,
  crearDisponibilidadPorFuncion,
  actualizarDisponibilidadPorFuncion,
  guardarReserva,
  guardarCompra,
  contarAsientosDisponibles,
  obtenerValoracionPelicula,
  guardarValoracion,
  obtenerReservas,
  obtenerCompras,
  eliminarReserva,
  eliminarCompra,
  actualizarReserva,
  actualizarCompra,
  obtenerProximosEstrenos,
} from "./api.js";
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

async function cargarProximosEstrenos() {
  const contenedor = document.querySelector("#filmstrip");
  try {
    const datos = await obtenerProximosEstrenos();
    const estrenos = (datos.results || []).slice(0, 8);

    contenedor.innerHTML = estrenos.length
      ? estrenos
          .map((estreno) => {
            const cartel = estreno.poster_path
              ? `${URL_IMAGEN_TMDB}${estreno.poster_path}`
              : "";
            const titulo =
              estreno.title || estreno.original_title || "Sin título";
            return `<div class="frame">
              <div class="frame-perf">${"<span></span>".repeat(6)}</div>
              <div class="frame-inner" style="background-image: url('${encodeURI(cartel)}')">
                <h4>${escaparHtml(titulo)}</h4>
                <div class="date">${escaparHtml(formatearFechaEstreno(estreno.release_date))}</div>
              </div>
              <div class="frame-perf">${"<span></span>".repeat(6)}</div>
            </div>`;
          })
          .join("")
      : `<p class="empty-state">No hay próximos estrenos disponibles.</p>`;
  } catch (error) {
    contenedor.innerHTML = `<p class="empty-state">No se pudieron cargar los próximos estrenos.</p>`;
  }
}

const rejilla = document.querySelector("#grid");
const capaModal = document.querySelector("#modalOverlay");
const modalTitle = document.querySelector("#modalTitle");
const modalMeta = document.querySelector("#modalMeta");
const modalTrailer = document.querySelector("#modalTrailer");
const modalSynopsis = document.querySelector("#modalSynopsis");
const modalShowtimes = document.querySelector("#modalShowtimes");
const modalRating = document.querySelector("#modalRating");
const modalBooking = document.querySelector("#modalBooking");
const reservasList = document.querySelector("#reservasList");
const comprasList = document.querySelector("#comprasList");
let elementoFocoAntesModal = null;

// Todo dato procedente de TMDB, JSON Server o localStorage se escapa antes de
// interpolarse en HTML. Así un título o un dato de cliente no puede inyectar código.
const escaparHtml = (valor = "") =>
  String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const obtenerGenero = (identificadores = []) =>
  Object.entries(identificadoresGeneros).find(([, ids]) =>
    ids.some((id) => identificadores.includes(id)),
  )?.[0] || "";

const obtenerEtiquetaGenero = (genero) =>
  ({
    drama: "Drama",
    thriller: "Thriller",
    animacion: "Animación",
    documental: "Documental",
  })[genero] || "Cine";

const convertirPelicula = (pelicula) => {
  const genero = obtenerGenero(pelicula.genre_ids);
  return {
    ...pelicula,
    title: pelicula.title || pelicula.original_title,
    genre: genero,
    genreLabel: obtenerEtiquetaGenero(genero),
    duration: "Duración no disponible",
    rating: pelicula.vote_average
      ? `${pelicula.vote_average.toFixed(1)} / 10`
      : "Sin valoración",
    synopsis: pelicula.overview || "Sin sinopsis disponible.",
    showtimes: ["16:30", "19:15", "21:45"],
  };
};

function obtenerCodigoAsiento(asiento) {
  return `${asiento.row}${asiento.number}`;
}

function obtenerUbicacionAsiento(asiento) {
  const fila = String(asiento.row || "A").toUpperCase();
  const numero = Number(asiento.number || 1);
  const filaIndex = ["A", "B", "C", "D", "E", "F"].indexOf(fila);
  const centro = Math.ceil((Number(asiento.columns || 8) || 8) / 2);

  let horizontal = "Centro";
  if (numero <= 2) horizontal = "Izquierda";
  else if (numero > centro + 1) horizontal = "Derecha";

  let vertical = "Medio";
  if (filaIndex <= 1) vertical = "Frontal";
  else if (filaIndex >= 4) vertical = "Posterior";

  return `${vertical} ${horizontal}`.trim();
}

function formatearAsientoConUbicacion(asiento) {
  if (!asiento) return "";
  const codigo = obtenerCodigoAsiento(asiento);
  const ubicacion =
    asiento.location ||
    obtenerUbicacionAsiento({
      ...asiento,
      columns: Number(funcionSeleccionada?.room?.columns || 8),
    });
  return `${codigo} - ${ubicacion}`;
}

function mostrarPeliculas(lista) {
  rejilla.innerHTML = lista.length
    ? lista
        .map((pelicula, indice) => crearTarjetaPelicula(pelicula, indice))
        .join("")
    : `<p class="empty-state">No encontramos películas en esta categoría.</p>`;
}

function crearTarjetaPelicula(pelicula, indice) {
  const cartel = pelicula.poster_path
    ? `${URL_IMAGEN_TMDB}${pelicula.poster_path}`
    : "";
  const horarios = pelicula.showtimes
    .map((horario) => `<span>${escaparHtml(horario)}</span>`)
    .join("");

  return `<article class="ticket" data-index="${peliculas.indexOf(pelicula)}" tabindex="0" role="button">
    <div class="poster poster-${indice % 6}" style="background-image: url('${encodeURI(cartel)}')">${escaparHtml(pelicula.title)}</div>
    <div class="stub-line"><i></i><span></span><i></i></div>
    <div class="ticket-body">
      <h3>${escaparHtml(pelicula.title)}</h3>
      <div class="meta">${escaparHtml(pelicula.genreLabel)} · ${escaparHtml(pelicula.duration)} · ${escaparHtml(pelicula.rating)}</div>
      <p class="synopsis">${escaparHtml(pelicula.synopsis)}</p>
      <div class="showtimes">${horarios}</div>
    </div>
  </article>`;
}

function setStatusMessage(mensaje, tipo = "info") {
  mensajeOperacion = { mensaje, tipo };
  const feedback = modalBooking.querySelector(".booking-feedback");
  if (feedback) {
    feedback.textContent = mensaje;
    feedback.className = `booking-message booking-feedback ${tipo}`;
    return;
  }
  modalBooking.innerHTML = `<div class="booking-message ${tipo}">${escaparHtml(mensaje)}</div>`;
}

function limpiarStatusMessage() {
  mensajeOperacion = null;
}

function obtenerUsuarioRegistrado() {
  try {
    return JSON.parse(localStorage.getItem("cine-usuario") || "null");
  } catch {
    return null;
  }
}

function guardarUsuarioRegistrado(usuario) {
  localStorage.setItem("cine-usuario", JSON.stringify(usuario));
}

function validarDatosUsuario(usuario) {
  if (!usuario) return false;
  const nombreValido =
    typeof usuario.nombre === "string" && usuario.nombre.trim().length >= 3;
  const documentoValido = /^\d{6,12}$/.test(
    String(usuario.documento || "").trim(),
  );
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(usuario.email || "").trim(),
  );
  const telefonoValido = /^\d{7,10}$/.test(
    String(usuario.telefono || "").trim(),
  );
  return nombreValido && documentoValido && correoValido && telefonoValido;
}

function confirmarOperacion(tipo) {
  const accion = tipo === "reserve" ? "reservar" : "comprar";
  const usuario = obtenerUsuarioRegistrado();
  const ids = [...asientosSeleccionados];
  const asientos = ids
    .map((id) => {
      const asiento = asientosSala.find((item) => item.id === id);
      return formatearAsientoConUbicacion(asiento);
    })
    .filter(Boolean);
  const total = ids.length * Number(funcionSeleccionada?.price || PRECIO_BASE);

  return new Promise((resolve) => {
    modalBooking.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-header">
          <p class="section-tag">Confirmación</p>
          <h4>${accion.toUpperCase()}</h4>
        </div>
        <div class="confirm-body">
          <p><strong>Película:</strong> ${escaparHtml(peliculaSeleccionada?.title || "Película")}</p>
          <p><strong>Sala:</strong> ${escaparHtml(funcionSeleccionada?.room?.name || "Sala general")}</p>
          <p><strong>Función:</strong> ${escaparHtml(funcionSeleccionada?.date || "Hoy")} · ${escaparHtml(funcionSeleccionada?.time || "-")}</p>
          <p><strong>Sillas seleccionadas:</strong></p>
          ${
            asientos.length
              ? `<ul class="confirm-seats">${asientos.map((asiento) => `<li>${escaparHtml(asiento)}</li>`).join("")}</ul>`
              : "<p>Ninguna</p>"
          }
          <p><strong>Cantidad:</strong> ${ids.length}</p>
          <p><strong>Precio por ticket:</strong> $${Number(funcionSeleccionada?.price || PRECIO_BASE).toLocaleString("es-CO")}</p>
          <p><strong>Total:</strong> $${total.toLocaleString("es-CO")}</p>
          <div class="confirm-user">
            <p><strong>Cliente:</strong> ${escaparHtml(usuario?.nombre || "Sin nombre")}</p>
            <p><strong>Documento:</strong> ${escaparHtml(usuario?.documento || "Sin documento")}</p>
            <p><strong>Correo:</strong> ${escaparHtml(usuario?.email || "Sin correo")}</p>
            <p><strong>Teléfono:</strong> ${escaparHtml(usuario?.telefono || "Sin teléfono")}</p>
          </div>
        </div>
        <div class="booking-actions">
          <button type="button" class="btn btn-ghost" data-confirm="cancel">Cancelar</button>
          <button type="button" class="btn btn-primary" data-confirm="confirm">Confirmar ${accion}</button>
        </div>
      </div>
    `;

    modalBooking.querySelectorAll("[data-confirm]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const confirmado = boton.dataset.confirm === "confirm";
        if (!confirmado) {
          setStatusMessage(
            "La operación fue cancelada por el usuario.",
            "info",
          );
          renderSala();
          resolve(false);
          return;
        }

        resolve(true);
      });
    });
  });
}

function obtenerHistorial() {
  try {
    return JSON.parse(localStorage.getItem(HISTORIAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function guardarHistorial(historial) {
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));
}

function crearItemHistorial(item, tipo) {
  const funcion =
    item.funcion ||
    [item.date, item.time, item.roomName].filter(Boolean).join(" · ");
  const asientos = (item.asientos || item.seats || [])
    .map((asiento) =>
      typeof asiento === "string" ? asiento : asiento.seatCode,
    )
    .filter(Boolean);
  return {
    pelicula: item.pelicula || item.movieTitle || "Película",
    funcion: funcion || "Función sin horario",
    asientos,
    estado:
      item.estado ||
      item.status ||
      (tipo === "reserve" ? "Confirmada" : "Completada"),
  };
}

async function renderHistorial() {
  const usuario = obtenerUsuarioRegistrado();
  let historial = obtenerHistorial();

  // JSON Server es la fuente de verdad; localStorage queda solo como respaldo
  // para que la interfaz no se vacíe si el servidor local está apagado.
  try {
    const [reservasServidor, comprasServidor] = await Promise.all([
      obtenerReservas(),
      obtenerCompras(),
    ]);
    const correo = usuario?.email?.toLowerCase();
    historial = [
      ...reservasServidor
        .filter((item) => !correo || item.email?.toLowerCase() === correo)
        .map((item) => ({
          ...crearItemHistorial(item, "reserve"),
          tipo: "reserve",
        })),
      ...comprasServidor
        .filter((item) => !correo || item.email?.toLowerCase() === correo)
        .map((item) => ({
          ...crearItemHistorial(item, "purchase"),
          tipo: "purchase",
        })),
    ];
  } catch {
    // Se utiliza el respaldo local si JSON Server no está disponible.
  }

  const reservas = historial.filter((item) => item.tipo === "reserve");
  const compras = historial.filter((item) => item.tipo === "purchase");

  reservasList.innerHTML = reservas.length
    ? reservas
        .map(
          (item) =>
            `<li><strong>${escaparHtml(item.pelicula)}</strong><span>${escaparHtml(item.funcion)}</span><span>${escaparHtml(item.asientos.join(", "))}</span><em>${escaparHtml(item.estado)}</em></li>`,
        )
        .join("")
    : "<li>Sin reservas pendientes.</li>";

  comprasList.innerHTML = compras.length
    ? compras
        .map(
          (item) =>
            `<li><strong>${escaparHtml(item.pelicula)}</strong><span>${escaparHtml(item.funcion)}</span><span>${escaparHtml(item.asientos.join(", "))}</span><em>${escaparHtml(item.estado)}</em></li>`,
        )
        .join("")
    : "<li>No hay compras recientes.</li>";
}

function registrarOperacion(tipo, pelicula, funcion, asientos) {
  const historial = obtenerHistorial();
  const nuevaEntrada = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tipo,
    pelicula,
    funcion,
    asientos,
    estado: tipo === "reserve" ? "Pendiente" : "Confirmada",
    fecha: new Date().toLocaleString("es-CO"),
  };

  historial.unshift(nuevaEntrada);
  guardarHistorial(historial.slice(0, 10));
  renderHistorial();
}

async function renderRatingControls(movieId, movieTitle = "") {
  const usuario = obtenerUsuarioRegistrado();
  const storedRating = await obtenerValoracionPelicula(movieId, usuario?.email);
  const stars = Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    const active = value <= storedRating ? "active" : "";
    return `<button type="button" class="rating-star ${active}" data-rating="${value}" aria-label="Valorar con ${value} estrellas">★</button>`;
  }).join("");

  modalRating.innerHTML = `
    <div class="rating-label">
      <span>Valora la película</span>
      <div class="rating-stars">${stars}</div>
    </div>
  `;

  modalRating.querySelectorAll(".rating-star").forEach((starButton) => {
    starButton.addEventListener("click", async () => {
      const rating = Number(starButton.dataset.rating);
      const usuarioActual = obtenerUsuarioRegistrado();

      if (!usuarioActual?.email) {
        setStatusMessage(
          "Guarda tus datos de cliente antes de valorar una película.",
          "error",
        );
        return;
      }

      try {
        await guardarValoracion({
          tmdbId: Number(movieId),
          movieTitle: movieTitle || peliculaSeleccionada?.title || "Película",
          score: rating,
          userName: usuarioActual?.nombre || "Anónimo",
          email: usuarioActual?.email || "",
        });
        await renderRatingControls(movieId, movieTitle);
        setStatusMessage(
          `Has valorado la película con ${rating} estrella${rating > 1 ? "s" : ""}.`,
          "success",
        );
      } catch (error) {
        setStatusMessage(error.message, "error");
      }
    });
  });
}

async function enriquecerFuncionesConDisponibilidad(funciones) {
  return Promise.all(
    funciones.map(async (funcion) => {
      const disponibles = await contarAsientosDisponibles(funcion.id);
      return {
        ...funcion,
        availableSeats: disponibles ?? Number(funcion.room?.capacity ?? 40),
      };
    }),
  );
}

function funcionEstaVigente(funcion) {
  const fechaHora = new Date(`${funcion.date}T${funcion.time}`);
  return Number.isNaN(fechaHora.getTime()) || fechaHora > new Date();
}

function vincularChipsFunciones(horarios) {
  modalShowtimes.querySelectorAll(".time-chip").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const funcion = horarios.find(
        (item) => `${item.id}` === boton.dataset.functionId,
      );
      if (funcion) {
        await seleccionarFuncion(funcion);
      }
    });
  });
}

async function renderChipsFunciones(horarios) {
  modalShowtimes.innerHTML = horarios
    .map((funcion) => {
      const disponibles =
        funcion.availableSeats ?? funcion.room?.capacity ?? 40;
      const vigente = funcionEstaVigente(funcion);
      return `<button class="time-chip ${funcionSeleccionada && String(funcion.id) === String(funcionSeleccionada.id) ? "active" : ""}" type="button" data-function-id="${funcion.id}" ${vigente ? "" : "disabled"}><span class="time-text">${escaparHtml(funcion.time)}</span><span class="seat-count">${vigente ? `${disponibles} disponibles` : "Función finalizada"}</span></button>`;
    })
    .join("");

  vincularChipsFunciones(horarios);
}

async function refrescarDisponibilidadFunciones() {
  funcionesActuales =
    await enriquecerFuncionesConDisponibilidad(funcionesActuales);
  await renderChipsFunciones(funcionesActuales);
}

async function abrirModal(pelicula) {
  elementoFocoAntesModal = document.activeElement;
  peliculaSeleccionada = pelicula;
  modalTitle.textContent = pelicula.title;
  modalShowtimes.innerHTML = "<p class='empty-state'>Cargando funciones...</p>";
  modalBooking.innerHTML =
    "<p class='empty-state'>Preparando selección de asientos...</p>";
  capaModal.classList.add("open");
  document.querySelector("#modalClose").focus();

  try {
    const detalles = await obtenerDetallesPelicula(pelicula.id);
    const trailer = await obtenerTrailerPelicula(pelicula.id);
    const funciones = await obtenerFuncionesPelicula(pelicula.id);
    const director =
      detalles.credits?.crew?.find((persona) => persona.job === "Director")
        ?.name || "Director no disponible";
    const reparto =
      detalles.credits?.cast
        ?.slice(0, 4)
        .map((persona) => persona.name)
        .join(", ") || "Reparto no disponible";
    const protagonistas =
      detalles.credits?.cast
        ?.slice(0, 3)
        .map((persona) => persona.name)
        .join(", ") || "Protagonistas no disponibles";

    modalMeta.innerHTML = `
      <div class="movie-detail-grid">
        <div class="movie-poster-wrap">
          <img src="${detalles.poster_path ? `${URL_IMAGEN_TMDB}${detalles.poster_path}` : ""}" alt="Poster de ${pelicula.title}" class="movie-poster" />
        </div>
        <div class="movie-detail-info">
          <div>${pelicula.genreLabel || "Pelicula"} · ${detalles.runtime ? `${detalles.runtime} min` : pelicula.duration || "--"}</div>
          <div><strong>Estreno:</strong> ${detalles.release_date ? new Date(detalles.release_date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "Sin fecha"}</div>
          <div><strong>Director:</strong> ${director}</div>
          <div><strong>Protagonistas:</strong> ${protagonistas}</div>
          <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);"><strong>Reparto:</strong> ${reparto}</div>
          <div style="margin-top: 8px;"><strong>Valoracion:</strong> ${pelicula.rating || "N/A"} / 10</div>
        </div>
      </div>
    `;
    modalSynopsis.textContent = detalles.overview || pelicula.synopsis;
    await renderRatingControls(pelicula.id, pelicula.title);

    if (trailer) {
      modalTrailer.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=0&rel=0" title="Trailer de ${pelicula.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      modalTrailer.innerHTML = "▶ Trailer no disponible";
    }

    const horarios = funciones.filter(funcionEstaVigente);

    if (!horarios.length) {
      funcionesActuales = [];
      modalShowtimes.innerHTML =
        "<p class='empty-state'>Esta película no tiene funciones programadas.</p>";
      setStatusMessage(
        "Consulta otra película o vuelve cuando haya una función programada.",
        "info",
      );
      return;
    }

    funcionesActuales = await enriquecerFuncionesConDisponibilidad(horarios);
    await renderChipsFunciones(funcionesActuales);

    await seleccionarFuncion(funcionesActuales[0]);
  } catch (error) {
    modalTrailer.innerHTML = "▶ Trailer no disponible";
    modalShowtimes.innerHTML =
      "<p class='empty-state'>No se pudo cargar la programación.</p>";
    setStatusMessage(error.message, "error");
  }
}

async function inicializarDisponibilidadFuncion(funcion) {
  const roomId = Number(funcion.room.id ?? funcion.roomId ?? 1);
  const asientos = await obtenerAsientosSala(roomId);
  const disponibilidad = await obtenerDisponibilidadPorFuncion(funcion.id);

  if (disponibilidad.length === 0) {
    for (const asiento of asientos) {
      await crearDisponibilidadPorFuncion({
        functionId: funcion.id,
        seatId: asiento.id,
        seatCode: obtenerCodigoAsiento(asiento),
        location: obtenerUbicacionAsiento({
          ...asiento,
          columns: Number(funcion.room.columns || 8),
        }),
        status: "available",
      });
    }
  }

  asientosSala = asientos.map((asiento) => {
    const estado =
      disponibilidad.find(
        (registro) => String(registro.seatId) === String(asiento.id),
      )?.status || "available";
    return { ...asiento, status: estado };
  });
}

async function seleccionarFuncion(funcion) {
  if (!funcionEstaVigente(funcion)) {
    setStatusMessage("Esta función ya finalizó.", "error");
    return;
  }
  funcionSeleccionada = funcion;
  asientosSeleccionados = new Set();
  cantidadEntradas = 1;
  limpiarStatusMessage();

  if (!funcion?.room) {
    setStatusMessage(
      "La sala asignada a esta función no está disponible.",
      "error",
    );
    return;
  }

  try {
    await inicializarDisponibilidadFuncion(funcion);
    renderSala();

    modalShowtimes.querySelectorAll(".time-chip").forEach((boton) => {
      const isActive = String(boton.dataset.functionId) === String(funcion.id);
      boton.classList.toggle("active", isActive);
    });
  } catch (error) {
    setStatusMessage(error.message, "error");
  }
}

function renderSala() {
  if (!funcionSeleccionada?.room) {
    return;
  }

  const room = funcionSeleccionada.room;
  const filas = String(room.rows || "A,B,C,D,E")
    .split(",")
    .map((texto) => texto.trim())
    .filter(Boolean);
  const columnas = Number(room.columns || 8);

  const piezasFila = filas
    .map((fila) => {
      const butacas = Array.from({ length: columnas }, (_, indice) => {
        const numero = indice + 1;
        const asientoId = `${room.id}-${fila}-${numero}`;
        const asiento = asientosSala.find((item) => item.id === asientoId) || {
          id: asientoId,
          roomId: room.id,
          row: fila,
          number: numero,
          status: "available",
        };
        const estado = asientosSeleccionados.has(asiento.id)
          ? "selected"
          : asiento.status === "sold"
            ? "occupied"
            : asiento.status;
        const isDisabled = ["reserved", "occupied"].includes(estado);

        return `<button type="button" class="seat-btn ${estado}" data-seat-id="${asiento.id}" ${isDisabled ? "disabled" : ""} aria-label="Asiento ${fila}${numero} ${estado}"><span>${numero}</span></button>`;
      }).join("");

      return `
        <div class="seat-row">
          <span class="row-label">Fila ${fila}</span>
          ${butacas}
        </div>
      `;
    })
    .join("");

  const seleccionados = [...asientosSeleccionados].map((id) => {
    const asiento = asientosSala.find((item) => item.id === id);
    return formatearAsientoConUbicacion(asiento);
  });

  const usuarioActual = obtenerUsuarioRegistrado() || {
    nombre: "",
    documento: "",
    email: "",
    telefono: "",
  };
  const feedback = mensajeOperacion
    ? `<div class="booking-message booking-feedback ${mensajeOperacion.tipo}">${escaparHtml(mensajeOperacion.mensaje)}</div>`
    : '<div class="booking-feedback" aria-live="polite"></div>';

  modalBooking.innerHTML = `
    <div class="booking-header">
      <div>
        <p class="section-tag">Selección de sillas</p>
        <h4>${escaparHtml(funcionSeleccionada.time)} · ${escaparHtml(room.name)}</h4>
      </div>
      <div class="seat-legend">
        <span><i class="seat-indicator available"></i>Disponible</span>
        <span><i class="seat-indicator selected"></i>Seleccionado</span>
        <span><i class="seat-indicator reserved"></i>Reservado</span>
        <span><i class="seat-indicator occupied"></i>Ocupado</span>
      </div>
    </div>
    <div class="screen">Pantalla</div>
    <div class="seat-map">${piezasFila}</div>
    <div class="booking-info">
      <div class="info-item info-item-wide">
        <span class="info-label">Sillas:</span>
        <span class="info-value">${seleccionados.length ? seleccionados.map(escaparHtml).join("<br>") : "—"}</span>
      </div>
      <div class="info-item">
        <label class="info-label" for="ticketQuantity">Entradas:</label>
        <input id="ticketQuantity" class="ticket-quantity" type="number" min="1" max="${room.capacity}" value="${cantidadEntradas}" aria-describedby="ticketQuantityHelp" />
        <span id="ticketQuantityHelp" class="sr-only">Selecciona la misma cantidad de entradas y sillas.</span>
      </div>
      <div class="info-item">
        <span class="info-label">Total:</span>
        <span class="info-value highlight">$${(seleccionados.length * Number(funcionSeleccionada?.price || PRECIO_BASE)).toLocaleString("es-CO")}</span>
      </div>
    </div>
    <div class="user-register">
      <p class="register-label">Datos del cliente</p>
      <div class="user-grid">
        <input name="nombre" type="text" value="${escaparHtml(usuarioActual.nombre || "")}" placeholder="Nombre completo" aria-label="Nombre completo" autocomplete="name" class="user-input" />
        <input name="documento" type="text" value="${escaparHtml(usuarioActual.documento || "")}" placeholder="Documento" aria-label="Documento" class="user-input" />
        <input name="email" type="email" value="${escaparHtml(usuarioActual.email || "")}" placeholder="Correo" aria-label="Correo electrónico" autocomplete="email" class="user-input" />
        <input name="telefono" type="tel" value="${escaparHtml(usuarioActual.telefono || "")}" placeholder="Teléfono" aria-label="Teléfono" autocomplete="tel" class="user-input" />
      </div>
      <button type="button" class="btn btn-sm btn-secondary" data-action="save-user">Guardar</button>
    </div>
    <div class="booking-actions">
      <button type="button" class="btn btn-ghost" data-action="clear">Limpiar</button>
      <button type="button" class="btn btn-primary" data-action="reserve">Reservar</button>
      <button type="button" class="btn btn-primary" data-action="purchase">Comprar</button>
    </div>
    ${feedback}
  `;

  modalBooking.querySelectorAll(".seat-btn:not(:disabled)").forEach((boton) => {
    boton.addEventListener("click", async () => {
      await toggleAsiento(boton.dataset.seatId);
    });
  });

  modalBooking
    .querySelector("#ticketQuantity")
    ?.addEventListener("change", (evento) => {
      const cantidad = Number(evento.target.value);
      cantidadEntradas = Number.isInteger(cantidad)
        ? Math.min(Math.max(cantidad, 1), Number(room.capacity))
        : 1;
      renderSala();
    });

  modalBooking.querySelectorAll("[data-action]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const action = boton.dataset.action;
      if (action === "clear") {
        asientosSeleccionados.clear();
        renderSala();
        return;
      }
      if (["save-user", "reserve", "purchase"].includes(action)) {
        const form = modalBooking.querySelector(".user-register");
        const usuario = {
          nombre: form.querySelector('[name="nombre"]').value.trim(),
          documento: form.querySelector('[name="documento"]').value.trim(),
          email: form.querySelector('[name="email"]').value.trim(),
          telefono: form.querySelector('[name="telefono"]').value.trim(),
        };

        if (!validarDatosUsuario(usuario)) {
          setStatusMessage(
            "Todos los datos del cliente son obligatorios y deben tener un formato válido.",
            "error",
          );
          return;
        }

        guardarUsuarioRegistrado(usuario);
        void renderHistorial();
        if (action === "save-user") {
          setStatusMessage(
            "Datos del cliente guardados correctamente.",
            "success",
          );
          renderSala();
          return;
        }
      }
      await ejecutarAccion(action);
    });
  });
}

async function toggleAsiento(seatId) {
  if (!funcionSeleccionada?.room) {
    return;
  }

  const estado =
    asientosSala.find((item) => item.id === seatId)?.status || "available";
  if (["reserved", "sold"].includes(estado)) {
    setStatusMessage(
      "Este asiento ya no está disponible para seleccionar.",
      "error",
    );
    renderSala();
    return;
  }

  if (asientosSeleccionados.has(seatId)) {
    asientosSeleccionados.delete(seatId);
  } else {
    asientosSeleccionados.add(seatId);
  }

  renderSala();
}

async function ejecutarAccion(tipo) {
  if (operacionEnCurso) return;
  if (!funcionSeleccionada || asientosSeleccionados.size === 0) {
    setStatusMessage(
      "Selecciona al menos un asiento antes de continuar.",
      "error",
    );
    return;
  }

  if (asientosSeleccionados.size !== cantidadEntradas) {
    setStatusMessage(
      `Selecciona ${cantidadEntradas} silla${cantidadEntradas === 1 ? "" : "s"} para continuar.`,
      "error",
    );
    return;
  }

  const usuario = obtenerUsuarioRegistrado();
  if (!validarDatosUsuario(usuario)) {
    setStatusMessage(
      "Debes registrar y validar tus datos antes de continuar.",
      "error",
    );
    renderSala();
    return;
  }

  try {
    const ids = [...asientosSeleccionados];
    const validarDisponibilidad = async () => {
      const disponibilidad = await obtenerDisponibilidadPorFuncion(
        funcionSeleccionada.id,
      );
      for (const id of ids) {
        const registro = disponibilidad.find(
          (item) => String(item.seatId) === String(id),
        );
        if (!registro || registro.status !== "available") {
          const asiento = asientosSala.find((item) => item.id === id);
          throw new Error(
            `El asiento ${asiento?.row || ""}${asiento?.number || ""} ya no está disponible.`,
          );
        }
      }
      return disponibilidad;
    };

    // Validación inicial para no mostrar una confirmación que ya no es válida.
    await validarDisponibilidad();
    const confirmacion = await confirmarOperacion(tipo);
    if (!confirmacion) return;

    // Se consulta de nuevo después de confirmar: la disponibilidad puede haber
    // cambiado mientras el usuario revisaba el resumen.
    operacionEnCurso = true;
    await validarDisponibilidad();
    const selectedSeats = ids.map((id) => {
      const asiento = asientosSala.find((item) => item.id === id);
      return {
        seatId: asiento.id,
        seatCode: obtenerCodigoAsiento(asiento),
        location: obtenerUbicacionAsiento(asiento),
      };
    });

    const payload = {
      userName: usuario.nombre,
      email: usuario.email,
      tmdbId: peliculaSeleccionada.id,
      movieTitle: peliculaSeleccionada.title,
      functionId: Number(funcionSeleccionada.id),
      roomId: Number(funcionSeleccionada.room.id ?? funcionSeleccionada.roomId),
      roomName: funcionSeleccionada.room.name,
      date: funcionSeleccionada.date,
      time: funcionSeleccionada.time,
      quantity: cantidadEntradas,
      seats: selectedSeats,
      status: "processing",
      createdAt: new Date().toISOString(),
    };

    const nuevoEstado = tipo === "reserve" ? "reserved" : "sold";
    const registroOperacion =
      tipo === "reserve"
        ? await guardarReserva(payload)
        : await guardarCompra({
            ...payload,
            total:
              ids.length * Number(funcionSeleccionada.price || PRECIO_BASE),
          });
    const asientosActualizados = [];

    try {
      // Se relee cada asiento inmediatamente antes de modificarlo. Esto reduce
      // la ventana de carrera y evita usar una disponibilidad ya obsoleta.
      for (const id of ids) {
        const asiento = asientosSala.find((item) => item.id === id);
        const disponibilidadReciente = await obtenerDisponibilidadPorFuncion(
          funcionSeleccionada.id,
        );
        const registro = disponibilidadReciente.find(
          (item) => String(item.seatId) === String(id),
        );
        if (!registro || registro.status !== "available") {
          throw new Error(
            `El asiento ${obtenerCodigoAsiento(asiento)} ya no está disponible.`,
          );
        }

        await actualizarDisponibilidadPorFuncion(registro.id, {
          ...registro,
          status: nuevoEstado,
          seatCode: obtenerCodigoAsiento(asiento),
          location: obtenerUbicacionAsiento(asiento),
        });
        asientosActualizados.push(registro);
      }

      const payloadConfirmado = { ...registroOperacion, status: "confirmed" };
      if (tipo === "reserve") {
        await actualizarReserva(registroOperacion.id, payloadConfirmado);
      } else {
        await actualizarCompra(registroOperacion.id, payloadConfirmado);
      }
    } catch (error) {
      // Compensación: si falla algún paso, se restauran los asientos que este
      // intento ya cambió y se elimina su registro provisional.
      await Promise.allSettled(
        asientosActualizados.map((registro) =>
          actualizarDisponibilidadPorFuncion(registro.id, registro),
        ),
      );
      await (
        tipo === "reserve"
          ? eliminarReserva(registroOperacion.id)
          : eliminarCompra(registroOperacion.id)
      ).catch(() => {});
      throw error;
    }

    if (tipo === "reserve") {
      registrarOperacion(
        "reserve",
        peliculaSeleccionada?.title || "Película",
        `${funcionSeleccionada.time} · ${funcionSeleccionada.room?.name || "Sala general"}`,
        selectedSeats.map((seat) => seat.seatCode),
      );
    } else {
      registrarOperacion(
        "purchase",
        peliculaSeleccionada?.title || "Película",
        `${funcionSeleccionada.time} · ${funcionSeleccionada.room?.name || "Sala general"}`,
        selectedSeats.map((seat) => seat.seatCode),
      );
    }

    asientosSeleccionados.clear();
    await seleccionarFuncion(funcionSeleccionada);
    await refrescarDisponibilidadFunciones();
    setStatusMessage(
      tipo === "reserve"
        ? "Reserva realizada correctamente."
        : "Compra completada correctamente.",
      "success",
    );
  } catch (error) {
    setStatusMessage(error.message, "error");
  } finally {
    operacionEnCurso = false;
  }
}

rejilla.addEventListener("click", async (evento) => {
  const tarjeta = evento.target.closest(".ticket");
  if (tarjeta) {
    await abrirModal(peliculas[Number(tarjeta.dataset.index)]);
  }
});

rejilla.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" || evento.key === " ") {
    evento.target.click();
  }
});

document.querySelectorAll(".chip").forEach((filtro) =>
  filtro.addEventListener("click", () => {
    document.querySelector(".chip.active").classList.remove("active");
    filtro.classList.add("active");
    mostrarPeliculas(
      filtro.dataset.genre === "todos"
        ? peliculas
        : peliculas.filter(
            (pelicula) => pelicula.genre === filtro.dataset.genre,
          ),
    );
  }),
);

function cerrarModal() {
  capaModal.classList.remove("open");
  elementoFocoAntesModal?.focus?.();
}

document.querySelector("#modalClose").addEventListener("click", cerrarModal);

capaModal.addEventListener("click", (evento) => {
  if (evento.target === capaModal) {
    cerrarModal();
  }
});

document.addEventListener("keydown", (evento) => {
  if (!capaModal.classList.contains("open")) return;
  if (evento.key === "Escape") {
    cerrarModal();
    return;
  }
  if (evento.key === "Tab") {
    const elementos = [
      ...capaModal.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [href], iframe, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((elemento) => elemento.offsetParent !== null);
    if (!elementos.length) return;
    const primero = elementos[0];
    const ultimo = elementos.at(-1);
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }
});

cargarProximosEstrenos();

const fechaObjetivo = new Date();
fechaObjetivo.setDate(fechaObjetivo.getDate() + 18);
fechaObjetivo.setHours(20, 0, 0, 0);

function actualizarCuentaRegresiva() {
  const tiempoRestante = Math.max(0, fechaObjetivo - new Date());
  const valores = [
    Math.floor(tiempoRestante / 86400000),
    Math.floor(tiempoRestante / 3600000) % 24,
    Math.floor(tiempoRestante / 60000) % 60,
    Math.floor(tiempoRestante / 1000) % 60,
  ];

  document.querySelector("#countdown").innerHTML = valores
    .map(
      (valor, indice) =>
        `<div class="cd-unit"><div class="cd-num">${String(valor).padStart(2, "0")}</div><div class="cd-label">${["Días", "Horas", "Min", "Seg"][indice]}</div></div>`,
    )
    .join("");
}

actualizarCuentaRegresiva();
setInterval(actualizarCuentaRegresiva, 1000);

document.querySelectorAll(".perf").forEach((separador) => {
  separador.innerHTML = "<span></span>".repeat(40);
});

for (let indice = 0; indice < 40; indice += 1) {
  const bombilla = document.createElement("div");
  bombilla.className = "bulb";
  bombilla.style.left = `${indice < 20 ? indice * 5 : 100 - (indice - 20) * 5}%`;
  bombilla.style.top = `${indice < 20 ? 0 : 100}%`;
  bombilla.style.animationDelay = `${indice * 0.06}s`;
  document.querySelector("#bulbs").append(bombilla);
}

async function cargarPeliculas() {
  rejilla.innerHTML = `<p class="empty-state">Cargando cartelera...</p>`;
  try {
    const datos = await obtenerCartelera();
    peliculas = datos.results.map(convertirPelicula);
    mostrarPeliculas(peliculas);
  } catch (error) {
    rejilla.innerHTML = `<p class="empty-state">${error.message}. Revisa la configuración de TMDB.</p>`;
  }
}

cargarPeliculas();

const observador = new IntersectionObserver(
  (entradas) =>
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("in");
      }
    }),
  { threshold: 0.15 },
);

document
  .querySelectorAll(".reveal")
  .forEach((elemento) => observador.observe(elemento));

document.querySelector("#buscador").addEventListener("input", (evento) => {
  const query = evento.target.value.trim();
  if (query.length > 0) {
    buscarCarteleraProgramada(query)
      .then((datos) => {
        peliculas = datos.results.map(convertirPelicula);
        mostrarPeliculas(peliculas);
      })
      .catch((error) => {
        rejilla.innerHTML = `<p class="empty-state">${error.message}. Revisa la configuración de TMDB.</p>`;
      });
  } else {
    cargarPeliculas();
  }
});

renderHistorial();
