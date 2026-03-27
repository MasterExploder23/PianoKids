# 🎹 PianoKids — App para aprender piano

## Archivos del proyecto

```
pianokids/
├── index.html      ← App principal (todo en un archivo)
├── manifest.json   ← Configuración PWA
├── sw.js           ← Service Worker (offline + caché)
├── icon-192.png    ← Ícono app (necesitás generarlo)
├── icon-512.png    ← Ícono app grande (necesitás generarlo)
└── README.md       ← Este archivo
```

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

## Ícono de la app

Necesitás crear dos imágenes PNG:
- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px

Podés usar cualquier editor de imágenes o generarlos en:
- https://realfavicongenerator.net
- https://maskable.app

## Funciones

- 🎹 Teclado de 2 octavas con sonidos reales
- 📚 Lecciones de notas y acordes con dedos
- 🎵 15+ canciones (folklore, Disney, clásicas, navidad, pop)
- 🎼 Pentagrama en tiempo real
- 🥁 Metrónomo con péndulo animado
- 🎮 4 mini juegos
- 🎙️ Detección de notas por micrófono
- 💾 Progreso guardado automáticamente (localStorage)
- 📲 Instalable como app (PWA)
- 🌐 Funciona sin internet una vez cacheado

## Stack técnico

- HTML/CSS/JS puro (sin frameworks)
- Tone.js para síntesis de audio
- Web Audio API para detección de pitch
- Service Worker para caché offline
- localStorage para persistencia de datos
- Web App Manifest para instalación PWA
