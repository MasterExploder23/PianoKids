// Suite de notación musical (v2.3).
// Uso:  node tests/partitura.js
const { boot, test, assert, eq, report, src, srcC } = require('./harness');

// ═══════════════════════════════════════════════════════════
// Figuras: la duración determina cómo se dibuja
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const P = app.Partitura;

  test('Están las figuras que usa el catálogo', () => {
    [0.25, 0.5, 1, 1.5, 2, 3, 4].forEach(d =>
      assert(P.FIGURAS.some(f => f.d === d), `falta la figura de ${d} negras`));
  });
  test('Las figuras largas son huecas y las cortas rellenas', () => {
    // Regla real de notación: redonda y blanca tienen la cabeza sin rellenar.
    eq(P.figuraDe(4).hueca, true, 'la redonda debe ser hueca');
    eq(P.figuraDe(2).hueca, true, 'la blanca debe ser hueca');
    eq(P.figuraDe(1).hueca, false, 'la negra debe ser rellena');
    eq(P.figuraDe(0.5).hueca, false, 'la corchea debe ser rellena');
  });
  test('La redonda es la única sin plica', () => {
    eq(P.figuraDe(4).plica, false);
    [3, 2, 1.5, 1, 0.5, 0.25].forEach(d =>
      assert(P.figuraDe(d).plica, `la figura de ${d} debería llevar plica`));
  });
  test('Los corchetes crecen a medida que la figura se acorta', () => {
    eq(P.figuraDe(1).corchetes, 0, 'la negra no lleva corchete');
    eq(P.figuraDe(0.5).corchetes, 1, 'la corchea lleva uno');
    eq(P.figuraDe(0.25).corchetes, 2, 'la semicorchea lleva dos');
  });
  test('Las figuras con puntillo están marcadas', () => {
    [3, 1.5, 0.75].forEach(d =>
      assert(P.figuraDe(d).puntillo, `${d} negras es una figura con puntillo`));
    [4, 2, 1, 0.5].forEach(d =>
      assert(!P.figuraDe(d).puntillo, `${d} negras no lleva puntillo`));
  });
  test('El puntillo vale exactamente la mitad de la figura', () => {
    // Un puntillo suma la mitad: negra (1) con puntillo = 1.5.
    eq(P.figuraDe(1.5).d / P.figuraDe(1).d, 1.5);
    eq(P.figuraDe(3).d / P.figuraDe(2).d, 1.5);
  });
  test('Una duración desconocida no rompe: cae en negra', () => {
    assert(P.figuraDe(7).nombre, 'devolvió undefined');
    assert(P.figuraDe(undefined).nombre, 'devolvió undefined');
  });
  test('Toda figura tiene nombre en castellano', () => {
    P.FIGURAS.forEach(f => assert(f.nombre && /[a-záéíóú]/.test(f.nombre), `${f.d} sin nombre`));
  });
}

// ═══════════════════════════════════════════════════════════
// Geometría: coincide con el pentagrama en vivo
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const P = app.Partitura;

  test('Usa las mismas líneas que el pentagrama en vivo', () => {
    eq(P.LINEAS, app.STAFF_LINES, 'las dos vistas dibujarían la misma nota en lugares distintos');
  });
  test('Las líneas adicionales coinciden con las del pentagrama en vivo', () => {
    ['C4', 'A3', 'C3', 'A5', 'C6', 'G4'].forEach(n =>
      eq(P.ledgers(app.STAFF_Y[n]), app.fn.ledgerLinesFor(app.STAFF_Y[n]), `difieren en ${n}`));
  });
  test('Las notas más largas ocupan más ancho', () => {
    assert(P.anchoDe(2) > P.anchoDe(1), 'una blanca debería ocupar más que una negra');
    assert(P.anchoDe(1) > P.anchoDe(0.5), 'una negra debería ocupar más que una corchea');
  });
  test('El ancho nunca es tan chico que las notas se pisen', () => {
    [0.25, 0.5, 1, 2, 4].forEach(d => assert(P.anchoDe(d) >= 26, `${d} da ancho ${P.anchoDe(d)}`));
  });
  test('La posición horizontal avanza nota a nota', () => {
    const notas = [{ n: 'C4', d: 1 }, { n: 'D4', d: 2 }, { n: 'E4', d: 0.5 }];
    const xs = notas.map((_, i) => P.xDeNota(notas, i));
    assert(xs[0] < xs[1] && xs[1] < xs[2], `las x no avanzan: ${xs.join(', ')}`);
  });
}

