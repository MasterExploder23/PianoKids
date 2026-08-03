// Suite del motor de ritmo (v2.1).
// Uso:  node tests/ritmo.js
const { boot, test, assert, eq, report, src, srcC } = require('./harness');

const dormir = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════
// Formato de canción con duraciones
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Toda canción tiene notas con duración, bpm y compás', () => {
    app.SONGS.forEach(s => {
      assert(Array.isArray(s.notas) && s.notas.length, `${s.name}: sin notas`);
      assert(s.bpm > 0, `${s.name}: sin bpm`);
      assert(/^\d+\/\d+$/.test(s.compas), `${s.name}: compás inválido "${s.compas}"`);
    });
  });
  test('Cada nota tiene altura y duración positiva', () => {
    app.SONGS.forEach(s =>
      s.notas.forEach((p, i) => {
        assert(typeof p.n === 'string' && p.n, `${s.name}[${i}]: sin altura`);
        assert(typeof p.d === 'number' && p.d > 0, `${s.name}[${i}]: duración ${p.d}`);
      })
    );
  });
  test('notes sigue existiendo y coincide con notas', () => {
    app.SONGS.forEach(s => {
      eq(s.notes.length, s.notas.length, `${s.name}: notes y notas difieren en largo`);
      eq(s.notes, s.notas.map(p => p.n), `${s.name}: notes no coincide con notas`);
    });
  });
  test('Las duraciones son figuras musicales razonables', () => {
    const validas = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
    app.SONGS.forEach(s =>
      s.notas.forEach((p, i) =>
        assert(validas.includes(p.d), `${s.name}[${i}]: duración ${p.d} no es una figura estándar`)
      )
    );
  });
  test('Toda nota del catálogo existe en el teclado', () => {
    const teclas = new Set([...app.WHITE_NOTES, ...app.BLACK_DEFS.map(b => b.n)]);
    app.SONGS.forEach(s =>
      s.notas.forEach(p => assert(teclas.has(p.n), `${s.name}: ${p.n} no está en el teclado`))
    );
  });

  // Lo importante de este test no es que haya ritmo real, sino que la app sea
  // HONESTA sobre cuál lo tiene y cuál no.
  test('Las canciones sin ritmo real están marcadas como aproximadas', () => {
    app.SONGS.forEach(s => {
      const uniformes = s.notas.every(p => p.d === s.notas[0].d);
      if (uniformes && s.notas.length > 4) {
        assert(s.ritmoAprox === true,
          `${s.name} tiene todas las notas iguales pero no está marcada como aproximada`);
      }
    });
  });
  test('Las marcadas con ritmo real no son uniformes', () => {
    app.SONGS.filter(s => !s.ritmoAprox).forEach(s => {
      const distintas = new Set(s.notas.map(p => p.d));
      assert(distintas.size > 1, `${s.name} dice tener ritmo real pero es todo negras`);
    });
  });
  test('Hay al menos 5 canciones con ritmo real', () => {
    const reales = app.SONGS.filter(s => !s.ritmoAprox).length;
    assert(reales >= 5, `sólo ${reales} canciones con ritmo real`);
  });
  test('El comentario del archivo explica qué significa ritmoAprox', () => {
    assert(/ritmoAprox[\s\S]{0,400}negras uniformes/i.test(src),
      'no se documenta el significado de la marca');
  });
}

// ═══════════════════════════════════════════════════════════
// Conversión a tiempo
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const R = app.Ritmo;

  test('Una negra a 60 BPM dura un segundo exacto', () => eq(R.msPorNegra(60), 1000));
  test('A 120 BPM la negra dura medio segundo', () => eq(R.msPorNegra(120), 500));
  test('El plan ubica cada nota en su momento exacto', () => {
    const c = { bpm: 60, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 2 }] };
    const plan = R.planificar(c);
    eq(plan.map(p => p.t), [0, 1000, 1500], 'los tiempos de entrada están mal');
    eq(plan.map(p => p.dur), [1000, 500, 2000], 'las duraciones están mal');
  });
  test('La duración total es la suma de las figuras', () => {
    const c = { bpm: 60, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 2 }] };
    eq(R.duracionTotal(c), 3500);
  });
  test('El tempo escala todo proporcionalmente', () => {
    const c = { bpm: 60, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }] };
    eq(R.duracionTotal(c, 120), R.duracionTotal(c, 60) / 2);
  });
  test('Cada canción real dura algo razonable', () => {
    app.SONGS.forEach(s => {
      const seg = R.duracionTotal(s) / 1000;
      assert(seg > 3 && seg < 400, `${s.name} duraría ${seg.toFixed(0)}s`);
    });
  });
  test('Cumpleaños Feliz dura lo que tiene que durar', () => {
    // 25 notas en 3/4 a 100 BPM: son 8 compases más el anacrusa.
    const c = app.SONGS.find(s => s.name === 'Cumpleaños Feliz');
    const negras = c.notas.reduce((n, p) => n + p.d, 0);
    eq(negras, 25, `suma ${negras} negras, esperaba 25 (8 compases de 3/4 + anacrusa)`);
  });
}

