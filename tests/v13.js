// Suite de los arreglos de v1.3.
// Uso:  node tests/v13.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT, src, srcC } = require('./harness');


// ═══════════════════════════════════════════════════════════
// B1 · Pentagrama: posiciones correctas en clave de sol
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  const Y = app.STAFF_Y;

  // Referencia independiente: líneas en 98,86,74,62,50 = E4,G4,B4,D5,F5.
  // Un escalón diatónico son 6px. Calculado desde cero, no copiado del código.
  const ORDEN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const esperado = (nota, oct) => 98 - 6 * ((oct - 4) * 7 + ORDEN.indexOf(nota) - ORDEN.indexOf('E'));

  test('Cada nota natural cae en su posición teórica', () => {
    for (const oct of [3, 4, 5, 6]) {
      for (const n of ORDEN) {
        const k = `${n}${oct}`;
        if (Y[k] === undefined) continue;
        eq(Y[k], esperado(n, oct), `${k} mal ubicada`);
      }
    }
  });

  test('La octava 3 ya no colisiona con C4-E4 (el bug de v1.2)', () => {
    assert(Y['G3'] !== Y['C4'], 'G3 sigue pisando a C4');
    assert(Y['A3'] !== Y['D4'], 'A3 sigue pisando a D4');
    assert(Y['B3'] !== Y['E4'], 'B3 sigue pisando a E4');
  });

  test('Ninguna posición está repetida entre notas naturales distintas', () => {
    const nat = Object.entries(Y).filter(([k]) => !k.includes('#'));
    const vistos = new Map();
    nat.forEach(([k, v]) => {
      if (vistos.has(v)) throw new Error(`${k} y ${vistos.get(v)} comparten y=${v}`);
      vistos.set(v, k);
    });
  });

  test('Toda tecla del piano tiene posición en el pentagrama', () => {
    app.WHITE_NOTES.forEach(n => assert(Y[n] !== undefined, `falta ${n} (tecla blanca)`));
    app.BLACK_DEFS.forEach(({ n }) => assert(Y[n] !== undefined, `falta ${n} (tecla negra)`));
  });

  test('Cada sostenido comparte altura con su natural', () => {
    Object.keys(Y).filter(k => k.includes('#')).forEach(k => {
      const nat = k.replace('#', '');
      eq(Y[k], Y[nat], `${k} debería estar a la altura de ${nat}`);
    });
  });

  test('El viewBox del SVG abarca todas las notas', () => {
    const m = src.match(/viewBox="0 0 520 (\d+)"/);
    assert(m, 'no se encontró el viewBox del pentagrama');
    const alto = +m[1];
    const maxY = Math.max(...Object.values(Y));
    assert(alto >= maxY + 9, `viewBox alto ${alto} recorta la nota más grave (y=${maxY} + radio 9)`);
  });

  test('Las líneas adicionales se calculan, ya no están hardcodeadas', () => {
    assert(!/note==='C4'\|\|note==='B3'/.test(srcC), 'sigue el caso especial C4/B3');
    assert(typeof app.fn.ledgerLinesFor === 'function', 'falta ledgerLinesFor');
  });

  test('ledgerLinesFor devuelve las líneas correctas', () => {
    eq(app.fn.ledgerLinesFor(Y['G4']), [], 'una nota dentro del pentagrama no lleva líneas');
    eq(app.fn.ledgerLinesFor(Y['D4']), [], 'D4 está en el espacio bajo el pentagrama');
    eq(app.fn.ledgerLinesFor(Y['C4']), [110], 'do central lleva una sola');
    eq(app.fn.ledgerLinesFor(Y['A3']), [110, 122], 'A3 lleva dos');
    eq(app.fn.ledgerLinesFor(Y['C3']), [110, 122, 134, 146], 'C3 lleva cuatro');
    eq(app.fn.ledgerLinesFor(Y['A5']), [38], 'A5 lleva una arriba');
    eq(app.fn.ledgerLinesFor(Y['C6']), [38, 26], 'C6 lleva dos arriba');
  });

  // Ojo: la plica de la nota también es un <line>, así que filtramos por las
  // horizontales (y1 === y2), que son las líneas adicionales.
  const ledgersDibujadas = g => [...g.querySelectorAll('line')]
    .filter(l => l.getAttribute('y1') === l.getAttribute('y2'))
    .map(l => +l.getAttribute('y1'));

  test('Dibujar C3 produce la nota con sus 4 líneas adicionales', () => {
    app.fn.updateStaff('C3');
    const g = doc.getElementById('staff-current');
    eq(ledgersDibujadas(g), [110, 122, 134, 146], 'líneas adicionales de C3 mal dibujadas');
    const nota = g.querySelector('ellipse');
    assert(nota, 'no se dibujó la cabeza de la nota');
    eq(+nota.getAttribute('cy'), 152, 'C3 está en la altura equivocada');
  });

  test('Una nota dentro del pentagrama no dibuja líneas adicionales', () => {
    app.fn.updateStaff('G4');
    eq(ledgersDibujadas(doc.getElementById('staff-current')), []);
  });

  test('C6 dibuja sus 2 líneas adicionales por arriba', () => {
    app.fn.updateStaff('C6');
    eq(ledgersDibujadas(doc.getElementById('staff-current')), [38, 26]);
  });

  test('Las teclas negras graves ahora sí se dibujan', () => {
    ['C#3', 'D#3', 'F#3', 'G#3', 'A#3'].forEach(n => {
      app.fn.updateStaff(n);
      const g = doc.getElementById('staff-current');
      assert(g.querySelector('ellipse'), `${n} no dibuja nada en el pentagrama`);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// B2 · Teclas trabadas
// ═══════════════════════════════════════════════════════════
{
  const evento = (el, tipo, extra = {}) => {
    const w = el.ownerDocument.defaultView;
    const ev = new w.Event(tipo, { bubbles: true, cancelable: true });
    Object.assign(ev, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 }, extra);
    el.dispatchEvent(ev);
  };

  test('pointercancel suelta la tecla (el caso del scroll en el celu)', () => {
    const { app, doc } = boot();
    const k = doc.querySelector('#piano-libre .wk');
    evento(k, 'pointerdown');
    assert(app.pressedKeys.size === 1, 'la nota no se registró');
    evento(k, 'pointercancel');
    eq(app.pressedKeys.size, 0, 'pointercancel no soltó la nota');
    assert(!k.classList.contains('pressed'), 'la tecla quedó pintada');
  });

  test('Una nota soltada se puede volver a tocar', () => {
    const { app, doc } = boot();
    const k = doc.querySelector('#piano-libre .wk');
    evento(k, 'pointerdown'); evento(k, 'pointercancel');
    evento(k, 'pointerdown');
    eq(app.notesPlayed, 2, 'la segunda pulsación se perdió: la tecla quedó trabada');
  });

  test('Arrastrar sobre una tecla suelta la nota en vez de trabarla', () => {
    const { app, doc } = boot();
    const k = doc.querySelector('#piano-libre .wk');
    evento(k, 'pointerdown', { clientX: 100 });
    evento(k, 'pointermove', { clientX: 140 });
    eq(app.pressedKeys.size, 0, 'al correr el teclado la nota quedó apretada');
  });

  test('releaseAllKeys limpia todo lo que haya quedado sonando', () => {
    const { app, doc } = boot();
    doc.querySelectorAll('#piano-libre .wk').forEach((k, i) => { if (i < 4) evento(k, 'pointerdown'); });
    assert(app.pressedKeys.size > 0);
    app.fn.releaseAllKeys();
    eq(app.pressedKeys.size, 0);
    eq(doc.querySelectorAll('.wk.pressed,.bk.pressed').length, 0, 'quedaron teclas pintadas');
  });

  test('Reconstruir el teclado suelta las notas antes de destruir el DOM', () => {
    const { app, doc } = boot();
    evento(doc.querySelector('#piano-libre .wk'), 'pointerdown');
    assert(app.pressedKeys.size === 1);
    app.fn.rebuildAll();
    eq(app.pressedKeys.size, 0, 'rebuildAll dejó notas colgadas sonando para siempre');
  });

  test('Hay red de seguridad global (pointerup fuera, blur, pestaña oculta)', () => {
    assert(/window\.addEventListener\('pointerup'/.test(srcC), 'falta el pointerup global');
    assert(/window\.addEventListener\('blur',releaseAllKeys\)/.test(srcC), 'falta el blur');
    assert(/visibilitychange/.test(srcC) && /releaseAllKeys/.test(srcC), 'falta visibilitychange');
  });
}

// ═══════════════════════════════════════════════════════════
// B3 · Arrastre del teclado
// ═══════════════════════════════════════════════════════════
{
  test('El touchstart de las teclas ya no bloquea el scroll nativo', () => {
    assert(!/touchstart',ev=>\{ev\.preventDefault\(\);pianoPlay/.test(srcC),
      'sigue el preventDefault que impedía correr el teclado con el dedo');
  });
  test('El contenedor declara touch-action:pan-x', () => {
    assert(/\.piano-wrapper\{[^}]*touch-action:pan-x/.test(srcC),
      'sin touch-action:pan-x el navegador no hace el paneo horizontal');
  });
  test('Existe arrastre con mouse para la compu', () => {
    assert(/functionwireDragScroll/.test(srcC), 'falta wireDragScroll');
    assert(/scrollLeft=scroll0-d/.test(srcC), 'el arrastre no mueve el scroll');
  });
  test('Las teclas usan Pointer Events, no mouse/touch por separado', () => {
    assert(/pointerdown/.test(srcC) && /pointercancel/.test(srcC));
    assert(!/k\.addEventListener\('mousedown'/.test(srcC), 'quedaron handlers de mouse viejos');
  });
}

// ═══════════════════════════════════════════════════════════
// B4 · Sonidos del metrónomo diferenciados
// ═══════════════════════════════════════════════════════════
{
  test('Cada sonido del metrónomo tiene su propia voz', () => {
    assert(/metroVoices/.test(srcC), 'no hay voces separadas');
    ['click:', 'wood:', 'beep:', 'bell:'].forEach(k =>
      assert(new RegExp(k).test(srcC), `falta la voz ${k}`));
  });
  test('Campana y beep usan tipos de síntesis distintos', () => {
    const bell = /bell:newTone\.(\w+)/.exec(srcC);
    const beep = /beep:newTone\.(\w+)/.exec(srcC);
    assert(bell && beep, 'no se encontraron las definiciones de bell/beep');
    assert(bell[1] !== beep[1], `campana y beep siguen usando el mismo ${bell[1]}`);
  });
  test('Los 4 sonidos usan al menos 3 tipos de síntesis distintos', () => {
    const tipos = ['click', 'wood', 'beep', 'bell']
      .map(k => (new RegExp(k + ':newTone\\.(\\w+)').exec(srcC) || [])[1]);
    assert(tipos.every(Boolean), `falta definir alguno: ${tipos.join(', ')}`);
    assert(new Set(tipos).size >= 3, `sólo ${new Set(tipos).size} timbres distintos: ${tipos.join(', ')}`);
  });
  test('La campana tiene cola larga (es lo que la hace sonar a campana)', () => {
    const i = srcC.indexOf('bell:newTone');
    const bloque = srcC.slice(i, i + 400);
    const decay = /envelope:\{attack:[\d.]+,decay:([\d.]+)/.exec(bloque);
    assert(decay && +decay[1] > 1, `decay de la campana ${decay && decay[1]}, necesita ser >1s`);
  });
  test('Ya no comparten un único Synth sine', () => {
    assert(!/functiongetMetroSynth\(\)\{if\(!metroSynth\)metroSynth=newTone\.Synth/.test(srcC));
  });
}

// ═══════════════════════════════════════════════════════════
// B5 · Timbres de instrumento
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const I = app.INSTRUMENTOS;

  test('Están los 5 instrumentos del selector', () => {
    eq(Object.keys(I).sort(), ['bass', 'bells', 'organ', 'piano', 'synth']);
  });
  test('No todos usan el mismo tipo de síntesis', () => {
    const voces = new Set(Object.values(I).map(v => v.voz));
    assert(voces.size >= 3, `sólo ${voces.size} tipos de voz para 5 instrumentos`);
  });
  test('Órgano y campanas ya no son ambos una onda sine simple', () => {
    assert(I.organ.voz !== I.bells.voz || I.organ.opts.oscillator.type !== I.bells.opts.oscillator.type,
      'órgano y campanas siguen siendo indistinguibles');
  });
  test('El piano se apaga solo aunque mantengas la tecla', () => {
    assert(I.piano.opts.envelope.sustain < 0.15,
      `sustain ${I.piano.opts.envelope.sustain}: un piano real no sostiene indefinidamente`);
    assert(I.piano.opts.envelope.decay > 0.8, 'el decaimiento del piano es demasiado corto');
  });
  test('El órgano sí sostiene mientras apretás', () => {
    eq(I.organ.opts.envelope.sustain, 1, 'un órgano mantiene el nivel');
  });
  test('Las campanas tienen la cola más larga de todos', () => {
    const colas = Object.entries(I).map(([k, v]) => [k, v.opts.envelope.decay]);
    const max = colas.sort((a, b) => b[1] - a[1])[0];
    eq(max[0], 'bells', `la cola más larga la tiene ${max[0]}, no las campanas`);
  });
  test('El bajo tiene filtro pasabajos', () => {
    assert(I.bass.opts.filter && I.bass.opts.filter.type === 'lowpass');
    assert(I.bass.opts.filterEnvelope, 'sin envolvente de filtro no suena a bajo');
  });
  test('buildSynth tiene fallback si la voz no existe en esta versión de Tone', () => {
    assert(/catch\(e\)\{[\s\S]{0,200}newTone\.PolySynth\(Tone\.Synth/.test(srcC),
      'si falla la voz la app se queda muda');
  });
}

process.exit(report('PianoKids v1.3 — arreglos') === 0 ? 0 : 1);
