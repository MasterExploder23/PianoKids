// Harness de tests para PianoKids.
// Arranca index.html real en JSDOM con Web Audio y microfono stubbeados,
// y expone el scope interno de la app para poder assertear sobre él.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');

// Nombres del scope de la app que los tests necesitan tocar.
const EXPOSED = [
  'SONGS', 'SKEY', 'LESSONS_NOTES', 'LESSONS_MAJ', 'LESSONS_MEN', 'ACHS', 'LEVELS',
  'KARAOKE_SONGS', 'stars', 'combo', 'notesPlayed', 'songsCompleted', 'lessonsCompleted',
  'dayStreak', 'activeDays', 'dailyNotes', 'noteFrequency', 'songHistory',
  'STAFF_Y', 'WHITE_NOTES', 'BLACK_DEFS', 'INSTRUMENTOS', 'pressedKeys',
  'STAFF_LINES', 'STAFF_TOP', 'STAFF_BOTTOM',
  'midiSoportado', 'midiEntradas', 'ACH_MIDI',
  'MODULOS', 'modProgress', 'FASES', 'modActual', 'lecActual', 'faseActual', 'pasoActual', 'erroresEval',
  'perfiles', 'perfilActivo', 'PKEY', 'MAX_PERFILES', 'AVATARES_PERFIL', 'BACKUP_VERSION',
  'Audio2', 'MISIONES', 'misionEstado', 'HITOS', 'hitosCobrados', 'TEMAS', 'AVATARES', 'comprados', 'temaActivo', 'avatarActivo', 'COF',
];
const EXPOSED_FN = [
  'saveProgress', 'loadProgress', 'recomputeStreak', 'markActivityToday',
  'last7Days', 'pruneActivity', 'dayKeyOf', 'todayKey',
  'renderPadresProgreso', 'renderPadresStats', 'updateStatsUI',
  'ledgerLinesFor', 'updateStaff', 'releaseAllKeys', 'buildPiano', 'rebuildAll',
  'midiANota', 'midiAlRango', 'midiMensaje', 'midiIniciar', 'midiRefrescar', 'pianoActivo',
  'buildLessonGrid', 'startLesson', 'siguienteFase', 'checkLessonNote', 'finishLesson', 'exitLesson',
  'lecEstrellas', 'lecDesbloqueada', 'moduloDesbloqueado', 'estrellasPorErrores', 'lecClave',
  'migrarLeccionesViejas', 'showPadresLecc', 'buildPadresLeccTabs', 'mostrarFase',
  'misionesDeHoy', 'avanzarMision', 'renderMisiones', 'revisarHitos', 'renderHitos',
  'comprar', 'aplicar', 'estrellasDisponibles', 'estrellasGastadas', 'renderTienda', 'renderHome',
  'renderCoF', 'semillaDelDia', 'misionCumplida', 'cofNombre', 'cofAlterno', 'cofNombreCompleto',
  'iniciarPerfiles', 'crearPerfil', 'cambiarPerfil', 'borrarPerfil', 'renombrarPerfil',
  'perfilPorId', 'perfilCorriente', 'claveDe', 'claveActual', 'resetEstado', 'saveProgressAhora',
  'armarBackup', 'validarBackup', 'aplicarBackup', 'renderPerfiles', 'snapshotProgreso',
];

// Desde v1.9 los datos viven en data/*.js, cargados con <script src> antes de
// la app. Como son scripts clasicos comparten el scope global, asi que para el
// harness alcanza con concatenarlos delante.
const DATOS = ['canciones.js', 'curriculum.js', 'escenas.js'];
const MOTOR = 'audio.js'; // la sintesis, que antes era Tone.js