// ═══════════════════════════════════════════════════════════
// Ventanas de tolerancia
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const R = app.Ritmo;

  test('Tocar exacto es perfecto', () => eq(R.evaluar(0).id, 'perfecto'));
  test('Las ventanas van de menor a mayor tolerancia', () => {
    const ms = R.VENTANAS.map(v => v.ms);
    eq(ms, [...ms].sort((a, b) => a - b));
  });
  test('Los puntos bajan a medida que se pierde precisión', () => {
    const p = R.VENTANAS.map(v => v.puntos);
    eq(p, [...p].sort((a, b) => b - a));
    eq(R.FALLADA.puntos, 0);
  });
  test('Adelantarse y atrasarse penalizan igual', () => {
    eq(R.evaluar(-150).id, R.evaluar(150).id, 'la tolerancia no es simétrica');
    eq(R.evaluar(-500).id, R.evaluar(500).id);
  });
  test('Fuera de toda ventana es fallada', () => {
    const max = Math.max(...R.VENTANAS.map(v => v.ms));
    eq(R.evaluar(max + 1).id, 'fuera');
    eq(R.evaluar(5000).id, 'fuera');
  });
  test('La tolerancia es generosa: un chico no es un metrónomo', () => {
    const max = Math.max(...R.VENTANAS.map(v => v.ms));
    assert(max >= 300, `la ventana más ancha es de ${max}ms, demasiado exigente para un chico`);
  });
  test('Toda ventana tiene texto y emoji para mostrarle al chico', () => {
    [...R.VENTANAS, R.FALLADA].forEach(v => {
      assert(v.texto && v.emoji, `${v.id} sin feedback visible`);
      assert(v.id, 'ventana sin id');
    });
  });
}

