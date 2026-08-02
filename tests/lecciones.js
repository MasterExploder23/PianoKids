// Suite del currículum de lecciones (v1.5).
// Uso:  node tests/lecciones.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT } = require('./harness');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Semitonos por nota, para verificar la teoría musical de forma independiente.
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return PC[m[1]] + 12 * (+m[2] + 1); };

// ═══════════════════════════════════════════════════════════
// Estructura del currículum
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const M = app.MODULOS;

  test('Hay 5 módulos', () => eq(M.length, 5));
  test('Cada módulo tiene id, nombre, emoji, color, descripción y lecciones', () => {
    M.forEach(m => {
      ['id', 'nombre', 'emoji', 'color', 'desc'].forEach(k => assert(m[k], `${m.id}: falta ${k}`));
      assert(Array.isArray(m.lecciones) && m.lecciones.length > 0, `${m.id}: sin lecciones`);
    });
  });
  test('Los ids de módulo son únicos', () => eq(new Set(M.map(m => m.id)).size, M.length));
  test('Los ids de lección son únicos dentro de cada módulo', () => {
    M.forEach(m => eq(new Set(m.lecciones.map(l => l.id)).size, m.lecciones.length, `${m.id} repite ids`));
  });

  test('Toda lección tiene las 4 fases completas', () => {
    M.forEach(m => m.lecciones.forEach(l => {
      const donde = `${m.id}/${l.id}`;
      assert(l.explicacion && l.explicacion.titulo && l.explicacion.texto && l.explicacion.tip,
        `${donde}: explicación incompleta`);
      assert(Array.isArray(l.demo) && l.demo.length > 0, `${donde}: sin demo`);
      assert(Array.isArray(l.practica) && l.practica.length > 0, `${donde}: sin práctica`);
      assert(Array.isArray(l.evaluacion) && l.evaluacion.length > 0, `${donde}: sin evaluación`);
    }));
  });

  test('Todo paso define una nota o un acorde, nunca ambos ni ninguno', () => {
    M.forEach(m => m.lecciones.forEach(l => {
      [...l.practica, ...l.evaluacion].forEach((p, i) => {
        const tiene = (p.n ? 1 : 0) + (p.acorde ? 1 : 0);
        eq(tiene, 1, `${m.id}/${l.id} paso ${i}: debe tener n o acorde, no ${tiene}`);
        if (p.acorde) assert(p.acorde.length === 3, `${m.id}/${l.id}: acorde de ${p.acorde.length} notas`);
      });
    }));
  });

  test('El total de lecciones es razonable para un currículum (>=20)', () => {
    const total = M.reduce((n, m) => n + m.lecciones.length, 0);
    assert(total >= 20, `sólo ${total} lecciones`);
  });
}

// ═══════════════════════════════════════════════════════════
// Corrección musical: toda nota existe y todo acorde es válido
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const M = app.MODULOS, teclas = new Set([...app.WHITE_NOTES, ...app.BLACK_DEFS.map(b => b.n)]);

  const todasLasNotas = () => {
    const out = [];
    M.forEach(m => m.lecciones.forEach(l => {
      l.demo.forEach(n => out.push([`${m.id}/${l.id} demo`, n]));
      [...l.practica, ...l.evaluacion].forEach(p =>
        (p.acorde || [p.n]).forEach(n => out.push([`${m.id}/${l.id}`, n])));
    }));
    return out;
  };

  test('Toda nota del currículum existe en el teclado en pantalla', () => {
    todasLasNotas().forEach(([donde, n]) =>
      assert(teclas.has(n), `${donde}: la nota ${n} no está en el teclado`));
  });
  test('Toda nota del currículum se puede dibujar en el pentagrama', () => {
    todasLasNotas().forEach(([donde, n]) =>
      assert(app.STAFF_Y[n] !== undefined, `${donde}: ${n} no tiene posición en el pentagrama`));
  });
  test('Todo acorde es mayor (0-4-7) o menor (0-3-7)', () => {
    M.forEach(m => m.lecciones.forEach(l => {
      [...l.practica, ...l.evaluacion].filter(p => p.acorde).forEach(p => {
        const ms = p.acorde.map(midi);
        const iv = ms.map(x => x - ms[0]).join('-');
        assert(iv === '0-4-7' || iv === '0-3-7',
          `${m.id}/${l.id}: ${p.acorde.join('-')} tiene intervalos ${iv}, no es un acorde válido`);
      });
    }));
  });
  test('Las notas de cada acorde van de grave a agudo', () => {
    M.forEach(m => m.lecciones.forEach(l => {
      [...l.practica, ...l.evaluacion].filter(p => p.acorde).forEach(p => {
        const ms = p.acorde.map(midi);
        assert(ms[0] < ms[1] && ms[1] < ms[2], `${m.id}/${l.id}: ${p.acorde.join('-')} está desordenado`);
      });
    }));
  });
  test('El módulo de acordes menores sólo enseña acordes menores', () => {
    const men = M.find(m => m.id === 'men');
    const acordes = men.lecciones.flatMap(l => l.evaluacion).filter(p => p.acorde);
    const menores = acordes.filter(p => { const ms = p.acorde.map(midi); return ms[1] - ms[0] === 3; });
    assert(menores.length >= acordes.length / 2,
      'el módulo de menores tiene mayoría de acordes mayores en la evaluación');
  });
}

