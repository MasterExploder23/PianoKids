// Smoke test funcional: simula uso real de la app clickeando el DOM
// y verifica que el panel de padres refleje exactamente lo que pasó.
// Uso:  node tests/smoke.js
const { boot, test, assert, eq, report } = require('./harness');

const fire = (el, tipo) => { assert(el, 'elemento inexistente'); el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent(tipo, { bubbles: true, cancelable: true })); };
const click = el => fire(el, 'click');
// Las teclas del piano responden a mousedown/mouseup, no a click.
const tocar = k => { fire(k, 'mousedown'); fire(k, 'mouseup'); };

// ═══════════════════════════════════════════════════════════
// Recorrido: usuario nuevo toca 6 teclas en el piano libre
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();

  const teclas = [...doc.querySelectorAll('#piano-libre .wk, #piano-libre .bk')];
  test('El piano libre renderiza teclas clickeables', () => {
    assert(teclas.length >= 14, `sólo ${teclas.length} teclas (esperadas 2 octavas)`);
  });

  const antes = { notas: app.notesPlayed, estrellas: app.stars, racha: app.dayStreak };
  test('Estado inicial en cero', () => eq(antes, { notas: 0, estrellas: 0, racha: 0 }));

  // El chico toca 6 teclas
  teclas.slice(0, 6).forEach(tocar);

  test('Tocar 6 teclas suma 6 notas', () => eq(app.notesPlayed, 6));
  test('Tocar 6 teclas suma 6 estrellas', () => eq(app.stars, 6));
  test('El combo llegó a 6 (notas seguidas)', () => eq(app.combo, 6));
  test('La racha diaria pasó a 1 (un día de actividad, no 6)', () => eq(app.dayStreak, 1));
  test('noteFrequency registró las notas tocadas', () => {
    eq(Object.values(app.noteFrequency).reduce((a, b) => a + b, 0), 6);
  });
  test('El chip 🔥 del header muestra días, no notas seguidas', () => {
    eq(doc.getElementById('sc-streak').textContent, '1', 'el header muestra el combo en vez de la racha');
  });
  test('El logro "5 notas seguidas" se desbloqueó', () => {
    assert(app.ACHS[1].ok, 'el logro de combo no se disparó');
  });

  // Panel de padres
  app.fn.renderPadresProgreso();
  app.fn.renderPadresStats();

  test('El panel de padres muestra racha 1, no 5', () => {
    eq(doc.getElementById('streak-num-p').textContent, '1');
  });
  test('Exactamente 1 día marcado como practicado en la semana', () => {
    eq(doc.querySelectorAll('#streak-days-p .streak-day-p.active').length, 1);
  });
  test('El día activo es hoy (último de los 7)', () => {
    const dias = [...doc.querySelectorAll('#streak-days-p .streak-day-p')];
    assert(dias[6].classList.contains('active'), 'el día marcado no es hoy');
  });
  test('El gráfico semanal muestra 6 notas hoy y nada los otros días', () => {
    const vals = [...doc.querySelectorAll('#weekly-chart-p .bar-val-p')].map(e => e.textContent.trim());
    eq(vals, ['', '', '', '', '', '', '6']);
  });
  test('"Notas más tocadas" ya no está vacío y suma 6', () => {
    const counts = [...doc.querySelectorAll('#notes-chart-p .note-count-p')].map(e => +e.textContent);
    assert(counts.length > 0, 'el gráfico de notas quedó vacío');
    eq(counts.reduce((a, b) => a + b, 0), 6);
  });
  test('Las estadísticas del panel coinciden con lo tocado', () => {
    const nums = [...doc.querySelectorAll('#stat-grid-p .stat-num-p')].map(e => e.textContent);
    assert(nums.includes('6'), `el panel no muestra las 6 notas/estrellas: ${nums.join(', ')}`);
  });
}

// ═══════════════════════════════════════════════════════════
// El combo se resetea al cambiar de pestaña, la racha no
// ═══════════════════════════════════════════════════════════
{
  const { app, doc, wire } = boot();
  [...doc.querySelectorAll('#piano-libre .wk, #piano-libre .bk')].slice(0, 5).forEach(tocar);
  eq(app.combo, 5);
  eq(app.dayStreak, 1);

  wire();
  const navBtns = [...doc.querySelectorAll('.nav-btn')];
  click(navBtns.find(b => /Metrónomo|Canciones|Juegos/.test(b.textContent)) || navBtns[1]);

  test('Cambiar de pestaña resetea el combo', () => eq(app.combo, 0));
  test('Cambiar de pestaña NO resetea la racha diaria', () => eq(app.dayStreak, 1, 'la racha se perdió al navegar'));
  test('Cambiar de pestaña no pierde las notas acumuladas', () => eq(app.notesPlayed, 5));
}

// ═══════════════════════════════════════════════════════════
// Navegación completa: ninguna pestaña rompe
// ═══════════════════════════════════════════════════════════
{
  const { doc, w } = boot();
  const errores = [];
  w.addEventListener('error', e => errores.push(e.message));
  const navBtns = [...doc.querySelectorAll('.nav-btn')];
  const abiertas = [];

  test('Hay al menos 8 pestañas de navegación', () => assert(navBtns.length >= 8, `sólo ${navBtns.length}`));

  navBtns.forEach(b => {
    const nombre = b.textContent.trim().slice(0, 20);
    test(`Pestaña "${nombre}" abre sin errores`, () => {
      const antes = doc.querySelector('.panel.active').id;
      click(b);
      const activos = [...doc.querySelectorAll('.panel.active')];
      eq(activos.length, 1, 'debe haber exactamente un panel activo');
      assert(b.classList.contains('active'), 'el botón no quedó marcado como activo');
      abiertas.push(activos[0].id);
    });
  });

  test('Ninguna pestaña lanzó errores de JS', () => eq(errores, []));
  test('Cada pestaña abrió un panel distinto', () => {
    eq(new Set(abiertas).size, navBtns.length, `se abrieron ${new Set(abiertas).size} paneles distintos de ${navBtns.length} botones`);
  });
}

// ═══════════════════════════════════════════════════════════
// Las canciones siguen jugables
// ═══════════════════════════════════════════════════════════
{
  const { app, doc, wire } = boot();
  const navBtns = [...doc.querySelectorAll('.nav-btn')];
  click(navBtns.find(b => /Canciones/.test(b.textContent)));

  test('Se renderizan las 15 tarjetas de canción', () => {
    eq(doc.querySelectorAll('#song-list .song-card').length, 15);
  });
  test('Cada tarjeta muestra la cantidad de notas', () => {
    const txt = doc.getElementById('song-list').textContent;
    assert(/\d+ notas/.test(txt), 'no aparece el contador de notas');
  });
  test('Arrancar una canción resalta una tecla en el piano', () => {
    wire();
    const btn = doc.querySelector('#song-list .song-card button');
    click(btn);
    assert(app.SONGS.length && doc.querySelectorAll('#piano-songs .hl').length >= 1,
      'no se resaltó ninguna tecla al iniciar la canción');
  });
}

process.exit(report('PianoKids v1.2 — smoke funcional') === 0 ? 0 : 1);