// ═══════════════════════════════════════════════════════════
// Precisión y estrellas
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const R = app.Ritmo;
  const de = (...pts) => pts.map(p => ({ puntos: p }));

  test('Todo perfecto es 100%', () => eq(R.precision(de(3, 3, 3, 3)), 100));
  test('Todo fallado es 0%', () => eq(R.precision(de(0, 0, 0)), 0));
  test('La mitad de los puntos da alrededor del 50%', () => {
    const p = R.precision(de(3, 0, 3, 0));
    assert(p >= 45 && p <= 55, `dio ${p}%`);
  });
  test('Sin notas tocadas la precisión es 0, no NaN', () => eq(R.precision([]), 0));
  test('La precisión no depende del largo de la canción', () => {
    eq(R.precision(de(3, 3)), R.precision(de(3, 3, 3, 3, 3, 3)));
  });
  test('Las estrellas premian la precisión, no completar', () => {
    eq(R.estrellasPorPrecision(100), 3);
    eq(R.estrellasPorPrecision(90), 3);
    eq(R.estrellasPorPrecision(70), 2);
    eq(R.estrellasPorPrecision(20), 1);
  });
  test('Nunca da 0 estrellas ni más de 3', () => {
    for (let p = 0; p <= 100; p++) {
      const e = R.estrellasPorPrecision(p);
      assert(e >= 1 && e <= 3, `precisión ${p}% dio ${e} estrellas`);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Reproducción y evaluación en vivo
// ═══════════════════════════════════════════════════════════
(async () => {
  {
    const { app } = boot();
    const R = app.Ritmo;
    // 240 BPM: la negra dura 250ms, así el test no tarda una eternidad.
    const cancion = { bpm: 240, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }] };

    const n = R.iniciar(cancion, 240, {});
    test('Iniciar devuelve la cantidad de notas del plan', () => eq(n, 3));
    test('El motor queda activo', () => assert(R.activo));

    R.tocar('C4');
    test('Tocar la nota correcta al principio da la máxima puntuación', () => {
      const res = R.terminar();
      eq(res.detalle[0].correcta, true);
      eq(res.detalle[0].id, 'perfecto', `dio ${res.detalle[0].id} con desvío ${res.detalle[0].desvio}ms`);
    });
    test('Terminar desactiva el motor', () => assert(!R.activo));
  }

  {
    const { app } = boot();
    const R = app.Ritmo;
    const cancion = { bpm: 240, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }] };
    R.iniciar(cancion, 240, {});
    R.tocar('G4'); // nota equivocada
    const res = R.terminar();
    test('Tocar la nota equivocada cuenta como fallada', () => {
      eq(res.detalle[0].correcta, false);
      eq(res.detalle[0].puntos, 0);
    });
    test('El resumen separa acierto de notas y precisión rítmica', () => {
      assert('aciertoNotas' in res && 'precision' in res,
        'el resultado debería distinguir qué tocó de cuándo lo tocó');
    });
  }

  {
    const { app } = boot();
    const R = app.Ritmo;
    const cancion = { bpm: 240, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 }] };
    R.iniciar(cancion, 240, {});
    R.tocar('C4');
    await dormir(260);
    R.tocar('D4');
    const res = R.terminar();
    test('Cada nota se evalúa contra su propio momento', () => {
      eq(res.detalle.length, 2);
      eq(res.detalle[1].esperada, 'D4', 'la segunda nota se asignó al evento equivocado');
      assert(res.detalle[1].correcta, 'D4 tocada a tiempo debería contar como correcta');
    });
    test('Una nota no se puede puntuar dos veces', () => {
      const idx = res.detalle.map(d => d.i);
      eq(new Set(idx).size, idx.length, 'se puntuó el mismo evento más de una vez');
    });
  }

  {
    const { app } = boot();
    const R = app.Ritmo;
    R.iniciar({ bpm: 240, notas: [{ n: 'C4', d: 1 }] }, 240, {});
    R.cancelar();
    test('Cancelar desactiva el motor sin dar resultado', () => {
      assert(!R.activo);
      eq(R.tocar('C4'), null, 'sigue aceptando notas después de cancelar');
    });
  }

  {
    const { app } = boot();
    const R = app.Ritmo;
    let notificadas = 0,
      fin = null;
    R.iniciar({ bpm: 480, notas: [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }] }, 480, {
      onNota: () => notificadas++,
      onFin: r => (fin = r),
    });
    await dormir(1200);
    test('La UI recibe aviso de cada nota a medida que suena', () => {
      eq(notificadas, 2, `se avisaron ${notificadas} notas de 2`);
    });
    test('La canción termina sola al llegar al final', () => {
      assert(fin, 'nunca se llamó onFin');
      eq(fin.total, 2);
    });
  }

  // ── Integración con la app ──────────────────────────────
  {
    const { app, w } = boot();
    test('El modo por defecto es el de siempre: a mi tiempo', () => eq(app.modoCancion, 'libre'));
    test('Se puede cambiar a modo ritmo', () => {
      w.setModoCancion('ritmo', null);
      eq(app.modoCancion, 'ritmo');
      w.setModoCancion('libre', null);
    });
    test('En modo libre la canción sigue funcionando como antes', () => {
      const { app: a, w: w2 } = boot();
      w2.setModoCancion('libre', null);
      w2.startSong(0);
      const song = a.SONGS[0];
      song.notes.slice(0, 3).forEach(n => w2.checkSong(n));
      assert(a.songsCompleted >= 0, 'la canción rompió en modo libre');
    });
    test('Hay selector de modo en la interfaz', () => {
      assert(/setModoCancion\('libre'/.test(srcC) && /setModoCancion\('ritmo'/.test(srcC),
        'faltan los botones de modo');
    });
    test('Parar la canción cancela el motor de ritmo', () => {
      assert(/functionstopSong\(\)\{Ritmo\.cancelar\(\)/.test(srcC),
        'stopSong no cancela el motor: seguiría corriendo en segundo plano');
    });
    test('El panel de ritmo avisa cuando el ritmo es aproximado', () => {
      assert(/ritmoAprox\?'·ritmoaproximado'/.test(srcC.replace(/\s/g, '')) ||
        /ritmo aproximado/.test(src),
        'no se le avisa al chico que ese ritmo no es el real');
    });
  }

  process.exit(report('PianoKids v2.1 — motor de ritmo') === 0 ? 0 : 1);
})();
