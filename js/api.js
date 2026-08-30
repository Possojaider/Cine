import { TOKEN_LECTURA_TMDB, URL_BASE_TMDB } from "./config.js";

const JSON_SERVER_URL = "http://localhost:3000";

/**
 * =========================================================
 * TMDB
 * =========================================================
 */

async function solicitarDatos(ruta, parametros = {}) {
  const parametrosBusqueda = new URLSearchParams({
    language: "es-MX",
    ...parametros,
  });

  const response = await fetch(
    `${URL_BASE_TMDB}${ruta}?${parametrosBusqueda}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN_LECTURA_TMDB}`,
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("No se pudo consultar TMDB");
  }

  return response.json();
}

/**
 * =========================================================
 * CARTELERA
 * =========================================================
 *
 * La cartelera viene directamente de TMDB.
 * JSON Server NO controla las películas de la cartelera.
 */

export async function obtenerCartelera() {
  return await solicitarDatos("/movie/now_playing", {
    region: "CO",
    page: "1",
  });
}

/**
 * =========================================================
 * BUSCAR PELÍCULAS
 * =========================================================
 *
 * El buscador consulta directamente TMDB.
 */

export async function buscarPeliculas(query) {
  if (!query || !query.trim()) {
    return {
      results: [],
    };
  }

  return await solicitarDatos("/search/movie", {
    query: query.trim(),
    include_adult: "false",
    page: "1",
  });
}

/**
 * Busca dentro de la cartelera actual de TMDB.
 */

export async function buscarCarteleraProgramada(query) {
  if (!query || !query.trim()) {
    return {
      results: [],
    };
  }

  const cartelera = await obtenerCartelera();

  const termino = query.trim().toLocaleLowerCase("es");

  const peliculasFiltradas = (cartelera.results || []).filter((pelicula) =>
    [pelicula.title, pelicula.original_title]
      .filter(Boolean)
      .some((titulo) => titulo.toLocaleLowerCase("es").includes(termino)),
  );

  return {
    results: peliculasFiltradas,
  };
}

/**
 * =========================================================
 * DETALLES DE PELÍCULA
 * =========================================================
 */

export async function obtenerDetallesPelicula(movieId) {
  return await solicitarDatos(`/movie/${movieId}`, {
    append_to_response: "credits",
  });
}

/**
 * =========================================================
 * TRÁILER
 * =========================================================
 */

export async function obtenerTrailerPelicula(movieId) {
  const datos = await solicitarDatos(`/movie/${movieId}/videos`);

  return (
    datos.results?.find(
      (video) => video.type === "Trailer" && video.site === "YouTube",
    ) || null
  );
}

/**
 * =========================================================
 * ASIENTOS DISPONIBLES
 * =========================================================
 */

export async function contarAsientosDisponibles(functionId) {
  try {
    const response = await fetch(
      `${JSON_SERVER_URL}/functionSeats?functionId=${functionId}`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.length) {
      return null;
    }

    return data.filter((registro) => registro.status === "available").length;
  } catch {
    return null;
  }
}

/**
 * =========================================================
 * VALORACIONES
 * =========================================================
 */

export async function obtenerValoracionPelicula(tmdbId, email = "") {
  try {
    const parametros = new URLSearchParams({
      tmdbId: String(tmdbId),
    });

    if (email) {
      parametros.set("email", email);
    }

    const response = await fetch(`${JSON_SERVER_URL}/ratings?${parametros}`);

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();

    return data.length ? Number(data[0].score) : 0;
  } catch {
    return 0;
  }
}

export async function guardarValoracion(valoracion) {
  const parametros = new URLSearchParams({
    tmdbId: String(valoracion.tmdbId),
  });

  if (valoracion.email) {
    parametros.set("email", valoracion.email);
  }

  const response = await fetch(`${JSON_SERVER_URL}/ratings?${parametros}`);

  const existentes = response.ok ? await response.json() : [];

  if (existentes.length) {
    const actualizada = await fetch(
      `${JSON_SERVER_URL}/ratings/${existentes[0].id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...existentes[0],
          ...valoracion,
          updatedAt: new Date().toISOString(),
        }),
      },
    );

    if (!actualizada.ok) {
      throw new Error("No se pudo actualizar la valoración.");
    }

    return actualizada.json();
  }

  const creada = await fetch(`${JSON_SERVER_URL}/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...valoracion,
      createdAt: new Date().toISOString(),
    }),
  });

  if (!creada.ok) {
    throw new Error("No se pudo guardar la valoración.");
  }

  return creada.json();
}

/**
 * =========================================================
 * FUNCIONES DEL CINE
 * =========================================================
 *
 * Las funciones sí vienen de JSON Server.
 * Aquí se relaciona el ID de TMDB con la programación local.
 */

