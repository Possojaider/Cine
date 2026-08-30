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
