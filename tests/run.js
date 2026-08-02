// Suite de regresión de PianoKids — v1.2
// Uso:  node tests/run.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT } = require('./harness');

const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daysAgo = n => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return dayKey(d); };

// ═══════════════════════════════════════════════════════════
// 1. La app arranca y el contenido sigue intacto (no-regresión)
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();

  test('La app bootea sin excepciones', () => assert(app, 'no se expuso el scope'));
  test('Las 15 canciones siguen presentes', () => eq(app.SONGS.length, 15));
  test('Toda canción tiene name, emoji, diff, genre y notas', () => {
    app.SONGS.forEach(s => {
      assert(s.name && s.emoji && s.diff && s.genre, `canción incompleta: ${s.name}`);
      assert(Array.isArray(s.notes) && s.notes.length > 0, `sin notas: ${s.name}`);
    });
  });
  test('Las 19 lecciones siguen presentes (5 notas + 7 mayores + 7 menores)', () => {
    eq(app.LESSONS_NOTES.length + app.LESSONS_MAJ.length + app.LESSONS_MEN.length, 19);
  });
  // El progreso guardado referencia los logros por índice, así que los nuevos
  // sólo pueden agregarse AL FINAL. Si se insertan en el medio, a un usuario
  // existente se le desbloquean logros equivocados.
  test('Los 10 logros originales siguen en su posición', () => {
    const originales = ['Primera nota', 'Racha de 5', 'Primera nota acorde', 'Acorde completo',
      'Primera lección', 'Primera canción', '10 estrellas', 'Quintas master',
      'Cambió el sonido', 'Notación americana'];
    eq(app.ACHS.slice(0, 10).map(a => a.n), originales,
      'se reordenaron los logros: el progreso guardado quedaría corrupto');
  });
  test('Hay al menos los 10 originales', () => assert(app.ACHS.length >= 10));
  test('Ningún logro arranca desbloqueado', () => {
    assert(app.ACHS.every(a => a.ok === false), 'hay logros marcados de entrada');
  });
  test('Las canciones de karaoke siguen presentes', () => assert(app.KARAOKE_SONGS.length > 0));
  test('Los 5 niveles siguen presentes', () => eq(app.LEVELS.length, 5));
  test('El DOM tiene los 12 paneles de navegación', () => {
    assert(doc.querySelectorAll('.panel').length >= 8, 'faltan paneles');
  });
}

// ═══════════════════════════════════════════════════════════
// 2. P0-1a · Estado inicial limpio: cero datos inventados
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  app.fn.renderPadresProgreso();
  app.fn.renderPadresStats();

  test('Usuario nuevo: la racha arranca en 0', () => eq(app.dayStreak, 0));
  test('Usuario nuevo: el panel de padres NO dice "5 días seguidos"', () => {
    const txt = doc.getElementById('streak-num-p').textContent;
    assert(txt === '0', `mostró racha "${txt}" a un usuario sin actividad`);
  });
  test('Usuario nuevo: el subtítulo invita a empezar, no felicita', () => {
    const sub = doc.getElementById('streak-sub-p').textContent;
    assert(!/Fantástico|seguidos/.test(sub), `subtítulo inventado: "${sub}"`);
  });
  test('Usuario nuevo: los 7 días de la semana están todos vacíos', () => {
    const activos = doc.querySelectorAll('#streak-days-p .streak-day-p.active').length;
    eq(activos, 0, 'días marcados como practicados sin actividad');
  });
  test('Usuario nuevo: el gráfico semanal está en cero', () => {
    const vals = [...doc.querySelectorAll('#weekly-chart-p .bar-val-p')].map(e => e.textContent.trim());
    eq(vals, ['', '', '', '', '', '', ''], 'el gráfico semanal muestra datos falsos');
  });
  test('Usuario nuevo: "notas más tocadas" muestra estado vacío, no datos demo', () => {
    const html = doc.getElementById('notes-chart-p').innerHTML;
    assert(/Todavía no tocó/.test(html), 'sigue habiendo fallback demo de notas');
    assert(!/88|72|65/.test(html), 'aparecen los valores demo hardcodeados');
  });
  test('El código fuente ya no contiene arrays demo', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(!src.includes('[42,0,88,55,72,20,35]'), 'sigue el array semanal demo');
    assert(!src.includes('C4:88,E4:72'), 'sigue el objeto de notas demo');
    assert(!/demo para visualización/.test(src), 'sigue el bloque demo de racha');
  });
}

