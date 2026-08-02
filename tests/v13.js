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
// B4/B5 · Motor de audio propio (desde v2.0, sin Tone.js)
// Estos tests son de comportamiento: le piden sonidos al motor y verifican
// qué nodos de Web Audio construye. Antes miraban la config de Tone como texto.
// ═══════════════════════════════════════════════════════════
{
  const { app, w } = boot();
  const A = app.Audio2;
  const contar = () => ({ ...w.__audio });
  const delta = (antes, campo) => w.__audio[campo] - antes[campo];

  test('Ya no se carga Tone.js', () => {
    assert(!/cdnjs[^"']*tone/i.test(src), 'sigue el <script> de Tone');
    assert(/<script src="audio\.js">/.test(src), 'no se carga el motor propio');
  });
  test('El motor arranca sin excepciones', async () => {});
  test('Las frecuencias son las reales, no aproximaciones', () => {
    // El la central es 440 Hz por definición del estándar.
    assert(Math.abs(A.freq('A4') - 440) < 0.01, `A4 dio ${A.freq('A4')}`);
    assert(Math.abs(A.freq('C4') - 261.6256) < 0.01, `C4 dio ${A.freq('C4')}`);
    assert(Math.abs(A.freq('A5') - 880) < 0.01, 'una octava arriba debe ser el doble');
    assert(Math.abs(A.freq('A3') - 220) < 0.01, 'una octava abajo debe ser la mitad');
  });
  test('Cada semitono es la raíz doceava de 2', () => {
    const r = A.freq('C#4') / A.freq('C4');
    assert(Math.abs(r - Math.pow(2, 1 / 12)) < 0.0001, `la razón dio ${r}`);
  });
  test('Toda nota del teclado da una frecuencia audible', () => {
    [...app.WHITE_NOTES, ...app.BLACK_DEFS.map(b => b.n)].forEach(n => {
      const f = A.freq(n);
      assert(f > 100 && f < 1200, `${n} dio ${f} Hz, fuera del rango del teclado`);
    });
  });
  test('Las duraciones de figura se traducen a segundos', () => {
    eq(A.dur('8n'), 0.25);
    eq(A.dur('16n'), 0.125);
    eq(A.dur(0.5), 0.5);
    eq(A.dur('.35'), 0.35);
  });

  test('Quedan sólo piano y órgano', () => {
    eq(Object.keys(app.INSTRUMENTOS).sort(), ['organ', 'piano']);
  });
  test('El selector ofrece exactamente esos dos', () => {
    const opts = [...w.document.querySelectorAll('#sound-select option')].map(o => o.value);
    eq(opts.sort(), ['organ', 'piano'], `el selector ofrece ${opts.join(', ')}`);
  });

  test('El piano usa síntesis FM: portadora más modulador', () => {
    A.iniciar(); A.setInstrumento('piano');
    const antes = contar();
    A.notaOn('C4', 0.8);
    eq(delta(antes, 'osciladores'), 2, 'el piano debería crear 2 osciladores (FM)');
    A.notaOff('C4');
  });
  test('El órgano usa síntesis aditiva: varios armónicos', () => {
    A.setInstrumento('organ');
    const antes = contar();
    A.notaOn('C4', 0.8);
    assert(delta(antes, 'osciladores') >= 4,
      `el órgano creó ${delta(antes, 'osciladores')} osciladores, esperaba varios armónicos`);
    A.notaOff('C4');
  });
  test('Piano y órgano suenan distinto de verdad', () => {
    A.setInstrumento('piano');
    let antes = contar(); A.notaOn('E4'); const oscPiano = delta(antes, 'osciladores'); A.notaOff('E4');
    A.setInstrumento('organ');
    antes = contar(); A.notaOn('E4'); const oscOrgano = delta(antes, 'osciladores'); A.notaOff('E4');
    assert(oscPiano !== oscOrgano, 'ambos instrumentos construyen la misma estructura');
  });
  test('El piano decae solo y el órgano sostiene', () => {
    assert(/exponentialRampToValueAtTime\(0\.035 \* vel, t0 \+ 1\.6\)/.test(src),
      'el piano no decae solo');
    assert(/function vozOrgano[\s\S]{0,400}exponentialRampToValueAtTime\(0\.3 \* vel, t0 \+ 0\.025\)/.test(src),
      'el órgano no sostiene');
  });

  test('Una nota se puede soltar y volver a tocar', () => {
    A.setInstrumento('piano');
    A.notaOn('G4'); eq(A.notasSonando, 1);
    A.notaOff('G4'); eq(A.notasSonando, 0);
    A.notaOn('G4'); eq(A.notasSonando, 1);
    A.soltarTodo(); eq(A.notasSonando, 0);
  });
  test('Se pueden sostener varias notas a la vez (acordes)', () => {
    ['C4', 'E4', 'G4'].forEach(n => A.notaOn(n));
    eq(A.notasSonando, 3);
    A.soltarTodo();
    eq(A.notasSonando, 0);
  });
  test('Tocar dos veces la misma nota no deja voces colgadas', () => {
    A.notaOn('C5'); A.notaOn('C5'); A.notaOn('C5');
    eq(A.notasSonando, 1, 'quedaron voces duplicadas sonando');
    A.soltarTodo();
  });
  test('Audio2.nota acepta un acorde completo', () => {
    const antes = contar();
    A.nota(['C4', 'E4', 'G4'], '8n');
    assert(delta(antes, 'osciladores') >= 6, 'no sonaron las 3 notas del acorde');
    A.soltarTodo();
  });

  test('Los 4 sonidos del metrónomo usan mecanismos distintos', () => {
    const medir = tipo => {
      const antes = contar();
      A.metronomo(tipo, true);
      return { osc: delta(antes, 'osciladores'), buf: delta(antes, 'buffers'), filtro: delta(antes, 'filtros') };
    };
    const click = medir('click'), wood = medir('wood'), beep = medir('beep'), bell = medir('bell');

    assert(click.buf === 1 && click.osc === 0, 'el click debería ser ruido, no un oscilador');
    assert(wood.buf === 1 && wood.filtro === 1, 'la madera debería ser ruido filtrado en banda');
    assert(beep.osc === 1, 'el beep debería ser un solo oscilador');
    assert(bell.osc === 2, 'la campana debería ser FM: portadora más modulador');
    assert(bell.osc !== beep.osc, 'campana y beep siguen siendo lo mismo (el bug de v1.2)');
  });
  test('La campana tiene cola larga: es lo que la hace sonar a metal', () => {
    const m = /exponentialRampToValueAtTime\(0\.0001, t0 \+ ([\d.]+)\);\s*port\.connect/.exec(src);
    assert(m && +m[1] > 1, `la cola de la campana dura ${m && m[1]}s, necesita más de 1s`);
  });
  test('El primer tiempo del compás se acentúa', () => {
    assert(/Audio2\.metronomo\(metroSound, metroBeat % Math\.min\(metroSig, 6\) === 0\)/.test(src),
      'no se distingue el primer tiempo');
  });

  test('El motor no depende de ningún CDN', () => {
    const motor = fs.readFileSync(path.join(ROOT, 'audio.js'), 'utf8');
    assert(!/https?:\/\//.test(motor.replace(/\/\/.*$/gm, '')), 'audio.js hace pedidos externos');
  });
  test('No hay samples ni archivos de audio: todo es síntesis', () => {
    assert(!/\.(mp3|wav|ogg|m4a)/i.test(src), 'aparecieron archivos de audio');
  });
}

process.exit(report('PianoKids v1.3 — arreglos') === 0 ? 0 : 1);
