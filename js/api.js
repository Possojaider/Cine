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