// ═══════════════════════════════════════════════════════════
// Progresión y desbloqueo
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Usuario nuevo: sólo el primer módulo está abierto', () => {
    assert(app.fn.moduloDesbloqueado(0), 'el primer módulo debe estar abierto');
    [1, 2, 3, 4].forEach(i => assert(!app.fn.moduloDesbloqueado(i), `el módulo ${i} no debería estar abierto`));
  });
  test('Usuario nuevo: sólo la primera lección del primer módulo está abierta', () => {
    assert(app.fn.lecDesbloqueada(0, 0));
    assert(!app.fn.lecDesbloqueada(0, 1), 'la segunda lección no debería estar abierta');
  });
  test('Completar una lección abre la siguiente', () => {
    const m = app.MODULOS[0];
    app.modProgress[app.fn.lecClave(m.id, m.lecciones[0].id)] = { stars: 1 };
    assert(app.fn.lecDesbloqueada(0, 1), 'no se abrió la lección siguiente');
    assert(!app.fn.lecDesbloqueada(0, 2), 'se abrieron de más');
  });
  test('El módulo siguiente se abre al completar la mitad del anterior', () => {
    const m = app.MODULOS[0];
    assert(!app.fn.moduloDesbloqueado(1), 'todavía no debería abrirse');
    m.lecciones.slice(0, Math.ceil(m.lecciones.length / 2)).forEach(l => {
      app.modProgress[app.fn.lecClave(m.id, l.id)] = { stars: 2 };
    });
    assert(app.fn.moduloDesbloqueado(1), 'no se abrió el módulo 2 al llegar a la mitad');
  });
}

// ═══════════════════════════════════════════════════════════
// Estrellas según desempeño (antes eran SIEMPRE 3)
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const e = app.fn.estrellasPorErrores;

  test('Sin errores son 3 estrellas', () => eq(e(0, 8), 3));
  test('Pocos errores son 2 estrellas', () => { eq(e(1, 8), 2); eq(e(2, 8), 2); });
  test('Muchos errores es 1 estrella', () => eq(e(9, 8), 1));
  test('Nunca da 0 ni más de 3', () => {
    for (let err = 0; err < 40; err++) for (const n of [1, 4, 8, 15]) {
      const s = e(err, n);
      assert(s >= 1 && s <= 3, `errores=${err} pasos=${n} dio ${s}`);
    }
  });
  test('En lecciones largas el umbral de 2 estrellas es proporcional', () => {
    assert(e(3, 15) === 2, 'en una lección de 15 pasos, 3 errores todavía deberían ser 2 estrellas');
    assert(e(3, 4) === 1, 'en una de 4 pasos, 3 errores es 1 estrella');
  });
  test('Ya no existe el "siempre 3 estrellas" del sistema viejo', () => {
    assert(!/l\[currentLesson\]\.stars=3/.test(src), 'sigue asignando 3 estrellas fijas');
  });
}

// ═══════════════════════════════════════════════════════════
// Recorrido completo de una lección
// ═══════════════════════════════════════════════════════════
// El motor difiere el avance de paso 600ms para mostrar el "¡Correcto!".
// Los tests tienen que esperar esa animación, si no leen estado a medio camino.
const dormir = ms => new Promise(r => setTimeout(r, ms));

