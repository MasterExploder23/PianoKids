// ritmo.js — Motor de ritmo de PianoKids (v2.1)
// ─────────────────────────────────────────────────────────────
// Hasta v2.0 una canción era una lista de alturas: el chico tocaba la tecla que
// brillaba y la app esperaba indefinidamente. Eso enseña QUÉ tecla, nunca CUÁNDO.
// El ritmo es la mitad de la música, así que este módulo agrega la otra mitad.
//
// Dos modos, porque sirven a momentos distintos del aprendizaje:
//   libre  — la app espera; el chico va a su tiempo. Es el de v2.0, intacto.
//   ritmo  — la canción avanza sola al tempo y se mide cuándo tocás cada nota.

const Ritmo = (() => {
  // Ventanas de tolerancia en milisegundos. Son generosas a propósito: un chico
  // de 7 años no es un metrónomo, y castigar de más lo hace abandonar.
  const VENTANAS = [
    { id: 'perfecto', ms: 90, texto: '¡Perfecto!', emoji: '🎯', puntos: 3 },
    { id: 'bien', ms: 200, texto: '¡Bien!', emoji: '👍', puntos: 2 },
    { id: 'casi', ms: 380, texto: 'Casi...', emoji: '🙂', puntos: 1 },
  ];
  const FALLADA = { id: 'fuera', texto: 'Fuera de tiempo', emoji: '⏰', puntos: 0 };

  // Una negra dura 60/bpm segundos. Todo lo demás sale de ahí.
  function msPorNegra(bpm) {
    return 60000 / (bpm || 100);
  }
  // Convierte la canción en una línea de tiempo: cada nota con el milisegundo
  // exacto en que le toca sonar desde el inicio.
  function planificar(cancion, bpm) {
    const negra = msPorNegra(bpm || cancion.bpm);
    let t = 0;
    return (cancion.notas || []).map(p => {
      const ev = { n: p.n, d: p.d, t, dur: p.d * negra };
      t += p.d * negra;
      return ev;
    });
  }
  function duracionTotal(cancion, bpm) {
    const plan = planificar(cancion, bpm);
    return plan.length ? plan[plan.length - 1].t + plan[plan.length - 1].dur : 0;
  }
  // Clasifica qué tan a tiempo estuvo una nota. `desvio` en ms, con signo:
  // negativo = se adelantó, positivo = llegó tarde.
  function evaluar(desvio) {
    const abs = Math.abs(desvio);
    for (const v of VENTANAS) if (abs <= v.ms) return v;
    return FALLADA;
  }
  // Precisión rítmica del 0 al 100. Se calcula sobre el máximo posible, así que
  // es comparable entre canciones de largos distintos.
  function precision(aciertos) {
    if (!aciertos.length) return 0;
    const obtenido = aciertos.reduce((n, a) => n + a.puntos, 0);
    return Math.round((obtenido / (aciertos.length * 3)) * 100);
  }
  function estrellasPorPrecision(pct) {
    if (pct >= 85) return 3;
    if (pct >= 60) return 2;
    return 1;
  }

  // ── Reproducción ──────────────────────────────────────────
  let plan = [],
    t0 = 0,
    idx = 0,
    activo = false,
    aciertos = [],
    cb = {},
    timer = null;

  function iniciar(cancion, bpm, callbacks) {
    plan = planificar(cancion, bpm);
    idx = 0;
    aciertos = [];
    activo = true;
    cb = callbacks || {};
    t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    programar();
    return plan.length;
  }
  function ahora() {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  }
  // Avisa a la UI cuándo resaltar cada nota. La evaluación no depende de este
  // timer: se calcula contra el plan, así que un timer impreciso no afecta el
  // puntaje.
  function programar() {
    clearTimeout(timer);
    if (!activo || idx >= plan.length) return;
    const espera = Math.max(0, plan[idx].t - ahora());
    timer = setTimeout(() => {
      if (!activo) return;
      if (cb.onNota) cb.onNota(plan[idx], idx);
      idx++;
      if (idx >= plan.length) {
        // Damos margen para la última nota antes de cerrar.
        timer = setTimeout(() => terminar(), 700);
        return;
      }
      programar();
    }, espera);
  }
  // El chico tocó una nota. Buscamos a qué evento del plan corresponde:
  // la nota mas cercana en el tiempo que todavia no fue tocada.
  function tocar(nota) {
    if (!activo) return null;
    const t = ahora();
    let mejor = -1,
      mejorDist = Infinity;
    plan.forEach((ev, i) => {
      if (ev.tocada) return;
      const dist = Math.abs(ev.t - t);
      if (dist < mejorDist) {
        mejorDist = dist;
        mejor = i;
      }
    });
    if (mejor < 0) return null;
    const ev = plan[mejor];
    const correcta = ev.n === nota;
    const desvio = t - ev.t;
    const v = correcta ? evaluar(desvio) : FALLADA;
    ev.tocada = true;
    const r = { i: mejor, esperada: ev.n, tocada: nota, correcta, desvio, ...v };
    aciertos.push(r);
    if (cb.onEvaluacion) cb.onEvaluacion(r);
    return r;
  }
  function terminar() {
    if (!activo) return null;
    activo = false;
    clearTimeout(timer);
    const pct = precision(aciertos);
    const notasOk = aciertos.filter(a => a.correcta).length;
    const resumen = {
      precision: pct,
      estrellas: estrellasPorPrecision(pct),
      notasOk,
      total: plan.length,
      aciertoNotas: plan.length ? Math.round((notasOk / plan.length) * 100) : 0,
      detalle: aciertos.slice(),
    };
    if (cb.onFin) cb.onFin(resumen);
    return resumen;
  }
  function cancelar() {
    activo = false;
    clearTimeout(timer);
    plan.forEach(ev => delete ev.tocada);
  }

  return {
    VENTANAS,
    FALLADA,
    msPorNegra,
    planificar,
    duracionTotal,
    evaluar,
    precision,
    estrellasPorPrecision,
    iniciar,
    tocar,
    terminar,
    cancelar,
    get activo() {
      return activo;
    },
    get progreso() {
      return { idx, total: plan.length };
    },
  };
})();