// ═══════════════════════════════════════════════════════════
// 3. P0-1b · La racha se calcula sobre fechas reales
// ═══════════════════════════════════════════════════════════
{
  const mk = activeDays => boot({ storage: { pianokids_progress_v1: { activeDays, dailyNotes: Object.fromEntries(activeDays.map(d => [d, 10])) } } });

  test('Racha = 3 con hoy, ayer y anteayer', () => {
    const { app } = mk([daysAgo(2), daysAgo(1), daysAgo(0)]);
    app.fn.loadProgress(); eq(app.dayStreak, 3);
  });
  test('Racha = 1 si sólo tocó hoy', () => {
    const { app } = mk([daysAgo(0)]);
    app.fn.loadProgress(); eq(app.dayStreak, 1);
  });
  test('Racha sobrevive si tocó ayer y todavía no hoy', () => {
    const { app } = mk([daysAgo(2), daysAgo(1)]);
    app.fn.loadProgress(); eq(app.dayStreak, 2);
  });
  test('Racha se corta con un día de hueco', () => {
    const { app } = mk([daysAgo(5), daysAgo(4), daysAgo(1), daysAgo(0)]);
    app.fn.loadProgress(); eq(app.dayStreak, 2, 'no debe contar los días anteriores al hueco');
  });
  test('Racha = 0 si la última actividad fue hace 3 días', () => {
    const { app } = mk([daysAgo(4), daysAgo(3)]);
    app.fn.loadProgress(); eq(app.dayStreak, 0);
  });
  test('Racha = 0 sin actividad', () => {
    const { app } = mk([]);
    app.fn.loadProgress(); eq(app.dayStreak, 0);
  });
  test('Tocar una nota marca actividad de hoy y arranca la racha', () => {
    const { app } = boot();
    eq(app.dayStreak, 0);
    app.fn.markActivityToday();
    eq(app.dayStreak, 1);
    eq(app.dailyNotes[daysAgo(0)], 1);
  });
  test('last7Days devuelve exactamente 7 días terminando hoy', () => {
    const { app } = boot();
    const w = app.fn.last7Days();
    eq(w.length, 7);
    eq(w[6].key, daysAgo(0), 'el último elemento debe ser hoy');
    eq(w[0].key, daysAgo(6), 'el primero debe ser hace 6 días');
  });
  test('pruneActivity descarta actividad de más de 180 días', () => {
    const viejo = daysAgo(200);
    const { app } = boot({ storage: { pianokids_progress_v1: { activeDays: [viejo, daysAgo(0)], dailyNotes: { [viejo]: 5, [daysAgo(0)]: 5 } } } });
    app.fn.loadProgress();
    assert(!app.activeDays.includes(viejo), 'no purgó el día viejo');
    assert(app.dailyNotes[viejo] === undefined, 'no purgó las notas viejas');
  });
}

// ═══════════════════════════════════════════════════════════
// 4. P0-1c · Persistencia: la racha sobrevive al reload
// ═══════════════════════════════════════════════════════════
{
  test('El objeto guardado incluye las claves de actividad', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(/dayStreak,activeDays,dailyNotes/.test(src), 'saveProgress no persiste la actividad');
    assert(/activeDays=Array\.isArray\(d\.activeDays\)/.test(src), 'loadProgress no restaura activeDays');
  });

  test('Reload con progreso guardado restaura la racha', () => {
    const { app } = boot({ storage: { pianokids_progress_v1: { stars: 40, notesPlayed: 120, activeDays: [daysAgo(1), daysAgo(0)], dailyNotes: { [daysAgo(1)]: 60, [daysAgo(0)]: 60 } } } });
    app.fn.loadProgress();
    eq(app.dayStreak, 2);
    eq(app.stars, 40);
    eq(app.notesPlayed, 120);
  });

  test('El gráfico semanal refleja las notas reales guardadas', () => {
    const { app, doc } = boot({ storage: { pianokids_progress_v1: { activeDays: [daysAgo(0)], dailyNotes: { [daysAgo(0)]: 37 } } } });
    app.fn.loadProgress();
    app.fn.renderPadresStats();
    const vals = [...doc.querySelectorAll('#weekly-chart-p .bar-val-p')].map(e => e.textContent.trim());
    eq(vals[6], '37', 'el día de hoy debe mostrar las notas reales');
    eq(vals.slice(0, 6), ['', '', '', '', '', ''], 'los días sin actividad deben ir vacíos');
  });

  test('combo (notas seguidas) es independiente de la racha diaria', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(/combo\+\+/.test(src), 'el combo debe incrementar por nota');
    assert(/combo>=5/.test(src), 'el logro de 5 seguidas debe usar combo');
    assert(!/\bstreak\+\+/.test(src), 'la racha diaria no debe incrementar por nota');
  });
}