export async function obtenerFuncionesPelicula(movieId) {
  const response = await fetch(
    `${JSON_SERVER_URL}/functions?movieId=${movieId}`,
  );

  if (!response.ok) {
    throw new Error("No se pudo consultar la programación local.");
  }

  const salas = await obtenerSalas();
  const funciones = await response.json();

  // =====================================================
  // FILTRAMOS SOLO LAS FUNCIONES QUE SIGUEN VIGENTES
  // =====================================================
  //
  // Antes, si ya existía cualquier registro en "functions"
  // (aunque fuera de ayer o de horas ya pasadas), el código
  // lo devolvía tal cual y nunca generaba funciones nuevas.
  // Esto provocaba que, una vez pasadas las 14:00/17:00/20:00
  // del día en que se crearon, TODAS las películas mostraran
  // "no hay funciones programadas", incluso si json-server
  // tenía datos.

  const ahora = new Date();
  const esVigente = (funcion) => {
    const fechaHora = new Date(`${funcion.date}T${funcion.time}`);
    return Number.isNaN(fechaHora.getTime()) || fechaHora > ahora;
  };

  const funcionesVigentes = funciones.filter(esVigente);

  // =====================================================
  // SI YA EXISTEN FUNCIONES VIGENTES, LAS DEVOLVEMOS
  // =====================================================

  if (funcionesVigentes.length > 0) {
    return funcionesVigentes.map((funcion) => {
      const sala = salas.find(
        (salaActual) => Number(salaActual.id) === Number(funcion.roomId),
      );

      return {
        ...funcion,
        price: Number(funcion.price ?? 18000),

        room: sala || {
          id: 1,
          name: "Sala general",
          rows: "A,B,C,D,E",
          columns: 8,
        },
      };
    });
  }

  // =====================================================
  // SI NO HAY FUNCIONES VIGENTES (NO EXISTEN O YA PASARON),
  // LAS CREAMOS AUTOMÁTICAMENTE
  // =====================================================

  if (!salas.length) {
    throw new Error("No hay salas configuradas en el cine.");
  }

  const funcionesCreadas = [];

  // Usamos hasta 3 salas disponibles
  const salasParaCrear = salas.slice(0, 3);

  const horarios = ["14:00", "17:00", "20:00"];
  const hoy = new Date().toISOString().split("T")[0];
  const mañana = new Date(ahora.getTime() + 86400000)
    .toISOString()
    .split("T")[0];

  for (let i = 0; i < salasParaCrear.length; i++) {
    const sala = salasParaCrear[i];

    const hora = horarios[i];

    // Si ese horario de hoy ya pasó, programamos la función para mañana
    // en lugar de crear una función que nace vencida.
    const fechaHoraCandidata = new Date(`${hoy}T${hora}`);
    const fecha = fechaHoraCandidata > ahora ? hoy : mañana;

    const nuevaFuncion = {
      movieId: Number(movieId),
      roomId: Number(sala.id),
      date: fecha,
      time: hora,
      price: 18000,
    };

    const crearResponse = await fetch(`${JSON_SERVER_URL}/functions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nuevaFuncion),
    });

    if (!crearResponse.ok) {
      continue;
    }

    const funcionCreada = await crearResponse.json();

    // ===================================================
    // CREAR DISPONIBILIDAD DE ASIENTOS
    // ===================================================

    const asientosResponse = await fetch(
      `${JSON_SERVER_URL}/seats?roomId=${sala.id}`,
    );

    if (asientosResponse.ok) {
      const asientos = await asientosResponse.json();

      for (const asiento of asientos) {
        // Evitamos duplicar functionSeats
        const disponibilidadResponse = await fetch(
          `${JSON_SERVER_URL}/functionSeats?functionId=${funcionCreada.id}&seatId=${asiento.id}`,
        );

        const disponibilidadExistente = disponibilidadResponse.ok
          ? await disponibilidadResponse.json()
          : [];

        if (disponibilidadExistente.length === 0) {
          await fetch(`${JSON_SERVER_URL}/functionSeats`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              functionId: Number(funcionCreada.id),
              seatId: Number(asiento.id),
              status: "available",
            }),
          });
        }
      }
    }

    funcionesCreadas.push({
      ...funcionCreada,
      price: Number(funcionCreada.price ?? 18000),
      room: sala,
    });
  }

  return funcionesCreadas;
}

/**
 * =========================================================
 * SALAS
 * =========================================================
 */

export async function obtenerSalas() {
  const response = await fetch(`${JSON_SERVER_URL}/rooms`);

  if (!response.ok) {
    throw new Error("No se pudo consultar las salas del cine.");
  }

  return response.json();
}

export async function obtenerSala(roomId) {
  const response = await fetch(`${JSON_SERVER_URL}/rooms/${roomId}`);

  if (!response.ok) {
    throw new Error("No se pudo consultar la sala seleccionada.");
  }

  return response.json();
}

/**
 * =========================================================
 * ASIENTOS
 * =========================================================
 */
