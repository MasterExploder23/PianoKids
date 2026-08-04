// Suite del currículum de lecciones (v1.5).
// Uso:  node tests/lecciones.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT, src, srcC } = require('./harness');


// Semitonos por nota, para verificar la teoría musical de forma independiente.
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return PC[m[1]] + 12 * (+m[2] + 1); };

// ═══════════════════════════════════════════════════════════
// Estructura del currículum
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const M = app.MODULOS;

  test('Hay 7 módulos, sin huecos', () => {
    eq(M.length, 7);
    assert(M.every(m => m && m.id && m.lecciones && m.lecciones.length), 'hay un módulo vacío o undefined');
  });
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
  test('No hay huecos en el array de módulos', () => {
    assert(M.every(m => m && m.id), 'hay un módulo undefined: coma de más en el array');
  });

  // ── Módulo de ritmo (v2.2) ────────────────────────────
  const ritmo = M.find(m => m.id === 'ritmo');
  test('Existe el módulo de ritmo', () => assert(ritmo, 'falta el módulo de ritmo'));
  test('Sus lecciones traen duración en cada paso', () => {
    ritmo.lecciones.forEach(l =>
      [...l.practica, ...l.evaluacion].forEach((p, i) =>
        assert(typeof p.d === 'number' && p.d > 0, `${l.id}[${i}]: sin duración`))
    );
  });
  test('La demo del módulo de ritmo lleva el ritmo escrito', () => {
    ritmo.lecciones.forEach(l => {
      assert(typeof l.demo[0] === 'object', `${l.id}: la demo no tiene ritmo`);
      l.demo.forEach(p => assert(p.n && p.d > 0, `${l.id}: paso de demo incompleto`));
    });
  });
  test('Cada lección de ritmo define su tempo', () => {
    ritmo.lecciones.forEach(l => assert(l.bpm > 0, `${l.id}: sin bpm`));
  });
  test('Enseña las tres figuras básicas en orden', () => {
    const duraciones = ritmo.lecciones.map(l => new Set(l.evaluacion.map(p => p.d)));
    assert(duraciones[1].has(1), 'la lección 2 debería enseñar la negra');
    assert(duraciones[2].has(2), 'la lección 3 debería enseñar la blanca');
    assert(duraciones[3].has(0.5), 'la lección 4 debería enseñar la corchea');
  });
  test('La última lección mezcla las tres figuras', () => {
    const d = new Set(ritmo.lecciones[ritmo.lecciones.length - 1].evaluacion.map(p => p.d));
    assert(d.has(0.5) && d.has(1) && d.has(2), `la prueba final sólo usa ${[...d].join(', ')}`);
  });
  test('Las duraciones del módulo son figuras reales', () => {
    const validas = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
    ritmo.lecciones.forEach(l =>
      [...l.demo, ...l.practica, ...l.evaluacion].forEach(p =>
        assert(validas.includes(p.d), `${l.id}: duración ${p.d} no es una figura`))
    );
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
      // La demo puede ser ['C4',...] o [{n:'C4',d:1},...] desde v2.2.
      l.demo.forEach(x => out.push([`${m.id}/${l.id} demo`, typeof x === 'object' ? x.n : x]));
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
// Progresión encadenada
// (el reparto de lecciones libres por módulo se testea en engagement.js,
//  acá sólo verificamos que más allá de las libres la cadena siga vigente)
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const m = app.MODULOS[0], libres = m.libres;

  test('Más allá de las lecciones libres hay que ganarse la siguiente', () => {
    assert(app.fn.lecDesbloqueada(0, libres - 1), 'la última libre debería estar abierta');
    assert(!app.fn.lecDesbloqueada(0, libres), 'la primera no-libre no debería estar abierta');
  });
  test('Completar la última libre abre la siguiente', () => {
    app.modProgress[app.fn.lecClave(m.id, m.lecciones[libres - 1].id)] = { stars: 1 };
    assert(app.fn.lecDesbloqueada(0, libres), 'no se abrió la siguiente');
    assert(!app.fn.lecDesbloqueada(0, libres + 1), 'se abrieron de más');
  });
  test('Una lección con 0 estrellas no abre la siguiente', () => {
    const { app: a } = boot();
    const mm = a.MODULOS[0];
    a.modProgress[a.fn.lecClave(mm.id, mm.lecciones[mm.libres - 1].id)] = { stars: 0 };
    assert(!a.fn.lecDesbloqueada(0, mm.libres), 'abrió sin haberla completado');
  });
  test('La cadena vale en todos los módulos, no sólo en el primero', () => {
    const { app: a } = boot();
    a.MODULOS.forEach((mod, mi) => {
      const i = mod.libres;
      if (i >= mod.lecciones.length) return;
      assert(!a.fn.lecDesbloqueada(mi, i), `${mod.id}: la lección ${i} arranca abierta de más`);
    });
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
    assert(!/l\[currentLesson\]\.stars=3/.test(srcC), 'sigue asignando 3 estrellas fijas');
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

  test('Se renderizan todos los módulos', () => eq(doc.querySelectorAll('#lesson-grid .modulo').length, app.MODULOS.length));
  test('Se renderizan todas las lecciones', () => {
    const total = app.MODULOS.reduce((n, m) => n + m.lecciones.length, 0);
    eq(doc.querySelectorAll('#lesson-grid .lesson-card').length, total);
  });
  test('Las lecciones aún no alcanzadas se muestran con candado', () => {
    const total = app.MODULOS.reduce((n, m) => n + m.lecciones.length, 0);
    const libres = app.MODULOS.reduce((n, m) => n + m.libres, 0);
    eq(doc.querySelectorAll('#lesson-grid .lesson-card.locked').length, total - libres);
  });
  test('El panel de padres tiene una pestaña por módulo', () => {
    app.fn.buildPadresLeccTabs();
    eq(doc.querySelectorAll('#padres-lecc-tabs button').length, app.MODULOS.length);
  });
  test('El panel de padres muestra el detalle de un módulo', () => {
    app.fn.showPadresLecc('notas', doc.querySelector('#padres-lecc-tabs button'));
    const cards = doc.querySelectorAll('#padres-lecc-grid > div');
    eq(cards.length, app.MODULOS[0].lecciones.length);
    assert(/Completadas/.test(doc.getElementById('padres-lecc-summary').innerHTML));
  });
  test('Ya no queda nada del sistema de lecciones viejo', () => {
    ['LESSONS_NOTES', 'LESSONS_MAJ', 'LESSONS_MEN', 'getLessonList', 'setLessonCat', 'lessonCat']
      .forEach(id => assert(!srcC.includes(id), `sigue existiendo ${id}`));
  });
}

// ═══════════════════════════════════════════════════════════
// Módulo 7 — Lectura de partitura (v2.4)
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  const M = app.MODULOS;
  const lec = M.find(m => m.id === 'lectura');

  test('Existe el módulo de lectura y es el último', () => {
    assert(lec, 'no está el módulo lectura');
    eq(M[M.length - 1].id, 'lectura');
  });
  test('Es el único módulo marcado con partitura', () => {
    eq(M.filter(m => m.partitura).length, 1);
    assert(lec.partitura === true, 'lectura no tiene partitura:true');
  });
  test('Todos sus pasos traen duración escrita', () => {
    lec.lecciones.forEach(l => {
      [...l.demo, ...l.practica, ...l.evaluacion].forEach(p => {
        assert(typeof p === 'object' && p.n, `${l.id}: paso sin nota`);
        assert(typeof p.d === 'number' && p.d > 0, `${l.id}: paso sin duración`);
      });
    });
  });
  test('Todas sus duraciones son figuras dibujables', () => {
    const validas = new Set(app.Partitura.FIGURAS.map(f => f.d));
    lec.lecciones.forEach(l =>
      [...l.demo, ...l.practica, ...l.evaluacion].forEach(p =>
        assert(validas.has(p.d), `${l.id}: la duración ${p.d} no tiene figura`)));
  });
  test('Todas sus notas tienen posición en el pentagrama', () => {
    lec.lecciones.forEach(l =>
      [...l.demo, ...l.practica, ...l.evaluacion].forEach(p =>
        assert(app.STAFF_Y[p.n] !== undefined, `${l.id}: ${p.n} no está en STAFF_Y`)));
  });
  test('La lección de las líneas usa exactamente las 5 notas de línea', () => {
    const l = lec.lecciones.find(x => x.id === 'p1');
    eq(l.demo.map(p => p.n), ['E4', 'G4', 'B4', 'D5', 'F5']);
    // Y esas notas caen sobre las líneas del pentagrama, no en los espacios.
    l.demo.forEach(p => assert(app.Partitura.LINEAS.includes(app.STAFF_Y[p.n]),
      `${p.n} (y=${app.STAFF_Y[p.n]}) no cae sobre una línea`));
  });
  test('La lección de los espacios usa notas que NO caen en líneas', () => {
    const l = lec.lecciones.find(x => x.id === 'p2');
    eq(l.demo.map(p => p.n), ['F4', 'A4', 'C5', 'E5']);
    l.demo.forEach(p => assert(!app.Partitura.LINEAS.includes(app.STAFF_Y[p.n]),
      `${p.n} debería estar en un espacio`));
  });
  test('La lección del Do central usa una nota con línea adicional', () => {
    const l = lec.lecciones.find(x => x.id === 'p3');
    assert(l.demo.some(p => p.n === 'C4'), 'no aparece el Do central');
    assert(app.Partitura.ledgers(app.STAFF_Y['C4']).length === 1,
      'el Do central debería llevar exactamente una línea adicional');
  });
  test('Las primeras 2 lecciones vienen abiertas', () => eq(lec.libres, 2));

  // ── La partitura dentro de la lección ──
  test('pasosAPartitura conserva nota y duración', () => {
    const out = app.fn.pasosAPartitura([{ n: 'C4', d: 2, pista: 'x' }, { n: 'G4' }]);
    eq(out, [{ n: 'C4', d: 2 }, { n: 'G4', d: 1 }]);
  });
  test('pasosAPartitura descarta pasos de acorde, que no tienen .n', () => {
    eq(app.fn.pasosAPartitura([{ acorde: ['C4', 'E4', 'G4'] }, { n: 'C4', d: 1 }]).length, 1);
  });

  const iLectura = M.findIndex(m => m.id === 'lectura');
  const wrap = () => doc.getElementById('lesson-partitura-wrap');
  const svg = () => doc.querySelectorAll('#lesson-partitura-scroll svg');

  test('En la explicación todavía no se muestra la partitura', () => {
    app.fn.startLesson(iLectura, 0);
    eq(wrap().style.display, 'none');
  });
  test('En la práctica aparece la partitura con una nota por paso', () => {
    app.fn.startLesson(iLectura, 0);
    app.fn.siguienteFase(); // demo
    app.fn.siguienteFase(); // práctica
    eq(wrap().style.display, 'block');
    eq(svg().length, 1);
    const l = lec.lecciones[0];
    eq(doc.querySelectorAll('#lesson-partitura-scroll ellipse').length, l.practica.length);
  });
  test('La nota del paso actual se resalta en la partitura', () => {
    app.fn.startLesson(iLectura, 0);
    app.fn.siguienteFase();
    app.fn.siguienteFase();
    // El resaltado es un círculo naranja alrededor de la cabeza: uno solo.
    eq(doc.querySelectorAll('#lesson-partitura-scroll circle[stroke="#fb8c00"]').length, 1);
  });
  test('Avanzar de paso mueve el resaltado a otra nota', () => {
    app.fn.startLesson(iLectura, 0);
    const pasos = lec.lecciones[0].practica;
    const cx = i => {
      app.fn.renderPartituraLeccion(pasos, i);
      const c = doc.querySelector('#lesson-partitura-scroll circle[stroke="#fb8c00"]');
      assert(c, 'no hay nota resaltada en el paso ' + i);
      return c.getAttribute('cx');
    };
    const a = cx(0), b = cx(1);
    assert(a !== b, 'el resaltado no se movió: quedó en cx=' + a);
  });
  test('Los otros módulos no muestran partitura en la práctica', () => {
    app.fn.startLesson(0, 0);
    app.fn.siguienteFase();
    app.fn.siguienteFase();
    eq(wrap().style.display, 'none');
    eq(svg().length, 0);
  });
  test('Salir de la lección limpia la partitura', () => {
    app.fn.startLesson(iLectura, 0);
    app.fn.siguienteFase();
    app.fn.siguienteFase();
    app.fn.exitLesson();
    eq(wrap().style.display, 'none');
    eq(doc.getElementById('lesson-partitura-scroll').innerHTML, '');
  });
  test('La partitura de la lección usa la misma geometría que la de canciones', () => {
    assert(/renderPartituraLeccion[\s\S]{0,400}Partitura\.render\(notas,STAFF_Y/.test(srcC),
      'la lección debería dibujar con STAFF_Y, igual que el pentagrama en vivo');
  });
}


process.exit(report('PianoKids v1.5 — currículum de lecciones') === 0 ? 0 : 1);
})();