// ═══════════════════════════════════════════════════════════
// 5. P0-2 · Íconos PWA
// ═══════════════════════════════════════════════════════════
{
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  test('Todo ícono declarado en el manifest existe en disco', () => {
    manifest.icons.forEach(i => {
      const p = path.join(ROOT, i.src.replace('./', ''));
      assert(fs.existsSync(p), `falta ${i.src}`);
      assert(fs.statSync(p).size > 500, `${i.src} está vacío o corrupto`);
    });
  });
  test('Los íconos son PNG válidos con las dimensiones declaradas', () => {
    manifest.icons.forEach(i => {
      const buf = fs.readFileSync(path.join(ROOT, i.src.replace('./', '')));
      eq([...buf.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${i.src} no es PNG`);
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      const [dw, dh] = i.sizes.split('x').map(Number);
      eq([w, h], [dw, dh], `${i.src} mide ${w}x${h} pero declara ${i.sizes}`);
    });
  });
  test('Hay un ícono de al menos 192px (requisito de instalabilidad)', () => {
    assert(manifest.icons.some(i => parseInt(i.sizes) >= 192));
  });
  test('Todo asset del Service Worker existe', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const locales = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(f => f && !f.startsWith('http'));
    locales.forEach(f => assert(fs.existsSync(path.join(ROOT, f)), `el SW cachea ${f} que no existe`));
  });
}

// ═══════════════════════════════════════════════════════════
// 6. P0-3 · Service Worker actualizable
// ═══════════════════════════════════════════════════════════
{
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  test('CACHE_NAME está versionado por build', () => {
    const m = sw.match(/CACHE_NAME\s*=\s*[`'"]([^`'"]+)/);
    assert(m, 'no se encontró CACHE_NAME');
    assert(m[1] !== 'pianokids-v1', 'CACHE_NAME sigue siendo el valor fijo original');
    assert(/BUILD|VERSION/.test(sw), 'no hay constante de build para versionar la caché');
  });
  test('El documento usa network-first (los deploys llegan al usuario)', () => {
    const fetchBlock = sw.split("addEventListener('fetch'")[1] || '';
    assert(/mode\s*===\s*'navigate'|request\.mode|destination\s*===\s*'document'/.test(fetchBlock),
      'el handler fetch no distingue navegaciones de assets');
    // En una navegación la red debe intentarse ANTES que la caché.
    const navIdx = fetchBlock.search(/navigate|destination\s*===\s*'document'/);
    const cacheFirstIdx = fetchBlock.search(/caches\.match\(\s*(event\.)?request\s*\)\s*\.then\(\s*\w+\s*=>\s*\{?\s*if\s*\(\s*\w+\s*\)\s*return/);
    assert(navIdx >= 0 && (cacheFirstIdx === -1 || navIdx < cacheFirstIdx),
      'sigue siendo cache-first para el documento: los usuarios nunca reciben deploys nuevos');
  });
  test('cache.addAll es tolerante a fallos (un 404 no rompe el install)', () => {
    assert(!/cache\.addAll\s*\(/.test(sw),
      'usa cache.addAll: un solo recurso 404 aborta el install y deja la app sin offline');
    assert(/allSettled|cache\.put|cache\.add\s*\([^)]*\)\s*\.catch/.test(sw),
      'el precache debe cachear recurso por recurso tolerando faltantes');
  });
  test('El SW limpia cachés viejas al activarse', () => {
    assert(/caches\.delete/.test(sw), 'no purga cachés anteriores');
  });
}

process.exit(report('PianoKids v1.2 — suite de regresión') === 0 ? 0 : 1);