function boot(opts = {}) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const datosJs =
    fs.readFileSync(path.join(ROOT, MOTOR), 'utf8') + '\n' +
    DATOS.map(f => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')).join('\n');
  // El script de la app es el ultimo bloque inline. Los otros son <script src=...>,
  // que no contienen la subcadena exacta '<script>'.
  const appJs = datosJs + '\n' + html.slice(
    html.lastIndexOf('<script>') + '<script>'.length,
    html.lastIndexOf('</script>')
  );

  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://localhost/',
  });
  const w = dom.window;

  // ── stub de Web Audio ───────────────────────────────────────
  // Desde v2.0 no hay Tone.js: la sintesis es Web Audio a mano. JSDOM no
  // implementa AudioContext, asi que lo simulamos con nodos que no hacen ruido
  // pero registran las llamadas, para poder verificar que la app pide lo que
  // deberia (osciladores, envolventes, filtros).
  const noop = () => {};
  w.__audio = { osciladores: 0, buffers: 0, ganancias: 0, filtros: 0, iniciado: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: noop,
    exponentialRampToValueAtTime: noop,
    linearRampToValueAtTime: noop,
    cancelScheduledValues: noop,
  });
  // El nodo imita las reglas reales de Web Audio. En particular: llamar stop()
  // antes que start() lanza InvalidStateError. Con un stub permisivo ese error
  // pasaba desapercibido y click y madera salieron a produccion sin sonar.
  const nodo = extra =>
    Object.assign(
      {
        __arrancado: false,
        connect(d) { return d || this; },
        disconnect: noop,
        start() { this.__arrancado = true; },
        stop() {
          if (!this.__arrancado) throw new Error('InvalidStateError: stop() antes de start()');
        },
      },
      extra
    );
  w.AudioContext = w.webkitAudioContext = function () {
    return {
      state: 'running',
      currentTime: 0,
      sampleRate: 44100,
      destination: nodo(),
      resume: () => Promise.resolve(),
      createGain: () => { w.__audio.ganancias++; return nodo({ gain: param() }); },
      createOscillator: () => { w.__audio.osciladores++; return nodo({ frequency: param(), detune: param(), type: 'sine' }); },
      createBiquadFilter: () => { w.__audio.filtros++; return nodo({ frequency: param(), Q: param(), type: 'lowpass' }); },
      createBufferSource: () => { w.__audio.buffers++; return nodo({ buffer: null }); },
      createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
      createAnalyser: () => nodo({ getFloatTimeDomainData: noop, fftSize: 2048 }),
      createMediaStreamSource: () => nodo(),
    };
  };
  w.navigator.mediaDevices = { getUserMedia: () => Promise.reject(new Error('no mic en test')) };
  w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 16);
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop }));
  w.confirm = () => false;
  w.scrollTo = noop;

  // Teclado MIDI simulado. Devuelve un puerto al que los tests le pueden
  // "enchufar" mensajes crudos, igual que haría un teclado real por USB.
  let midi = null;
  if (opts.midi) {
    const puerto = {
      id: 'test-1', name: opts.midiName || 'Teclado de Prueba', type: 'input',
      state: 'connected', onmidimessage: null,
    };
    const puertos = opts.midiInputs === 0 ? [] : [puerto];
    const acceso = {
      inputs: { values: () => puertos.values() },
      outputs: { values: () => [].values() },
      onstatechange: null,
    };
    w.navigator.requestMIDIAccess = () => Promise.resolve(acceso);
    midi = {
      acceso, puerto,
      // data: [status, nota, velocity]
      enviar: data => { if (puerto.onmidimessage) puerto.onmidimessage({ data }); },
      noteOn: (nota, vel = 100) => midi.enviar([0x90, nota, vel]),
      noteOff: nota => midi.enviar([0x80, nota, 0]),
      desconectar: () => {
        puerto.state = 'disconnected'; puertos.length = 0;
        if (acceso.onstatechange) acceso.onstatechange({ port: puerto });
      },
    };
  } else if (opts.midi === false) {
    delete w.navigator.requestMIDIAccess;
  }

  // Estado previo de localStorage, si el test lo pide.
  if (opts.storage) {
    for (const [k, v] of Object.entries(opts.storage)) {
      w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  const bridge = `
;window.__app = {
  ${EXPOSED.map(n => `get ${n}(){ try{ return ${n}; }catch(e){ return undefined; } }, set ${n}(v){ try{ ${n}=v; }catch(e){} }`).join(',\n  ')},
  fn: {
    ${EXPOSED_FN.map(n => `${n}: (typeof ${n} !== 'undefined' ? ${n} : null)`).join(',\n    ')}
  }
};`;

  w.eval(appJs + bridge);

  // JSDOM en modo 'outside-only' NO ejecuta los atributos onclick="" inline,
  // y el index.html tiene 58. Sin esto los tests de click pasarían en falso.
  const wire = () => {
    w.document.querySelectorAll('[onclick]').forEach(el => {
      if (el.__wired) return;
      el.__wired = true;
      const code = el.getAttribute('onclick');
      el.addEventListener('click', function (event) {
        w.__self = this; w.__ev = event;
        try { w.eval(`(function(event){ ${code} }).call(window.__self, window.__ev)`); }
        catch (e) { throw new Error(`onclick falló ("${code.slice(0, 60)}"): ${e.message}`); }
      });
    });
  };
  wire();

  // Re-cablear automáticamente lo que la app inyecte con innerHTML.
  new w.MutationObserver(wire).observe(w.document.body, { childList: true, subtree: true });

  return { w, dom, app: w.__app, doc: w.document, wire, midi };
}

// ── mini framework de asserts ────────────────────────────────
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg || 'no coinciden'} → esperado ${sb}, recibido ${sa}`);
}
function report(suite) {
  const pass = results.filter(r => r.ok).length;
  console.log(`\n── ${suite} ──`);
  results.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : '\n       ' + r.err}`));
  console.log(`\n  ${pass}/${results.length} tests OK`);
  const failed = results.length - pass;
  results.length = 0;
  return failed;
}

// Fuente completo (index.html + data/*.js) para los tests que verifican
// estructura del codigo. `src` es el texto tal cual; `srcC` viene sin espacios,
// para que un reformateo del codigo no rompa aserciones que solo quieren saber
// si cierta construccion existe. Las que buscan texto para el usuario (frases
// en castellano) deben seguir usando `src`.
function leerFuente() {
  return fs.readFileSync(INDEX, 'utf8') +
    fs.readFileSync(path.join(ROOT, MOTOR), 'utf8') +
    DATOS.map(f => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')).join('\n');
}
const src = leerFuente();
const srcC = src.replace(/\s+/g, '');

module.exports = { boot, test, assert, eq, report, ROOT, src, srcC };
