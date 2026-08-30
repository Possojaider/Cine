# 🎬 The JP CINEMA

> **Vive el cine. Vive la experiencia.**

The JP CINEMA es una plataforma web para consultar la cartelera de películas, conocer información de cada película y visualizar las funciones disponibles de un cine de forma sencilla, rápida y moderna.

---

## 📌 Descripción

**The JP CINEMA** nace como un proyecto web enfocado en ofrecer una experiencia digital para los usuarios de un cine.

La plataforma permite consultar las películas disponibles, acceder a información relevante de cada título y conocer las funciones programadas.

El proyecto está diseñado con una arquitectura sencilla y escalable, permitiendo incorporar posteriormente funcionalidades como compra de entradas, selección de sillas, autenticación de usuarios y métodos de pago.

---

## ✨ Características

- 🎬 Visualización de películas en cartelera.
- 🔎 Consulta de información detallada de cada película.
- 🕐 Consulta de funciones disponibles.
- 💺 Selección de sala
- 💺 Selección y reserva de sillas.
- 🎟️ Compra de entradas.
- 💳 Proceso de compra de boletos.
- 📱 Diseño adaptable a diferentes dispositivos.
- ⚡ Interfaz rápida e intuitiva.
- 🎨 Diseño moderno inspirado en plataformas cinematográficas.
- 🔐 Gestión de configuración mediante variables.
- 🌐 Integración con APIs para obtener información de películas.

---

## Funcionalidades

- Cartelera, búsqueda, detalle, reparto y tráiler desde TMDB.
- Funciones locales con sala, horario, precio y disponibilidad.
- Mapa visual de asientos, selección múltiple y validación de entradas.
- Reserva o compra persistida en `reservations`, `purchases` y `functionSeats`.
- Historial del cliente consultado desde JSON Server, con respaldo local si el
  servidor no está disponible.
- Valoración individual por correo electrónico.

---

## 🛠️ Tecnologías utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- JSON-Server

### APIs / Servicios

- API de cartelera/configuración
- TMDB para información relacionada con películas

### Herramientas

- Git
- GitHub
- Visual Studio Code
- Node.js

---

## 📂 Estructura del proyecto

```text
The-JP-CINEMA/
│
│
├── .vscode/
│   ├── launch.json
│   └── settings.json
│
├── css/
│   └── style.css
│
├── js/
│   ├── api.js
│   ├── app.js
│   └── config.js
│
├── db.json
│
├── index.html
│
└── README.md
```

> La estructura puede variar dependiendo de la versión actual del proyecto.

---

## ⚙️ Configuración

Para utilizar el proyecto correctamente, debes configurar las credenciales necesarias en el archivo de configuración.

Ejemplo:

```javascript
const CONFIG = {
  API_URL: "TU_URL_BASE",
  API_TOKEN: "TU_TOKEN",
};
```

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Possojaider/Cine
```

### 2. Entrar al proyecto

```bash
cd The-JP-CINEMA
```

### 3. Configurar la API

Agrega la URL base y el token correspondiente en el archivo de configuración.

## 4. Ejecutar localmente

1. En una terminal, inicia la base local:

   ```bash
   npx json-server db.json --port 3000
   ```

2. Sirve esta carpeta con Live Server u otro servidor estático.
3. Abre la URL del servidor estático en el navegador.

No abras `index.html` directamente: el navegador bloquearía las peticiones a los
módulos y a los servicios externos.

---

## 🎯 Flujo principal

```text
                    ┌──────────────┐
                    │   INICIO     │
                    └──────┬───────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │    CARTELERA     │
                 └────────┬─────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │  Película   │           │  Funciones  │
      └──────┬──────┘           └──────┬──────┘
             │                         │
             └───────────┬─────────────┘
                         ▼
                 ┌─────────────────┐
                 │ Detalle película│
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Reservar entrada│
                 │                 │
                 └─────────────────┘
```

---

## 🎟️ Flujo de compra y reserva

El usuario puede realizar el proceso completo desde la plataforma:

```text
┌──────────────┐
│    INICIO    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│     CARTELERA    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Seleccionar      │
│ película         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Seleccionar      │
│ función          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Seleccionar      │
│ sillas           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Confirmar compra  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Entrada / Reserva │
│ confirmada        │
└──────────────────┘
```

---

## 💺 Reserva de sillas

JP CINEMA permite al usuario seleccionar las sillas disponibles dentro de la sala antes de confirmar su reserva o compra.

El sistema diferencia entre:

- 🟢 **Silla disponible**
- 🔴 **Silla ocupada**
- 🟡 **Silla seleccionada**

De esta manera, el usuario puede visualizar la distribución de la sala y elegir exactamente dónde desea sentarse.

---

## 🎟️ Compra de entradas

El usuario puede:

1. Seleccionar una película.
2. Elegir una función.
3. Seleccionar sus sillas.
4. Revisar el resumen de la compra.
5. Confirmar la operación.
6. Obtener la confirmación de sus entradas.

Esto permite completar el proceso de compra directamente desde la plataforma.

---

## 🎟️ Funcionalidades futuras

El proyecto puede crecer incorporando:

- 👤 Registro avanzado e inicio de sesión.
- 💳 Integración con métodos de pago avanzado.
- 📧 Confirmación de reservas.
- 📱 Diseño responsive avanzado.
- ⭐ Sistema de favoritos.
- 🔔 Notificaciones.
- 👨‍💼 Panel administrativo.
- 🕐 Gestión de funciones.
- 📊 Estadísticas de ventas.

---

## 🎨 Identidad

### Nombre

**JP CINEMA**

### Eslogan

**Donde las historias trascienden la pantalla, las emociones cobran
vida y cada visita se convierte en una experiencia inolvidable...**

### Concepto

JP CINEMA busca representar una experiencia cinematográfica moderna, sencilla y accesible, combinando tecnología, entretenimiento y una interfaz intuitiva.

---

## 👨‍💻 Autor

**Jaider Posso**

Proyecto desarrollado con fines académicos y de aprendizaje en desarrollo web.

---

## 📄 Licencia

Este proyecto puede ser utilizado con fines educativos.

---

⭐ **Si te gusta el proyecto, puedes darle una estrella al repositorio.**

🎬 **The JP CINEMA — El cine que convierte cada historia en una experiencia.**
