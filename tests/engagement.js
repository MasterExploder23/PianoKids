// Suite de misiones diarias, racha, tienda y círculo de quintas (v1.6).
// Uso:  node tests/engagement.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT } = require('./harness');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daysAgo = n => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return dayKey(d); };

// ═══════════════════════════════════════════════════════════
// Desbloqueo: todos los módulos abiertos con una muestra
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();

  test('Todos los módulos están abiertos desde el arranque', () => {
    app.MODULOS.forEach((m, i) =>
      assert(app.fn.moduloDesbloqueado(i), `${m.nombre} arranca con candado`));
  });
  test('Cada módulo declara cuántas lecciones abre de entrada', () => {
    app.MODULOS.forEach(m => assert(m.libres >= 1, `${m.id} no tiene libres`));
  });
  test('Se abren exactamente las primeras N lecciones de cada módulo', () => {
    app.MODULOS.forEach((m, mi) => {
      m.lecciones.forEach((l, li) => {
        const esperado = li < m.libres;
        eq(app.fn.lecDesbloqueada(mi, li), esperado,
          `${m.id}/${l.id} (índice ${li}, libres=${m.libres})`);
      });
    });
  });
  test('El reparto es el acordado: notas 2, dedos 2, intervalos 1, mayores 2, menores 1', () => {
    eq(app.MODULOS.map(m => [m.id, m.libres]),
      [['notas', 2], ['dedos', 2], ['intervalos', 1], ['may', 2], ['men', 1]]);
  });
  test('Completar una lección abre la que sigue', () => {
    const m = app.MODULOS[0];
    assert(!app.fn.lecDesbloqueada(0, 2), 'la tercera no debería estar abierta todavía');
    app.modProgress[app.fn.lecClave(m.id, m.lecciones[1].id)] = { stars: 1 };
    assert(app.fn.lecDesbloqueada(0, 2), 'no se abrió la siguiente');
  });
  test('Ningún módulo se ve bloqueado en la pantalla', () => {
    app.fn.buildLessonGrid();
    eq(doc.querySelectorAll('#lesson-grid .modulo.locked').length, 0);
  });
  test('Hay 8 lecciones abiertas de entrada, no 1', () => {
    const { app: a2, doc: d2 } = boot();
    a2.fn.buildLessonGrid();
    const abiertas = [...d2.querySelectorAll('#lesson-grid .lesson-card')].filter(c => !c.classList.contains('locked'));
    eq(abiertas.length, 8);
  });
}

