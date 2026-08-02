// audio.js — Motor de sonido de PianoKids
// ─────────────────────────────────────────────────────────────
// Reemplaza a Tone.js (349 kB) por Web Audio a mano (~9 kB).
// La app usaba 7 clases de Tone para 2 instrumentos y 4 sonidos de metrónomo;
// no justificaba traer una librería de síntesis completa. Además ahora no
// depende de un CDN externo, así que el modo offline no tiene punto de falla.
//
// Todo se genera matemáticamente: no hay samples ni archivos de audio.

const Audio2 = (() => {
  let ctx = null,
    master = null,
    ruidoBuf = null;
  let instrumento = 'piano';
  const sonando = new Map(); // nota -> {nodos:[], amp, fin}

  // ── Utilidades ────────────────────────────────────────────
  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  // 'C4' -> 261.63 Hz. El la central (A4, MIDI 69) es 440 Hz por definición.
  function freq(nota) {
    if (typeof nota === 'number') return nota;
    const m = /^([A-G]#?)(-?\d)$/.exec(String(nota));
    if (!m) return 440;
    const midi = SEMI[m[1]] + 12 * (+m[2] + 1);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // Tone aceptaba '8n', '16n' o segundos como string. Mantenemos la compatibilidad
  // para no tener que tocar los call sites uno por uno.
  function dur(d) {
    if (typeof d === 'number') return d;
    if (typeof d !== 'string') return 0.5;
    const figuras = { '1n': 2, '2n': 1, '4n': 0.5, '8n': 0.25, '16n': 0.125, '32n': 0.0625, '64n': 0.03 };
    if (figuras[d] !== undefined) return figuras[d];
    const n = parseFloat(d);
    return isNaN(n) ? 0.5 : n;
  }

  function crearRuido() {
    const largo = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // Ruido blanco filtrado apenas para que no suene tan áspero.
    let ultimo = 0;
    for (let i = 0; i < largo; i++) {
      const blanco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      d[i] = blanco * 0.6 + ultimo * 3;
    }
    return buf;
  }

  // ── Arranque ──────────────────────────────────────────────
  // Los navegadores exigen un gesto del usuario antes de dejar sonar audio.
  // Se llama en cada interacción; si ya está listo no hace nada.
  function iniciar() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return Promise.resolve(false);
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        ruidoBuf = crearRuido();
      }
      if (ctx.state === 'suspended') return ctx.resume().then(() => true).catch(() => false);
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // ── Voces de instrumento ──────────────────────────────────
  // Piano: síntesis FM. Un modulador desafina la portadora al principio, lo que
  // da el "golpe" del martillo, y después la nota decae sola aunque mantengas la
  // tecla, como un piano real.
  function vozPiano(f, vel, t0) {
    const port = ctx.createOscillator();
    port.type = 'triangle';
    port.frequency.value = f;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = f * 2.5;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(f * 4.5, t0);
    modGain.gain.exponentialRampToValueAtTime(Math.max(f * 0.01, 0.01), t0 + 0.32);
    mod.connect(modGain).connect(port.frequency);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(0.42 * vel, t0 + 0.004);
    // Cae solo: sustain casi nulo. Es lo que distingue un piano de un órgano.
    amp.gain.exponentialRampToValueAtTime(0.035 * vel, t0 + 1.6);
    port.connect(amp).connect(master);

    port.start(t0);
    mod.start(t0);
    return { nodos: [port, mod], amp, release: 1.1 };
  }

  // Órgano: síntesis aditiva. Varios armónicos fijos que se sostienen mientras
  // mantenés la tecla y cortan casi seco al soltar.
  const ARMONICOS = [
    [1, 1.0],
    [2, 0.55],
    [3, 0.32],
    [4, 0.18],
    [6, 0.1],
  ];
  function vozOrgano(f, vel, t0) {
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(0.3 * vel, t0 + 0.025);
    amp.connect(master);

    const nodos = ARMONICOS.map(([mult, nivel]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.value = nivel;
      o.connect(g).connect(amp);
      o.start(t0);
      return o;
    });
    return { nodos, amp, release: 0.12 };
  }

  const VOCES = { piano: vozPiano, organ: vozOrgano };
  function setInstrumento(id) {
    instrumento = VOCES[id] ? id : 'piano';
  }
  function instrumentoActual() {
    return instrumento;
  }

  // ── Notas ─────────────────────────────────────────────────
  function notaOn(nota, vel) {
    if (!ctx) return;
    if (sonando.has(nota)) notaOff(nota, true);
    const v = typeof vel === 'number' && vel > 0 ? Math.max(0.15, Math.min(1, vel)) : 0.8;
    const t0 = ctx.currentTime;
    const voz = (VOCES[instrumento] || vozPiano)(freq(nota), v, t0);
    sonando.set(nota, voz);
  }
  function notaOff(nota, inmediato) {
    const voz = sonando.get(nota);
    if (!voz || !ctx) return;
    sonando.delete(nota);
    const t = ctx.currentTime;
    const r = inmediato ? 0.01 : voz.release;
    try {
      voz.amp.gain.cancelScheduledValues(t);
      voz.amp.gain.setValueAtTime(Math.max(voz.amp.gain.value, 0.0001), t);
      voz.amp.gain.exponentialRampToValueAtTime(0.0001, t + r);
    } catch (e) {}
    voz.nodos.forEach(n => {
      try {
        n.stop(t + r + 0.02);
      } catch (e) {}
    });
  }
  function soltarTodo() {
    [...sonando.keys()].forEach(n => notaOff(n, true));
  }
  // Equivalente a triggerAttackRelease: suena y se apaga sola. Acepta un acorde.
  function nota(n, d, vel) {
    if (!ctx) return;
    const notas = Array.isArray(n) ? n : [n];
    const segs = dur(d);
    notas.forEach(x => {
      notaOn(x, vel);
      setTimeout(() => notaOff(x), Math.max(40, segs * 1000));
    });
  }

  // ── Metrónomo ─────────────────────────────────────────────
  // Cada sonido usa un mecanismo distinto, no sólo otra frecuencia: por eso
  // ahora campana y beep sí se distinguen.
  function metronomo(tipo, fuerte) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const vol = fuerte ? 1 : 0.45;

    if (tipo === 'click' || tipo === 'wood') {
      const src = ctx.createBufferSource();
      src.buffer = ruidoBuf;
      const filtro = ctx.createBiquadFilter();
      const g = ctx.createGain();
      let fin;
      if (tipo === 'click') {
        filtro.type = 'highpass';
        filtro.frequency.value = 2500;
        g.gain.setValueAtTime(0.5 * vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
        fin = t0 + 0.05;
      } else {
        filtro.type = 'bandpass';
        filtro.frequency.value = 820;
        filtro.Q.value = 3.5;
        g.gain.setValueAtTime(0.9 * vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
        fin = t0 + 0.1;
      }
      src.connect(filtro).connect(g).connect(master);
      // OJO: start() SIEMPRE antes que stop(). Al revés, Web Audio lanza
      // InvalidStateError y el sonido no se escucha. Fue el bug de click y madera.
      src.start(t0);
      src.stop(fin);
      return;
    }

    if (tipo === 'bell') {
      // FM inarmónica con cola larga: eso es lo que suena a metal.
      const f = fuerte ? 1046.5 : 783.99;
      const port = ctx.createOscillator();
      port.type = 'sine';
      port.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = f * 3.4;
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(f * 12, t0);
      modGain.gain.exponentialRampToValueAtTime(f * 0.05, t0 + 0.35);
      mod.connect(modGain).connect(port.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.32 * vol, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
      port.connect(g).connect(master);
      port.start(t0);
      mod.start(t0);
      port.stop(t0 + 1.5);
      mod.stop(t0 + 1.5);
      return;
    }

    // beep: cuadrada corta, altura definida
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = fuerte ? 1000 : 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22 * vol, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.1);
  }

  return {
    iniciar,
    setInstrumento,
    instrumentoActual,
    notaOn,
    notaOff,
    soltarTodo,
    nota,
    metronomo,
    freq,
    dur,
    get listo() {
      return !!ctx;
    },
    get notasSonando() {
      return sonando.size;
    },
  };
})();
