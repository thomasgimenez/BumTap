# CLAUDE.md — Botonera de Sonidos (PWA)

## Descripción del Proyecto

App tipo "soundboard" (botonera de sonidos) distribuida como Progressive Web App (PWA). La app muestra una grilla de botones, cada uno asociado a un sonido (memes, frases graciosas y efectos de sonido). El usuario toca un botón y se reproduce el sonido correspondiente. Debe poder instalarse en el dispositivo móvil desde el navegador y funcionar offline.

## Stack Tecnológico

- **HTML5 / CSS3 / JavaScript (vanilla)** — Sin frameworks. El proyecto es lo suficientemente simple para no necesitarlos y esto minimiza el tamaño del bundle, mejora la performance y simplifica el deploy.
- **Service Worker** — Para cache offline y comportamiento PWA.
- **Web Audio API / HTML5 Audio** — Para reproducción de sonidos con baja latencia.
- **Manifest (manifest.json)** — Para que sea instalable como PWA.

## Estructura del Proyecto

```
/
├── index.html          # Página principal (SPA)
├── style.css           # Estilos
├── app.js              # Lógica principal
├── sw.js               # Service Worker
├── manifest.json       # Manifest PWA
├── sounds.json         # Catálogo de sonidos (metadata)
├── sounds/             # Carpeta con archivos de audio
│   ├── bruh.mp3
│   ├── rimshot.mp3
│   └── ...
├── icons/              # Íconos de la app para PWA
│   ├── icon-192.png
│   └── icon-512.png
└── CLAUDE.md
```

## Arquitectura y Decisiones de Diseño

### Catálogo de sonidos (`sounds.json`)

Archivo JSON central que define todos los sonidos disponibles. Esto permite agregar nuevos sonidos sin tocar código: solo se agrega el archivo `.mp3` a `/sounds/` y se añade una entrada al JSON.

```json
[
  {
    "id": "bruh",
    "label": "Bruh",
    "file": "sounds/bruh.mp3",
    "category": "meme",
    "color": "#FF6B6B"
  },
  {
    "id": "rimshot",
    "label": "Rimshot 🥁",
    "file": "sounds/rimshot.mp3",
    "category": "sfx",
    "color": "#4ECDC4"
  }
]
```

Campos:
- `id` — Identificador único del sonido.
- `label` — Texto que se muestra en el botón (puede incluir emojis).
- `file` — Ruta al archivo de audio (relativa a la raíz).
- `category` — `"meme"` o `"sfx"`. Se usa para filtrar.
- `color` (opcional) — Color de fondo del botón. Si no se provee, se asigna uno por defecto según la categoría.

### Reproducción de Audio

- Usar `HTMLAudioElement` por simplicidad.
- Pre-cargar los sonidos al inicio (`preload`) para evitar latencia en la primera reproducción.
- Si un sonido está reproduciéndose y se vuelve a tocar el mismo botón, reiniciar la reproducción desde el inicio (`audio.currentTime = 0`).
- Si se toca un botón diferente mientras otro suena, detener el anterior y reproducir el nuevo (modo "un sonido a la vez").

### UI / UX

- **Layout**: Grilla responsiva de botones (`CSS Grid`), entre 2 y 4 columnas dependiendo del ancho de pantalla.
- **Botones**: Cuadrados redondeados con el label del sonido. Feedback visual al tocar (escala + cambio de opacidad). Cada botón tiene un color de fondo (definido en sounds.json o asignado por categoría).
- **Filtro por categoría**: Tabs o botones en la parte superior para filtrar: "Todos", "Memes", "SFX".
- **Buscador**: Campo de texto simple para buscar sonidos por nombre (filtro en tiempo real sobre el label).
- **Diseño mobile-first**: Optimizado para uso con una mano en el teléfono.
- **Tema oscuro por defecto**: Fondo oscuro, botones coloridos. Más cómodo y moderno.
- **Sin scroll horizontal**: Todo debe caber en el viewport o hacer scroll vertical.

### PWA (Progressive Web App)

- **`manifest.json`**: Nombre de la app, íconos, color de tema, `display: standalone`, `start_url: "/"`.
- **Service Worker (`sw.js`)**: Estrategia cache-first. En el evento `install`, cachear todos los assets estáticos (HTML, CSS, JS, sounds.json y todos los archivos de audio). Esto permite funcionamiento 100% offline.
- **Instalable**: El manifest + service worker hacen que el navegador ofrezca "Agregar a pantalla de inicio".

### Agregar nuevos sonidos

Para agregar un nuevo sonido:
1. Colocar el archivo `.mp3` en la carpeta `/sounds/`.
2. Agregar una entrada en `sounds.json` con los campos correspondientes.
3. Actualizar la lista de archivos en el cache del Service Worker (`sw.js`) si se usa cache estático. Incrementar la versión del cache para forzar la actualización.

## Requisitos Funcionales

- [ ] Mostrar una grilla de botones generada dinámicamente desde `sounds.json`.
- [ ] Al tocar un botón, reproducir el sonido asociado.
- [ ] Feedback visual al tocar un botón (animación).
- [ ] Filtrar sonidos por categoría (Todos / Memes / SFX).
- [ ] Buscar sonidos por nombre.
- [ ] Funcionar offline una vez cargada.
- [ ] Ser instalable como PWA en iOS y Android.
- [ ] Responsiva: funcionar bien en móvil, tablet y desktop.

## Requisitos No Funcionales

- Baja latencia en la reproducción de sonidos (< 100ms percibido).
- Tamaño total del proyecto lo más liviano posible (comprimir audios a 128kbps o menos).
- Carga inicial rápida (< 3 segundos en 4G).
- Accesible: botones con etiquetas legibles, contraste adecuado.

## Convenciones de Código

- JavaScript moderno (ES6+): `const`/`let`, arrow functions, template literals, `async/await`.
- Nombres de variables y funciones en camelCase, en inglés.
- Comentarios en español donde sea útil para claridad.
- CSS con custom properties (variables) para colores y espaciados.
- Indentación: 2 espacios.
- Sin dependencias externas (no npm, no bundlers).

## Deploy

La app es 100% estática (HTML/CSS/JS + archivos de audio). Se puede servir desde cualquier hosting estático:
- **GitHub Pages** (gratis)
- **Netlify** (gratis)
- **Vercel** (gratis)
- **Firebase Hosting** (gratis en tier gratuito)

Solo se necesita subir los archivos a la raíz del hosting. No requiere build step ni servidor backend.

## Sonidos Placeholder

Para desarrollo, se pueden generar sonidos de prueba o usar sonidos libres de derechos. La estructura del `sounds.json` inicial debería tener ~15 entradas de ejemplo con categorías variadas para poder probar el layout, filtros y la reproducción.

## Notas Importantes

- En iOS Safari, la reproducción de audio requiere interacción del usuario para iniciar. Asegurarse de que el audio se dispare siempre en respuesta a un evento de `click` o `touchend`.
- El Service Worker necesita HTTPS para funcionar (salvo en `localhost`). El hosting elegido debe servir por HTTPS.
- Los archivos de audio deberían estar en formato `.mp3` (compatibilidad universal) o `.webm`/`.ogg` como fallback para menor tamaño.