// ═══════════════════════════════════════════════════════════
// Misiones diarias
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Hay un catálogo de misiones', () => assert(app.MISIONES.length >= 5));
  test('Toda misión tiene id, texto, meta, campo y premio', () => {
    app.MISIONES.forEach(m => {
      ['id', 'emoji', 'texto', 'campo'].forEach(k => assert(m[k], `${m.id}: falta ${k}`));
      assert(m.meta > 0 && m.premio > 0, `${m.id}: meta o premio inválido`);
    });
  });
  test('Los ids de misión son únicos', () => eq(new Set(app.MISIONES.map(m => m.id)).size, app.MISIONES.length));
  test('Salen 2 misiones por día', () => eq(app.fn.misionesDeHoy().length, 2));
  test('Las 2 misiones del día son distintas entre sí', () => {
    const [a, b] = app.fn.misionesDeHoy();
    assert(a.id !== b.id, 'se repitió la misma misión dos veces');
  });
  test('Las misiones son estables: recargar no las cambia', () => {
    const antes = app.fn.misionesDeHoy().map(m => m.id);
    const { app: otro } = boot();
    eq(otro.fn.misionesDeHoy().map(m => m.id), antes,
      'las misiones cambian entre recargas: el chico perdería el progreso del día');
  });
  test('La semilla depende de la fecha, no del azar', () => {
    assert(!/misionesDeHoy[\s\S]{0,200}Math\.random/.test(src),
      'la elección de misiones usa Math.random y no sería estable');
    eq(app.fn.semillaDelDia('2026-08-02'), app.fn.semillaDelDia('2026-08-02'));
    assert(app.fn.semillaDelDia('2026-08-02') !== app.fn.semillaDelDia('2026-08-03'),
      'dos días distintos dan la misma semilla');
  });

  test('Avanzar una misión suma progreso', () => {
    const { app: a } = boot();
    a.fn.avanzarMision('notas', 5);
    eq(a.misionEstado.progreso.notas, 5);
  });
  test('Llegar a la meta cobra el premio en estrellas', () => {
    const { app: a } = boot();
    const mision = a.fn.misionesDeHoy().find(m => m.campo === 'notas') || a.MISIONES[0];
    const antes = a.stars;
    a.fn.avanzarMision(mision.campo, mision.meta);
    if (a.fn.misionesDeHoy().some(m => m.id === mision.id)) {
      assert(a.stars >= antes + mision.premio, 'no se pagó el premio');
      assert(a.fn.misionCumplida(mision), 'no quedó marcada como cumplida');
    }
  });
  test('Una misión no se puede cobrar dos veces', () => {
    const { app: a } = boot();
    const mision = a.fn.misionesDeHoy()[0];
    a.fn.avanzarMision(mision.campo, mision.meta);
    const trasCobrar = a.stars;
    a.fn.avanzarMision(mision.campo, mision.meta * 3);
    eq(a.stars, trasCobrar, 'pagó el premio más de una vez');
  });
  test('Cambiar de día reinicia el progreso de las misiones', () => {
    const { app: a } = boot();
    a.fn.avanzarMision('notas', 10);
    a.misionEstado = { fecha: daysAgo(1), progreso: { notas: 99 }, cobradas: ['notas20'] };
    a.fn.avanzarMision('notas', 1);
    eq(a.misionEstado.progreso.notas, 1, 'no reinició al cambiar el día');
    eq(a.misionEstado.cobradas.length <= 2, true);
  });

  test('Cada acción del chico está enganchada a una misión', () => {
    ['notas', 'lecciones', 'canciones', 'juegos', 'perfectas', 'metronomo'].forEach(campo =>
      assert(new RegExp(`avanzarMision\\('${campo}'`).test(src), `no hay gancho para ${campo}`));
  });
  test('Tocar una tecla avanza la misión de notas', () => {
    const { app: a, doc } = boot();
    const k = doc.querySelector('#piano-libre .wk');
    const ev = new doc.defaultView.Event('pointerdown', { bubbles: true, cancelable: true });
    Object.assign(ev, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
    k.dispatchEvent(ev);
    eq(a.misionEstado.progreso.notas, 1);
  });
}

// ═══════════════════════════════════════════════════════════
// Hitos de racha
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Los hitos van en orden creciente de días', () => {
    const dias = app.HITOS.map(h => h.dias);
    eq(dias, [...dias].sort((a, b) => a - b));
  });
  test('El premio crece con la dificultad', () => {
    const p = app.HITOS.map(h => h.premio);
    eq(p, [...p].sort((a, b) => a - b));
  });
  test('Sin racha no se cobra ningún hito', () => {
    const { app: a } = boot();
    a.fn.revisarHitos();
    eq(a.hitosCobrados.length, 0);
  });
  test('Llegar a 3 días cobra el primer hito', () => {
    const { app: a } = boot({
      storage: { pianokids_progress_v1: { activeDays: [daysAgo(2), daysAgo(1), daysAgo(0)], dailyNotes: {} } },
    });
    a.fn.loadProgress();
    eq(a.dayStreak, 3);
    const antes = a.stars;
    a.fn.revisarHitos();
    assert(a.hitosCobrados.includes(3), 'no cobró el hito de 3 días');
    assert(a.stars > antes, 'no pagó el premio');
  });
  test('Un hito no se cobra dos veces', () => {
    const { app: a } = boot({
      storage: { pianokids_progress_v1: { activeDays: [daysAgo(2), daysAgo(1), daysAgo(0)], dailyNotes: {} } },
    });
    a.fn.loadProgress(); a.fn.revisarHitos();
    const tras = a.stars;
    a.fn.revisarHitos(); a.fn.revisarHitos();
    eq(a.stars, tras, 'pagó el mismo hito más de una vez');
  });
  test('Una racha larga cobra todos los hitos alcanzados', () => {
    const dias = []; for (let i = 7; i >= 0; i--) dias.push(daysAgo(i));
    const { app: a } = boot({ storage: { pianokids_progress_v1: { activeDays: dias, dailyNotes: {} } } });
    a.fn.loadProgress(); a.fn.revisarHitos();
    eq(a.dayStreak, 8);
    assert(a.hitosCobrados.includes(3) && a.hitosCobrados.includes(7), 'faltó cobrar hitos alcanzados');
    assert(!a.hitosCobrados.includes(14), 'cobró un hito que no alcanzó');
  });
}