// ═══════════════════════════════════════════════════════════
// Render
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  const P = app.Partitura;
  const parsear = svg => {
    const d = doc.createElement('div');
    d.innerHTML = svg;
    return d;
  };

  test('Dibuja una cabeza por nota', () => {
    const notas = [{ n: 'C4', d: 1 }, { n: 'E4', d: 2 }, { n: 'G4', d: 0.5 }];
    const g = parsear(P.render(notas, app.STAFF_Y, {}));
    eq(g.querySelectorAll('ellipse').length, 3);
  });
  test('Dibuja las 5 líneas del pentagrama', () => {
    const g = parsear(P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, {}));
    const horizontales = [...g.querySelectorAll('line')].filter(
      l => l.getAttribute('y1') === l.getAttribute('y2')
    );
    assert(horizontales.length >= 5, `sólo ${horizontales.length} líneas horizontales`);
  });
  test('Dibuja la clave de sol', () => {
    const g = parsear(P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, {}));
    assert(/𝄞/.test(g.textContent), 'falta la clave');
  });
  test('Dibuja el compás cuando se lo indican', () => {
    const g = parsear(P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, { compas: '3/4' }));
    const t = g.textContent;
    assert(t.includes('3') && t.includes('4'), `no aparece el compás: "${t}"`);
  });
  test('La blanca se dibuja hueca y la negra rellena', () => {
    const blanca = parsear(P.render([{ n: 'C4', d: 2 }], app.STAFF_Y, {})).querySelector('ellipse');
    const negra = parsear(P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, {})).querySelector('ellipse');
    eq(blanca.getAttribute('fill'), '#ffffff', 'la blanca no quedó hueca');
    assert(negra.getAttribute('fill') !== '#ffffff', 'la negra quedó hueca');
  });
  test('La corchea lleva su corchete dibujado', () => {
    const g = parsear(P.render([{ n: 'C4', d: 0.5 }], app.STAFF_Y, {}));
    assert(g.querySelectorAll('path').length >= 1, 'no se dibujó el corchete');
  });
  test('La redonda no lleva plica', () => {
    const redonda = parsear(P.render([{ n: 'B4', d: 4 }], app.STAFF_Y, {}));
    const negra = parsear(P.render([{ n: 'B4', d: 1 }], app.STAFF_Y, {}));
    const verticales = g => [...g.querySelectorAll('line')].filter(
      l => l.getAttribute('x1') === l.getAttribute('x2')
    ).length;
    assert(verticales(redonda) < verticales(negra), 'la redonda dibujó plica');
  });
  test('Las notas graves llevan sus líneas adicionales', () => {
    const g = parsear(P.render([{ n: 'C3', d: 1 }], app.STAFF_Y, {}));
    const cortas = [...g.querySelectorAll('line')].filter(l => {
      const x1 = +l.getAttribute('x1'), x2 = +l.getAttribute('x2');
      return l.getAttribute('y1') === l.getAttribute('y2') && x2 - x1 < 40;
    });
    assert(cortas.length >= 4, `C3 debería llevar 4 líneas adicionales, dibujó ${cortas.length}`);
  });
  test('El viewBox abarca las notas fuera del pentagrama', () => {
    const svg = P.render([{ n: 'C3', d: 1 }, { n: 'C6', d: 1 }], app.STAFF_Y, {});
    const m = /viewBox="18 (-?\d+) [\d.]+ ([\d.]+)"/.exec(svg);
    assert(m, `viewBox no parseable: ${svg.slice(0, 120)}`);
    const y0 = +m[1], alto = +m[2];
    assert(y0 <= app.STAFF_Y['C6'] - 20, 'recorta la nota más aguda');
    assert(y0 + alto >= app.STAFF_Y['C3'] + 20, 'recorta la nota más grave');
  });
  test('Resalta la nota actual', () => {
    const notas = [{ n: 'C4', d: 1 }, { n: 'D4', d: 1 }];
    const g = parsear(P.render(notas, app.STAFF_Y, { actual: 1 }));
    assert(g.querySelectorAll('circle').length >= 1, 'no se marcó la nota actual');
  });
  test('Sin nota actual no se resalta nada', () => {
    const g = parsear(P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, { actual: -1 }));
    eq(g.querySelectorAll('circle').length, 0);
  });
  test('Tiene etiqueta accesible', () => {
    const svg = P.render([{ n: 'C4', d: 1 }], app.STAFF_Y, {});
    assert(/aria-label="Partitura/.test(svg));
  });
  test('Las 15 canciones se dibujan sin romper', () => {
    app.SONGS.forEach(s => {
      const svg = P.render(s.notas, app.STAFF_Y, { compas: s.compas });
      assert(svg.startsWith('<svg'), `${s.name} no generó SVG`);
      const g = parsear(svg);
      eq(g.querySelectorAll('ellipse').length, s.notas.length, `${s.name}: faltan cabezas`);
    });
  });
  test('Una melodía vacía no rompe', () => {
    const svg = P.render([], app.STAFF_Y, {});
    assert(svg.startsWith('<svg'));
  });
}

