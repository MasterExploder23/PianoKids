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
├── tests/
│   ├── harness.js  ← Arranca la app en JSDOM con audio stubbeado
│   ├── run.js      ← Suite de regresión (36 tests)
│   └── smoke.js    ← Smoke funcional simulando uso real (32 tests)
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

## Deploy — IMPORTANTE

Antes de cada push a producción:

1. `npm test` (tiene que dar 68/68)
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

- 🎹 Teclado de 2 octavas con sonidos reales
- 📚 Lecciones de notas y acordes con dedos
- 🎵 15+ canciones (folklore, Disney, clásicas, navidad, pop)
- 🎼 Pentagrama en tiempo real
- 🥁 Metrónomo con péndulo animado
- 🎮 7 mini juegos (incluye karaoke, dictado melódico y memoria musical)
- 🎙️ Detección de notas por micrófono
- 💾 Progreso guardado automáticamente (localStorage)
- 🔥 Racha diaria real, calculada sobre días de calendario
- 👨‍👩‍👧 Panel de padres con progreso, actividad semanal y notas más tocadas
- 📲 Instalable como app (PWA)
- 🌐 Funciona sin internet una vez cacheado

## Stack técnico

- HTML/CSS/JS puro (sin frameworks)
- Tone.js para síntesis de audio
- Web Audio API para detección de pitch
- Service Worker para caché offline
- localStorage para persistencia de datos
- Web App Manifest para instalación PWA