// ═══════════════════════════════════════════════════════════
// Tienda
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Hay temas y avatares', () => {
    assert(app.TEMAS.length >= 3 && app.AVATARES.length >= 3);
  });
  test('El primer tema y el primer avatar son gratis', () => {
    eq(app.TEMAS[0].precio, 0); eq(app.AVATARES[0].precio, 0);
  });
  test('Sólo hay un ítem gratis por categoría', () => {
    eq(app.TEMAS.filter(t => t.precio === 0).length, 1);
    eq(app.AVATARES.filter(a => a.precio === 0).length, 1);
  });
  test('Los precios van de menor a mayor', () => {
    [app.TEMAS, app.AVATARES].forEach(lista => {
      const p = lista.map(i => i.precio);
      eq(p, [...p].sort((a, b) => a - b));
    });
  });
  test('Todo tema define colores de tecla blanca y negra', () => {
    app.TEMAS.forEach(t => assert(/^#[0-9a-f]{6}$/i.test(t.blanca) && /^#[0-9a-f]{6}$/i.test(t.negra), `${t.id} sin colores`));
  });

  test('Sin estrellas no se puede comprar', () => {
    const { app: a } = boot();
    a.stars = 0;
    eq(a.fn.comprar('oceano'), false);
    assert(!a.comprados.includes('oceano'));
  });
  test('Con estrellas suficientes la compra funciona', () => {
    const { app: a } = boot();
    a.stars = 500;
    eq(a.fn.comprar('oceano'), true);
    assert(a.comprados.includes('oceano'));
    eq(a.temaActivo, 'oceano', 'no se aplicó el tema recién comprado');
  });
  test('Las estrellas gastadas se descuentan del saldo', () => {
    const { app: a } = boot();
    a.stars = 500;
    const antes = a.fn.estrellasDisponibles();
    const precio = a.TEMAS.find(t => t.id === 'oceano').precio;
    a.fn.comprar('oceano');
    eq(a.fn.estrellasDisponibles(), antes - precio, 'el saldo no bajó tras comprar');
  });
  test('No se puede comprar dos veces lo mismo', () => {
    const { app: a } = boot();
    a.stars = 500;
    a.fn.comprar('oceano');
    const saldo = a.fn.estrellasDisponibles();
    eq(a.fn.comprar('oceano'), false);
    eq(a.fn.estrellasDisponibles(), saldo, 'cobró dos veces el mismo ítem');
  });
  test('El saldo nunca queda negativo', () => {
    const { app: a } = boot();
    a.stars = 500;
    ['oceano', 'bosque', 'atardecer', 'galaxia', 'perro', 'panda', 'dragon', 'unicornio'].forEach(id => a.fn.comprar(id));
    assert(a.fn.estrellasDisponibles() >= 0, `saldo negativo: ${a.fn.estrellasDisponibles()}`);
  });
  test('Un ítem ya comprado se puede volver a poner sin pagar', () => {
    const { app: a } = boot();
    a.stars = 500;
    a.fn.comprar('oceano'); a.fn.comprar('bosque');
    const saldo = a.fn.estrellasDisponibles();
    a.fn.aplicar('oceano');
    eq(a.temaActivo, 'oceano');
    eq(a.fn.estrellasDisponibles(), saldo, 'cobró por cambiar a algo ya comprado');
  });
  test('El tema aplicado cambia las variables CSS del teclado', () => {
    const { app: a, doc } = boot();
    a.stars = 500; a.fn.comprar('bosque');
    const v = doc.documentElement.style.getPropertyValue('--tecla-blanca');
    eq(v.trim(), a.TEMAS.find(t => t.id === 'bosque').blanca);
  });
  test('Las teclas usan las variables CSS del tema', () => {
    assert(/\.wk\{[^}]*background:var\(--tecla-blanca/.test(src), 'las blancas no usan la variable');
    assert(/\.bk\{[^}]*background:var\(--tecla-negra/.test(src), 'las negras no usan la variable');
  });
  test('Las compras sobreviven al reload', () => {
    const { app: a } = boot({
      storage: { pianokids_progress_v1: { stars: 500, comprados: ['clasico', 'gato', 'galaxia'], temaActivo: 'galaxia', avatarActivo: 'gato' } },
    });
    a.fn.loadProgress();
    assert(a.comprados.includes('galaxia'));
    eq(a.temaActivo, 'galaxia');
  });
}

// ═══════════════════════════════════════════════════════════
// Círculo de quintas
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();

  test('El círculo tiene las 12 tonalidades', () => eq(app.COF.length, 12));
  test('Cada paso del círculo es una quinta justa (7 semitonos)', () => {
    const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
      Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10 };
    app.COF.forEach((n, i) => {
      const sig = app.COF[(i + 1) % 12];
      const paso = (PC[sig] - PC[n] + 12) % 12;
      eq(paso, 7, `de ${n} a ${sig} hay ${paso} semitonos, no una quinta`);
    });
  });
  test('renderCoF dibuja los 12 nodos', () => {
    app.fn.renderCoF();
    eq(doc.querySelectorAll('#cof-svg .cof-nodo').length, 12);
  });
  test('Es un SVG, no una imagen: escala y funciona offline', () => {
    const svg = doc.querySelector('#cof-svg svg');
    assert(svg, 'no se generó el SVG');
    assert(svg.getAttribute('viewBox'), 'sin viewBox no escala');
    assert(!/<img/.test(doc.getElementById('cof-svg').innerHTML), 'usa una imagen externa');
  });
  test('Tiene etiqueta accesible', () => {
    assert(/Círculo de quintas/.test(doc.querySelector('#cof-svg svg').getAttribute('aria-label') || ''));
  });
  test('Los nombres respetan la notación en español', () => {
    const txt = doc.getElementById('cof-svg').textContent;
    ['Do', 'Sol', 'Re', 'La', 'Mi', 'Si', 'Fa'].forEach(n =>
      assert(txt.includes(n), `falta ${n} en el círculo`));
  });
  test('Puede resaltar las notas de la ronda actual', () => {
    app.fn.renderCoF(['C', 'G', 'D']);
    eq(doc.querySelectorAll('#cof-svg .cof-nodo.on').length, 3);
  });
  test('Hay un texto explicativo de qué es el círculo', () => {
    const t = doc.querySelector('.cof-texto').textContent;
    assert(/mapa de las notas/i.test(t), 'falta la explicación');
    assert(/cinco notas/i.test(t), 'no explica de dónde sale el nombre');
    assert(t.length > 150, 'la explicación es demasiado corta');
  });
}

// ═══════════════════════════════════════════════════════════
// UI y persistencia general
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  app.fn.renderHome();

  test('Se renderizan las 2 misiones del día', () => eq(doc.querySelectorAll('#misiones-lista .mision').length, 2));
  test('Se renderizan los hitos de racha', () => eq(doc.querySelectorAll('#hitos-lista .hito').length, app.HITOS.length));
  test('La tienda muestra temas y avatares', () => {
    eq(doc.querySelectorAll('#tienda-lista .tienda-item').length, app.TEMAS.length + app.AVATARES.length);
  });
  test('La tienda muestra el saldo disponible', () => {
    assert(/para gastar/.test(doc.getElementById('tienda-lista').textContent));
  });
  test('El avatar aparece en el encabezado', () => {
    assert(doc.getElementById('sc-avatar'), 'falta el chip de avatar');
    eq(doc.getElementById('sc-avatar').textContent, app.AVATARES[0].emoji);
  });
  test('Todo el estado nuevo se persiste', () => {
    ['misionEstado', 'hitosCobrados', 'comprados', 'temaActivo', 'avatarActivo']
      .forEach(k => assert(new RegExp(`${k}[,:]`).test(src), `${k} no se guarda`));
  });
}

process.exit(report('PianoKids v1.6 — misiones, racha, tienda y círculo') === 0 ? 0 : 1);