// ═══════════════════════════════════════════════════════════
// Integración con la app
// ═══════════════════════════════════════════════════════════
{
  const { app, doc, w } = boot();

  // Ojo: buscar el nombre de la librería en el fuente da falso positivo, porque
  // el comentario de partitura.js explica POR QUÉ no se usa VexFlow. Lo que hay
  // que verificar es que no se CARGUE nada, no que no se la nombre.
  test('No se carga ninguna librería externa de notación', () => {
    const scripts = [...src.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
    const externos = scripts.filter(u => /^https?:|^\/\//.test(u));
    eq(externos, [], `se cargan scripts externos: ${externos.join(', ')}`);
    scripts.forEach(u =>
      assert(!/vexflow|abcjs|opensheetmusic/i.test(u), `se carga una librería de notación: ${u}`));
  });
  test('La partitura la dibuja código propio', () => {
    assert(/<script src="partitura\.js">/.test(src), 'no se carga el renderizador propio');
    assert(typeof app.Partitura.render === 'function');
  });
  test('Arrancar una canción dibuja su partitura', () => {
    w.startSong(0);
    const wrap = doc.getElementById('partitura-wrap');
    assert(wrap, 'falta el contenedor de partitura');
    eq(wrap.style.display, 'block', 'la partitura quedó oculta');
    const svg = doc.querySelector('#partitura-scroll svg');
    assert(svg, 'no se dibujó el SVG');
    eq(svg.querySelectorAll('ellipse').length, app.SONGS[0].notas.length);
  });
  test('Parar la canción esconde la partitura', () => {
    w.stopSong();
    eq(doc.getElementById('partitura-wrap').style.display, 'none');
  });
  test('El cursor sigue la nota que se está tocando', () => {
    const { app: a, w: w2, doc: d2 } = boot();
    w2.startSong(0);
    w2.renderPartitura(a.SONGS[0], 3);
    const marcas = d2.querySelectorAll('#partitura-scroll circle');
    assert(marcas.length >= 1, 'no se marcó ninguna nota');
  });
  test('La partitura se puede desplazar en pantallas chicas', () => {
    assert(/\.partitura-scroll\{[^}]*overflow-x:auto/.test(srcC),
      'sin scroll horizontal, una canción larga se corta en el celular');
  });
}

process.exit(report('PianoKids v2.3 — notación musical') === 0 ? 0 : 1);
