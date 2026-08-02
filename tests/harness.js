// Harness de tests para PianoKids.
// Arranca index.html real en JSDOM con Tone.js / Web Audio / micrófono stubbeados,
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
];

function boot(opts = {}) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const appJs = html.slice(
    html.indexOf('<script>', html.indexOf('Tone.js')) + '<script>'.length,
    html.lastIndexOf('</script>')
  );

  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://localhost/',
  });
  const w = dom.window;

  // ── stubs de audio ──────────────────────────────────────────
  const noop = () => {};
  const chain = {
    toDestination() { return this; }, connect() { return this; },
    triggerAttackRelease: noop, triggerAttack: noop, triggerRelease: noop,
    releaseAll: noop, set: noop, dispose: noop, volume: { value: 0 },
  };
  const Voz = function () { return chain; };
  w.Tone = {
    // Todas las voces que usa la app. Si falta alguna, buildSynth cae al
    // fallback y los tests dejarían de probar lo que creen probar.
    PolySynth: Voz, Synth: Voz, Volume: Voz, NoiseSynth: Voz, FMSynth: Voz,
    AMSynth: Voz, MonoSynth: Voz, Filter: Voz,
    start: () => Promise.resolve(),
    now: () => 0, context: { state: 'running', resume: () => Promise.resolve() },
    Destination: chain, getDestination: () => chain,
  };
  w.AudioContext = w.webkitAudioContext = function () {
    return {
      createAnalyser: () => ({ connect: noop, getFloatTimeDomainData: noop, fftSize: 2048 }),
      createMediaStreamSource: () => ({ connect: noop }),
      resume: () => Promise.resolve(), state: 'running',
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

module.exports = { boot, test, assert, eq, report, ROOT };
