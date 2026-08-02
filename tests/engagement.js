// Suite de misiones diarias, racha, tienda y círculo de quintas (v1.6).
// Uso:  node tests/engagement.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT, src, srcC } = require('./harness');

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
    assert(!/misionesDeHoy[\s\S]{0,200}Math\.random/.test(srcC),
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
      assert(new RegExp(`avanzarMision\\('${campo}'`).test(srcC), `no hay gancho para ${campo}`));
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
  test('La tienda completa cuesta lo suficiente para durar semanas', () => {
    const total = [...app.TEMAS, ...app.AVATARES].reduce((n, i) => n + i.precio, 0);
    assert(total >= 8000,
      `la tienda entera cuesta ${total} estrellas: se desbloquea en una sola sesión`);
  });
  test('El primer ítem pago ya cuesta más de una sesión', () => {
    const primerPago = Math.min(...[...app.TEMAS, ...app.AVATARES].filter(i => i.precio > 0).map(i => i.precio));
    assert(primerPago >= 250, `el más barato sale ${primerPago}: se compra el primer día`);
  });
  test('Cada escalón de precio es un salto real, no un centavo más', () => {
    [app.TEMAS, app.AVATARES].forEach(lista => {
      const pagos = lista.filter(i => i.precio > 0).map(i => i.precio);
      pagos.slice(1).forEach((p, i) =>
        assert(p >= pagos[i] * 1.5, `${p} apenas supera a ${pagos[i]}: no se siente progresión`));
    });
  });
  test('Los precios van de menor a mayor', () => {
    [app.TEMAS, app.AVATARES].forEach(lista => {
      const p = lista.map(i => i.precio);
      eq(p, [...p].sort((a, b) => a - b));
    });
  });
  test('Cada tema pago trae su escena de fondo', () => {
    app.TEMAS.filter(t => t.precio > 0).forEach(t =>
      assert(t.fondo && t.fondo.startsWith('data:image/svg+xml'),
        `${t.id} no tiene fondo, o no es un SVG embebido`));
  });
  test('El tema gratis no tiene escena: se ve el fondo de siempre', () => {
    eq(app.TEMAS[0].fondo, null);
  });
  test('Los fondos son SVG embebidos, no imágenes descargadas', () => {
    app.TEMAS.forEach(t => {
      if (!t.fondo) return;
      assert(!/^https?:/.test(t.fondo), `${t.id} apunta a una URL externa: rompe el modo offline`);
      assert(t.fondo.length < 20000, `${t.id} pesa ${t.fondo.length} bytes, demasiado para inline`);
    });
  });
  test('Aplicar un tema con escena pinta el fondo del body', () => {
    const { app: a, doc: d } = boot();
    a.stars = 99999; a.fn.comprar('galaxia');
    assert(/data:image\/svg/.test(d.body.style.backgroundImage), 'no se aplicó la escena');
    assert(d.body.classList.contains('con-escena'));
    eq(d.body.dataset.tema, 'galaxia');
  });
  test('Volver al tema clásico limpia el fondo', () => {
    const { app: a, doc: d } = boot();
    a.stars = 99999; a.fn.comprar('galaxia'); a.fn.aplicar('clasico');
    eq(d.body.style.backgroundImage, '');
    assert(!d.body.classList.contains('con-escena'));
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
  const precioDe = (a, id) => [...a.TEMAS, ...a.AVATARES].find(i => i.id === id).precio;

  test('Con estrellas suficientes la compra funciona', () => {
    const { app: a } = boot();
    a.stars = precioDe(a, 'oceano');
    eq(a.fn.comprar('oceano'), true);
    assert(a.comprados.includes('oceano'));
    eq(a.temaActivo, 'oceano', 'no se aplicó el tema recién comprado');
  });
  test('Las estrellas gastadas se descuentan del saldo', () => {
    const { app: a } = boot();
    a.stars = precioDe(a, 'oceano') * 3;
    const antes = a.fn.estrellasDisponibles();
    const precio = a.TEMAS.find(t => t.id === 'oceano').precio;
    a.fn.comprar('oceano');
    eq(a.fn.estrellasDisponibles(), antes - precio, 'el saldo no bajó tras comprar');
  });
  test('No se puede comprar dos veces lo mismo', () => {
    const { app: a } = boot();
    a.stars = precioDe(a, 'oceano') * 3;
    a.fn.comprar('oceano');
    const saldo = a.fn.estrellasDisponibles();
    eq(a.fn.comprar('oceano'), false);
    eq(a.fn.estrellasDisponibles(), saldo, 'cobró dos veces el mismo ítem');
  });
  test('El saldo nunca queda negativo', () => {
    const { app: a } = boot();
    // A propósito con menos de lo que cuesta todo: queremos que algunas compras
    // se rechacen y verificar que el saldo nunca cruza el cero.
    a.stars = 1500;
    ['oceano', 'bosque', 'atardecer', 'galaxia', 'perro', 'panda', 'dragon', 'unicornio'].forEach(id => a.fn.comprar(id));
    assert(a.fn.estrellasDisponibles() >= 0, `saldo negativo: ${a.fn.estrellasDisponibles()}`);
  });
  test('Un ítem ya comprado se puede volver a poner sin pagar', () => {
    const { app: a } = boot();
    a.stars = 99999;
    a.fn.comprar('oceano'); a.fn.comprar('bosque');
    const saldo = a.fn.estrellasDisponibles();
    a.fn.aplicar('oceano');
    eq(a.temaActivo, 'oceano');
    eq(a.fn.estrellasDisponibles(), saldo, 'cobró por cambiar a algo ya comprado');
  });
  test('El tema aplicado cambia las variables CSS del teclado', () => {
    const { app: a, doc } = boot();
    a.stars = 99999; a.fn.comprar('bosque');
    const v = doc.documentElement.style.getPropertyValue('--tecla-blanca');
    eq(v.trim(), a.TEMAS.find(t => t.id === 'bosque').blanca);
  });
  test('Las teclas usan las variables CSS del tema', () => {
    assert(/\.wk\{[^}]*background:var\(--tecla-blanca/.test(srcC), 'las blancas no usan la variable');
    assert(/\.bk\{[^}]*background:var\(--tecla-negra/.test(srcC), 'las negras no usan la variable');
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
  test('Las tonalidades bemoles muestran también su nombre en sostenido', () => {
    app.fn.renderCoF();
    const txt = doc.getElementById('cof-svg').textContent;
    [['Lab', 'Sol#'], ['Mib', 'Re#'], ['Sib', 'La#']].forEach(([bemol, sost]) => {
      assert(txt.includes(bemol), `falta ${bemol}`);
      assert(txt.includes(sost), `falta el nombre alterno ${sost}: el chico no encuentra la tecla`);
    });
  });
  test('El nombre alterno coincide con la tecla que se resalta', () => {
    // Ab suena en G#4: el nombre que mostramos tiene que ser el de esa tecla.
    const PC = { 'C#': 1, 'D#': 3, 'F#': 6, 'G#': 8, 'A#': 10 };
    const ES = { 'C#': 'Do#', 'D#': 'Re#', 'F#': 'Fa#', 'G#': 'Sol#', 'A#': 'La#' };
    [['Ab', 'G#4'], ['Eb', 'D#4'], ['Bb', 'A#4']].forEach(([cof, tecla]) => {
      const base = tecla.replace(/\d/, '');
      eq(app.fn.cofAlterno(cof), ES[base], `${cof} suena en ${tecla} pero el nombre alterno no coincide`);
    });
  });
  test('Las tonalidades sin enarmonía no muestran nombre doble', () => {
    ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'F#', 'C#'].forEach(n =>
      eq(app.fn.cofAlterno(n), null, `${n} no debería tener nombre alterno`));
  });
  test('La explicación aclara que una tecla puede tener dos nombres', () => {
    const t = doc.querySelector('.cof-texto').textContent;
    assert(/dos nombres/i.test(t), 'no se explica el concepto de enarmonía');
    assert(/Lab/.test(t) && /Sol#/.test(t), 'no se da el ejemplo concreto');
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
  test('La mascota existe y muestra el avatar elegido', () => {
    const m = doc.getElementById('mascota-izq');
    assert(m, 'falta la mascota');
    eq(m.querySelector('.cuerpo').textContent, app.AVATARES[0].emoji);
  });
  test('Cambiar de avatar cambia la mascota', () => {
    const { app: a, doc: d } = boot();
    a.stars = 99999; a.fn.comprar('dragon');
    eq(d.getElementById('mascota-izq').querySelector('.cuerpo').textContent, '🐲');
    eq(d.body.dataset.avatar, 'dragon');
  });
  test('La mascota es decorativa: no recibe clicks ni lee el lector de pantalla', () => {
    assert(/\.mascota\{[^}]*pointer-events:none/.test(srcC), 'la mascota intercepta clicks');
    assert(doc.getElementById('mascota-izq').getAttribute('aria-hidden') === 'true');
  });
  test('Cada animal tiene su forma de moverse', () => {
    ['gato', 'perro', 'panda'].forEach(a =>
      assert(new RegExp(`data-avatar="${a}"`).test(srcC), `${a} sin animación propia`));
    assert(/data-avatar="dragon"\]\.mascota\{animation:volar/.test(srcC), 'el dragón no vuela');
    assert(/data-avatar="unicornio"\]\.mascota\{animation:vagar/.test(srcC), 'el unicornio no deambula');
  });
  test('Sólo el unicornio deja rastro de arcoíris', () => {
    assert(/data-avatar="unicornio"\]\.mascota\.rastro\{opacity:0?\.7/.test(srcC),
      'el unicornio no muestra el rastro');
    // Ojo con `opacity:0` a secas: tambien matchearia `opacity:0.7`. Pedimos el
    // punto y coma para asegurarnos de que la regla base sea invisible.
    assert(/\.mascota\.rastro\{[^}]*opacity:0;/.test(srcC),
      'el rastro se ve en todos los avatares, no solo en el unicornio');
  });
  test('Tocar una nota hace que la mascota se siente a mirar', () => {
    const { app: a, doc: d } = boot();
    const k = d.querySelector('#piano-libre .wk');
    const ev = new d.defaultView.Event('pointerdown', { bubbles: true, cancelable: true });
    Object.assign(ev, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
    k.dispatchEvent(ev);
    assert(d.body.classList.contains('tocando'), 'la mascota sigue paseando mientras el chico toca');
  });
  test('Sentada, la mascota frena el recorrido y respira', () => {
    assert(/body\.tocando\.mascota\{animation-play-state:paused/.test(srcC));
    assert(/body\.tocando\.mascota\.cuerpo\{animation:mirando/.test(srcC));
  });
  test('La mascota se esconde en pantallas angostas y con reduce-motion', () => {
    assert(/max-width:900px\)\{\.mascota\{display:none/.test(srcC), 'taparía el teclado en el celular');
    assert(/prefers-reduced-motion:reduce\)\{\.mascota[^}]*animation:none/.test(srcC),
      'no respeta la preferencia de movimiento reducido');
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
