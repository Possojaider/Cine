# The JP Cinema

Aplicación web para consultar la cartelera de TMDB y gestionar funciones, salas,
asientos, reservas, compras y valoraciones mediante JSON Server.

## Ejecutar localmente

1. En una terminal, inicia la base local:

   ```bash
   npx json-server db.json --port 3000
   ```

2. Sirve esta carpeta con Live Server u otro servidor estático.
3. Abre la URL del servidor estático en el navegador.

No abras `index.html` directamente: el navegador bloquearía las peticiones a los
módulos y a los servicios externos.

## Funcionalidades

- Cartelera, búsqueda, detalle, reparto y tráiler desde TMDB.
- Funciones locales con sala, horario, precio y disponibilidad.
- Mapa visual de asientos, selección múltiple y validación de entradas.
- Reserva o compra persistida en `reservations`, `purchases` y `functionSeats`.
- Historial del cliente consultado desde JSON Server, con respaldo local si el
  servidor no está disponible.
- Valoración individual por correo electrónico.

## Datos y seguridad

Las funciones deben existir en la colección `functions` antes de poder
reservarse; la aplicación no crea programación temporal. `functionSeats` guarda
el estado de cada silla por función.

La credencial de TMDB en `js/config.js` es adecuada solo para una demostración
local. Para publicar la aplicación, revócala y llama a TMDB desde un backend o
proxy que guarde la credencial en una variable de entorno.

JSON Server no ofrece transacciones atómicas. La interfaz vuelve a consultar la
disponibilidad justo antes de persistir, pero una aplicación multiusuario real
requiere que el backend bloquee o actualice los asientos de forma atómica.
