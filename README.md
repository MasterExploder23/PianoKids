# 🎹 PianoKids — App para aprender piano

## Archivos del proyecto

```
pianokids/
├── index.html      ← App principal (todo en un archivo)
├── manifest.json   ← Configuración PWA
├── sw.js           ← Service Worker (offline + caché)
├── icon-192.png    ← Ícono app
├── icon-512.png    ← Ícono app grande
├── package.json    ← Scripts de test
├── audio.js        ← Motor de sonido (Web Audio puro, sin dependencias)
├── ritmo.js        ← Motor de ritmo: tempo, ventanas de timing y precisión
├── data/           ← Datos separados del código
│   ├── canciones.js   ← Catálogo de canciones
│   ├── curriculum.js  ← Los 5 módulos de lecciones
│   └── escenas.js     ← Fondos SVG de la tienda
├── tests/
│   ├── harness.js  ← Arranca la app en JSDOM con audio stubbeado
│   ├── run.js      ← Suite de regresión (36 tests)
│   ├── smoke.js    ← Smoke funcional simulando uso real (32 tests)
│   ├── v13.js      ← Pentagrama, teclas, arrastre y motor de audio (46 tests)
│   ├── midi.js     ← Teclado MIDI con puerto simulado (34 tests)
│   ├── lecciones.js← Currículum, progresión y teoría musical (45 tests)
│   ├── engagement.js← Misiones, racha, tienda, fondos y mascota (74 tests)
│   ├── perfiles.js ← Perfiles y copia de seguridad (42 tests)
│   └── ritmo.js    ← Formato con duración, tempo y precisión (47 tests)
└── README.md       ← Este archivo
```

## Tests

```bash
npm install     # sólo la primera vez (instala jsdom)
npm test        # corre las dos suites
```

Los tests arrancan el `index.html` real en JSDOM con Tone.js y el micrófono
stubbeados, y verifican tanto lógica (racha, persistencia) como comportamiento
(tocar teclas, navegar pestañas, iniciar canciones).

**Corré `npm test` antes de cada push.** La suite cubre específicamente las
regresiones que rompieron v1.0/v1.1: datos demo en el panel de padres, íconos
faltantes y caché que no se actualiza.

## Cómo instalar como app en el celular / PC

### Opción 1 — Servidor local (recomendado para desarrollo)

```bash
# Con Python
cd pianokids
python3 -m http.server 8080

# Con Node.js
npx serve .
```
Abrí `http://localhost:8080` en el navegador.
El banner "Instalar" aparece automáticamente en Chrome/Edge/Android.

### Opción 2 — Subir a hosting gratuito

1. **GitHub Pages** (gratis):
   - Creá un repo en github.com
   - Subí los archivos
   - Activá GitHub Pages en Settings → Pages
   - URL: `https://tu-usuario.github.io/pianokids`

2. **Netlify** (gratis, arrastrá la carpeta):
   - Entrá a netlify.com
   - Arrastrá la carpeta `pianokids` al panel
   - Listo, te da una URL pública

3. **Vercel** (gratis):
   ```bash
   npx vercel --prod
   ```

### Cómo instalar en dispositivos

**Android (Chrome):**
- Abrí la URL en Chrome
- Tocá los 3 puntos → "Añadir a pantalla de inicio"
- O esperá el banner automático que aparece

**iPhone / iPad (Safari):**
- Abrí la URL en Safari
- Tocá el botón Compartir (cuadrado con flecha)
- Tocá "Añadir a pantalla de inicio"

**PC (Chrome/Edge):**
- Abrí la URL
- Clic en el ícono de instalación en la barra de direcciones
- O menú → "Instalar PianoKids"

## Teclado MIDI

Conectá cualquier teclado MIDI por USB antes de abrir la app (o después: se
detecta solo). Cuando hay uno conectado aparece un chip verde con su nombre en
el encabezado, y el teclado toca en la pestaña que estés viendo: lecciones,
canciones, juegos y pentagrama.

- **Rango:** el teclado en pantalla va de C3 a C6. Las notas fuera de ese rango
  se transportan por octavas hasta que entran, así que un controlador de 61 u 88
  teclas funciona sin configurar nada. La nota nunca cambia, sólo la octava.
- **Dinámica:** la fuerza con que tocás (velocity MIDI) controla el volumen.
  Con mouse, dedo o teclas de la PC no hay dinámica y se usa un valor fijo.
- **Soporte:** Web MIDI anda en Chrome, Edge y Android. **Safari e iOS no lo
  implementan**; ahí el chip no aparece y el teclado en pantalla funciona igual.
- Chrome puede pedir permiso la primera vez. Si lo rechazás, la app sigue
  andando normalmente sin MIDI.

## Deploy — IMPORTANTE

Antes de cada push a producción:

1. `npm test` (tiene que dar 358/358)
2. **Subí `BUILD` en `sw.js`** (línea 5). Es lo que invalida la caché vieja.
   Si no lo subís, los usuarios que ya instalaron la app siguen viendo la versión anterior.
3. Commit → push → Vercel redeploya solo.

El documento se sirve **network-first**, así que un deploy nuevo llega al usuario
en la siguiente visita aunque tenga la app instalada. Los assets (íconos, fuentes,
Tone.js) van cache-first porque son inmutables dentro de un mismo build.

## Ícono de la app

`icon-192.png` y `icon-512.png` están generados y commiteados. Son `maskable`:
todo el contenido vive dentro del círculo seguro (radio 0,39 × tamaño), así que
Android puede recortarlos en cualquier forma sin cortar el teclado ni la nota.

Si querés regenerarlos, cualquier PNG cuadrado sirve — respetá la zona segura
del 80% central. Herramienta útil: https://maskable.app

## Funciones

- 🎹 Teclado de 3 octavas con 2 instrumentos (piano y órgano) sintetizados
- 📚 Currículum de 23 lecciones en 5 módulos, con explicación, demostración,
  práctica guiada y evaluación con estrellas según desempeño
- 🎵 15 canciones (folklore, Disney, clásicas, navidad, pop) en dos modos:
  **a mi tiempo** (la app espera) y **con ritmo** (la canción avanza al tempo y
  se mide la precisión)
- 🎼 Pentagrama en tiempo real
- 🥁 Metrónomo con péndulo animado
- 🎮 7 mini juegos (incluye karaoke, dictado melódico y memoria musical)
- 🎛️ Soporte de teclado MIDI real por USB, con dinámica por velocity
- 🎙️ Detección de notas por micrófono
- 👥 Hasta 4 perfiles con progreso separado, para hermanos
- 💾 Copia de seguridad a archivo JSON (exportar / restaurar)
- 💾 Progreso guardado automáticamente (localStorage)
- 🎯 Misiones diarias y premios por racha (3/7/14/30 días)
- 🛍️ Tienda: cada tema cambia el teclado **y el fondo de la app** con una escena
  ilustrada (océano, bosque, atardecer, galaxia), y cada avatar trae su mascota
- 🐾 La mascota pasea por el fondo y se sienta a mirarte cuando tocás
- 🌀 Círculo de quintas dibujado y explicado
- 🔥 Racha diaria real, calculada sobre días de calendario
- 👨‍👩‍👧 Panel de padres con progreso, actividad semanal y notas más tocadas
- 📲 Instalable como app (PWA)
- 🌐 Funciona sin internet una vez cacheado

## Peso y rendimiento

Medido en v2.0, después de sacar Tone.js:

| | crudo | gzip |
|---|---|---|
| `index.html` | 185 KB | 45 KB |
| `audio.js` | 9 KB | 3 KB |
| `data/*.js` | 45 KB | 8 KB |
| **Total** | **239 KB** | **56 KB** |

**La app no tiene ninguna dependencia externa de JavaScript.** Antes cargaba
Tone.js (349 KB / 79 KB gzip) desde un CDN para usar 7 de sus clases. Se
reemplazó por `audio.js`: 9 KB de Web Audio a mano que cubren los 2
instrumentos y los 4 sonidos del metrónomo. **Es un 58% menos de peso total** y
además elimina el CDN como punto de falla del modo offline.

Todo el sonido se genera matemáticamente: no hay samples ni archivos de audio.

**Los datos de `data/` se cargan con `<script>` normales**, no con `fetch`. Así
comparten el scope global y el arranque sigue siendo sincrónico. Editar una
canción o una lección no requiere abrir `index.html`.

## Ritmo y duraciones

Cada nota es `{n: altura, d: duración en negras}`. `d:1` es negra, `0.5` corchea,
`2` blanca, `3` blanca con puntillo.

**7 de las 15 canciones tienen el ritmo real escrito a mano.** Las otras 8 están
marcadas con `ritmoAprox: true` y usan negras uniformes, que es lo que la app
hacía hasta v2.0. Se marcan así a propósito: escribir de memoria las 141
duraciones del Himno Nacional y darlas por buenas sería inventar datos. La app
avisa en pantalla cuando el ritmo es aproximado.

Corregir una canción es sólo editar sus `d` en `data/canciones.js`. Un test
verifica que la cantidad de duraciones coincida con la de notas.

En modo ritmo se puntúa por ventanas de tolerancia (90 / 200 / 380 ms), y el
resultado separa **qué** tocó de **cuándo** lo tocó: acierto de notas y precisión
rítmica se muestran por separado.

## Stack técnico

- HTML/CSS/JS puro (sin frameworks)
- Web Audio API para la síntesis (`audio.js`, sin librerías)
- Web Audio API para detección de pitch
- Service Worker para caché offline
- localStorage para persistencia de datos
- Web App Manifest para instalación PWA