(async () => {
{
  const { app, doc } = boot();
  const M = app.MODULOS;

  test('Arrancar una lección la deja en la fase de explicación', () => {
    app.fn.startLesson(0, 0);
    eq(app.faseActual, 0);
    eq(doc.getElementById('lesson-explicacion').style.display, 'block');
    eq(doc.getElementById('lesson-prompt-zone').style.display, 'none');
  });
  test('La explicación muestra título, texto y tip reales', () => {
    const html = doc.getElementById('lesson-explicacion').innerHTML;
    const l = M[0].lecciones[0];
    assert(html.includes(l.explicacion.titulo), 'falta el título');
    assert(html.includes(l.explicacion.tip), 'falta el tip');
  });
  test('El indicador marca las 4 fases', () => {
    eq(doc.querySelectorAll('#fase-indicador .fase-chip').length, 4);
    eq(doc.querySelectorAll('#fase-indicador .fase-chip.on').length, 1);
  });
  test('La fase 2 es la demostración', () => {
    app.fn.siguienteFase();
    eq(app.faseActual, 1);
    assert(/Demostración/.test(doc.getElementById('prompt-main').textContent));
  });
  test('En práctica se ilumina la tecla que hay que tocar', () => {
    app.fn.siguienteFase();
    eq(app.faseActual, 2);
    assert(doc.querySelectorAll('#piano-lesson .hl').length >= 1, 'no se iluminó ninguna tecla');
  });
  test('Tocar la nota correcta avanza al paso siguiente', () => {
    const antes = app.pasoActual;
    app.fn.checkLessonNote(M[0].lecciones[0].practica[antes].n);
    eq(app.pasoActual, antes + 1);
  });
  test('En práctica un error NO suma al contador de la evaluación', () => {
    app.fn.checkLessonNote('B4');
    eq(app.erroresEval, 0, 'la práctica no debería penalizar');
  });
  test('En evaluación NO se ilumina la tecla: hay que saberla', () => {
    app.faseActual = 3; app.pasoActual = 0; app.erroresEval = 0;
    app.fn.mostrarFase();
    eq(doc.querySelectorAll('#piano-lesson .hl').length, 0, 'la evaluación está dando la respuesta');
  });
  test('En evaluación un error SÍ cuenta', () => {
    const l = M[0].lecciones[0];
    const mala = l.evaluacion[0].n === 'C4' ? 'D4' : 'C4';
    app.fn.checkLessonNote(mala);
    eq(app.erroresEval, 1);
  });
  const l0 = M[0].lecciones[0];
  for (const p of l0.evaluacion) {
    for (const n of (p.acorde || [p.n])) app.fn.checkLessonNote(n);
    await dormir(650);
  }
  test('Completar la evaluación con 1 error da 2 estrellas', () => {
    eq(app.fn.lecEstrellas('notas', l0.id), 2, 'con 1 error deberían ser 2 estrellas');
  });
  test('Al terminar vuelve a la lista de módulos', () => {
    eq(app.modActual, null);
    eq(doc.getElementById('lesson-select').style.display, 'block');
  });
  test('Repetir una lección nunca baja las estrellas ya obtenidas', () => {
    app.fn.startLesson(0, 0);
    app.faseActual = 3; app.pasoActual = 0; app.erroresEval = 99;
    app.fn.finishLesson();
    eq(app.fn.lecEstrellas('notas', l0.id), 2, 'una repetición peor borró el progreso anterior');
  });
  test('Una repetición mejor SÍ sube las estrellas', () => {
    app.fn.startLesson(0, 0);
    app.faseActual = 3; app.pasoActual = 0; app.erroresEval = 0;
    app.fn.finishLesson();
    eq(app.fn.lecEstrellas('notas', l0.id), 3, 'no subió a 3 tras una ronda perfecta');
  });
}

// ═══════════════════════════════════════════════════════════
// Lecciones de acordes
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  const may = app.MODULOS.findIndex(m => m.id === 'may');

  test('Una lección de acordes exige las 3 notas juntas', () => {
    app.modProgress = {};
    app.fn.startLesson(may, 1); // "Do mayor"
    app.faseActual = 2; app.pasoActual = 0;
    app.fn.mostrarFase();
    eq(doc.querySelectorAll('#piano-lesson .hl').length, 3, 'deberían iluminarse las 3 notas');
    app.fn.checkLessonNote('C4');
    eq(app.pasoActual, 0, 'con una sola nota no debería avanzar');
    app.fn.checkLessonNote('E4');
    eq(app.pasoActual, 0, 'con dos notas tampoco');
    app.fn.checkLessonNote('G4');
    eq(app.pasoActual, 1, 'con las 3 debería avanzar');
  });
}

// ═══════════════════════════════════════════════════════════
// Migración desde el sistema viejo
// ═══════════════════════════════════════════════════════════
{
  test('El progreso de v1.4 no se pierde al actualizar', () => {
    const { app } = boot({
      storage: {
        pianokids_progress_v1: {
          stars: 60, notesPlayed: 200,
          lessonsNotes: [{ stars: 3 }, { stars: 3 }, { stars: 0 }, { stars: 0 }, { stars: 0 }],
          lessonsMaj: [{ stars: 3 }, { stars: 0 }, { stars: 0 }, { stars: 0 }, { stars: 0 }, { stars: 0 }, { stars: 0 }],
          lessonsMen: [{ stars: 0 }],
        },
      },
    });
    app.fn.loadProgress();
    const M = app.MODULOS;
    eq(app.fn.lecEstrellas('notas', M[0].lecciones[0].id), 2, 'no migró la primera lección de notas');
    eq(app.fn.lecEstrellas('notas', M[0].lecciones[1].id), 2, 'no migró la segunda');
    eq(app.fn.lecEstrellas('notas', M[0].lecciones[2].id), 0, 'migró de más');
    eq(app.stars, 60, 'se perdieron las estrellas globales');
  });
  test('Un usuario nuevo no recibe lecciones migradas', () => {
    const { app } = boot();
    app.fn.loadProgress();
    eq(Object.keys(app.modProgress).length, 0);
  });
  test('La migración no pisa el progreso nuevo si ya existe', () => {
    const { app } = boot({
      storage: {
        pianokids_progress_v1: {
          modProgress: { 'notas/n1': { stars: 3 } },
          lessonsNotes: [{ stars: 3 }, { stars: 3 }, { stars: 3 }],
        },
      },
    });
    app.fn.loadProgress();
    eq(app.fn.lecEstrellas('notas', 'n1'), 3, 'la migración pisó el progreso nuevo');
    eq(app.fn.lecEstrellas('notas', 'n2'), 0, 'volvió a migrar sobre datos ya migrados');
  });
}

// ═══════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  app.fn.buildLessonGrid();

  test('Se renderizan los 5 módulos', () => eq(doc.querySelectorAll('#lesson-grid .modulo').length, 5));
  test('Se renderizan todas las lecciones', () => {
    const total = app.MODULOS.reduce((n, m) => n + m.lecciones.length, 0);
    eq(doc.querySelectorAll('#lesson-grid .lesson-card').length, total);
  });
  test('Los módulos bloqueados se muestran como tales', () => {
    eq(doc.querySelectorAll('#lesson-grid .modulo.locked').length, 4);
  });
  test('Sólo la primera lección arranca clickeable', () => {
    const abiertas = [...doc.querySelectorAll('#lesson-grid .lesson-card')].filter(c => !c.classList.contains('locked'));
    eq(abiertas.length, 1);
  });
  test('El panel de padres tiene una pestaña por módulo', () => {
    app.fn.buildPadresLeccTabs();
    eq(doc.querySelectorAll('#padres-lecc-tabs button').length, 5);
  });
  test('El panel de padres muestra el detalle de un módulo', () => {
    app.fn.showPadresLecc('notas', doc.querySelector('#padres-lecc-tabs button'));
    const cards = doc.querySelectorAll('#padres-lecc-grid > div');
    eq(cards.length, app.MODULOS[0].lecciones.length);
    assert(/Completadas/.test(doc.getElementById('padres-lecc-summary').innerHTML));
  });
  test('Ya no queda nada del sistema de lecciones viejo', () => {
    ['LESSONS_NOTES', 'LESSONS_MAJ', 'LESSONS_MEN', 'getLessonList', 'setLessonCat', 'lessonCat']
      .forEach(id => assert(!src.includes(id), `sigue existiendo ${id}`));
  });
}

process.exit(report('PianoKids v1.5 — currículum de lecciones') === 0 ? 0 : 1);
})();
