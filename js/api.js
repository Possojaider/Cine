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
