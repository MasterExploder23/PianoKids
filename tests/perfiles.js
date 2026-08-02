// Suite de perfiles y copia de seguridad (v1.7).
// Uso:  node tests/perfiles.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT } = require('./harness');

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ═══════════════════════════════════════════════════════════
// Arranque
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Un usuario nuevo arranca con un perfil', () => {
    eq(app.perfiles.length, 1);
    assert(app.perfilActivo, 'no quedó ningún perfil activo');
  });
  test('El perfil tiene id, nombre y avatar', () => {
    const p = app.perfilCorriente ? app.perfilCorriente() : app.fn.perfilCorriente();
    assert(p.id && p.nombre && p.avatar, 'perfil incompleto');
  });
  test('El índice de perfiles se guarda aparte del progreso', () => {
    assert(app.PKEY !== app.SKEY, 'el índice pisa la clave de progreso');
  });
  test('Cada perfil guarda en su propia clave', () => {
    const c = app.fn.claveDe('abc');
    assert(c.startsWith(app.SKEY) && c !== app.SKEY, `clave sospechosa: ${c}`);
    assert(app.fn.claveDe('x') !== app.fn.claveDe('y'), 'dos perfiles comparten clave');
  });
  test('El tope de perfiles es 4', () => eq(app.MAX_PERFILES, 4));
}

// ═══════════════════════════════════════════════════════════
// Migración del progreso de v1.6
// ═══════════════════════════════════════════════════════════
{
  test('El progreso anterior a los perfiles no se pierde', () => {
    const { app, w } = boot({
      storage: {
        pianokids_progress_v1: { stars: 123, notesPlayed: 456, lessonsCompleted: 7 },
      },
    });
    app.fn.iniciarPerfiles();
    app.fn.loadProgress();
    eq(app.stars, 123, 'se perdieron las estrellas al migrar a perfiles');
    eq(app.notesPlayed, 456);
    const id = app.perfiles[0].id;
    assert(w.localStorage.getItem(app.fn.claveDe(id)), 'no se copió al primer perfil');
  });
  test('La migración no corre dos veces ni pisa datos', () => {
    const { app } = boot({
      storage: {
        pianokids_perfiles_v1: { activo: 'p1', perfiles: [{ id: 'p1', nombre: 'Ana', avatar: '🐱' }] },
        'pianokids_progress_v1__p1': { stars: 999 },
        pianokids_progress_v1: { stars: 5 },
      },
    });
    app.fn.iniciarPerfiles();
    app.fn.loadProgress();
    eq(app.stars, 999, 'la migración pisó el progreso del perfil existente');
    eq(app.perfiles.length, 1);
    eq(app.perfiles[0].nombre, 'Ana');
  });
}

// ═══════════════════════════════════════════════════════════
// Aislamiento entre perfiles (lo que E4 vino a resolver)
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();

  test('Se pueden crear hasta 4 perfiles', () => {
    app.fn.crearPerfil('Hermano', '🐶');
    app.fn.crearPerfil('Prima', '🐼');
    app.fn.crearPerfil('Amigo', '🐲');
    eq(app.perfiles.length, 4);
  });
  test('El quinto perfil se rechaza', () => {
    eq(app.fn.crearPerfil('Sobra', '🦄'), null);
    eq(app.perfiles.length, 4);
  });
  test('Los ids de perfil son únicos', () => {
    eq(new Set(app.perfiles.map(p => p.id)).size, app.perfiles.length);
  });
  test('El nombre se recorta a 14 caracteres', () => {
    const { app: a } = boot();
    const p = a.fn.crearPerfil('UnNombreRealmenteLarguisimo', '🐰');
    assert(p.nombre.length <= 14, `quedó en ${p.nombre.length} caracteres`);
  });

  test('El progreso de un perfil NO se filtra al otro', () => {
    const { app: a } = boot();
    a.stars = 300; a.notesPlayed = 900;
    a.modProgress['notas/n1'] = { stars: 3 };
    a.fn.saveProgressAhora();

    const hermano = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(hermano.id);

    eq(a.stars, 0, 'el hermano heredó las estrellas');
    eq(a.notesPlayed, 0, 'el hermano heredó las notas tocadas');
    eq(Object.keys(a.modProgress).length, 0, 'el hermano heredó las lecciones');
    eq(a.dayStreak, 0, 'el hermano heredó la racha');
  });
  test('Volver al primer perfil recupera su progreso intacto', () => {
    const { app: a } = boot();
    const primero = a.perfilActivo;
    a.stars = 300; a.notesPlayed = 900;
    a.modProgress['notas/n1'] = { stars: 3 };
    a.fn.saveProgressAhora();

    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    a.stars = 10; a.fn.saveProgressAhora();

    a.fn.cambiarPerfil(primero);
    eq(a.stars, 300, 'se perdió el progreso al volver');
    eq(a.notesPlayed, 900);
    eq(a.fn.lecEstrellas('notas', 'n1'), 3, 'se perdieron las lecciones');
  });
  test('Los logros no se filtran entre perfiles', () => {
    const { app: a } = boot();
    a.ACHS[0].ok = true; a.ACHS[1].ok = true;
    a.fn.saveProgressAhora();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    eq(a.ACHS.filter(x => x.ok).length, 0, 'el hermano heredó los logros');
  });
  test('La tienda no se filtra entre perfiles', () => {
    const { app: a } = boot();
    a.stars = 500; a.fn.comprar('galaxia'); a.fn.saveProgressAhora();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    assert(!a.comprados.includes('galaxia'), 'el hermano heredó las compras');
    eq(a.temaActivo, 'clasico');
  });
  test('Las misiones del día no se filtran entre perfiles', () => {
    const { app: a } = boot();
    a.fn.avanzarMision('notas', 15); a.fn.saveProgressAhora();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    eq(a.misionEstado.progreso.notas || 0, 0, 'el hermano heredó el progreso de misiones');
  });
  test('Cambiar a un perfil inexistente no hace nada', () => {
    const { app: a } = boot();
    eq(a.fn.cambiarPerfil('no-existe'), false);
  });
  test('Cambiar al perfil que ya está activo no hace nada', () => {
    const { app: a } = boot();
    eq(a.fn.cambiarPerfil(a.perfilActivo), false);
  });
  test('Guardar antes de cambiar: no se pierde lo último', () => {
    assert(/function cambiarPerfil[\s\S]{0,200}saveProgressAhora\(\)/.test(src),
      'cambiarPerfil no guarda antes de cambiar');
  });
  test('saveProgress usa la clave del perfil activo, no la fija', () => {
    assert(!/localStorage\.setItem\(SKEY,JSON/.test(src), 'sigue guardando en la clave única');
    assert(/localStorage\.setItem\(claveActual\(\)/.test(src), 'no usa claveActual()');
  });
}

// ═══════════════════════════════════════════════════════════
// Borrar y renombrar
// ═══════════════════════════════════════════════════════════
{
  test('Borrar un perfil elimina también sus datos', () => {
    const { app: a, w } = boot();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    a.stars = 50; a.fn.saveProgressAhora();
    const clave = a.fn.claveDe(h.id);
    assert(w.localStorage.getItem(clave), 'no se guardó nada para borrar');
    a.fn.borrarPerfil(h.id);
    eq(w.localStorage.getItem(clave), null, 'quedaron datos huérfanos en localStorage');
  });
  test('No se puede borrar el último perfil', () => {
    const { app: a } = boot();
    eq(a.fn.borrarPerfil(a.perfilActivo), false);
    eq(a.perfiles.length, 1);
  });
  test('Borrar el perfil activo cambia a otro', () => {
    const { app: a } = boot();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    a.fn.borrarPerfil(h.id);
    assert(a.perfilActivo !== h.id, 'quedó activo un perfil borrado');
    assert(a.fn.perfilPorId(a.perfilActivo), 'el perfil activo no existe');
  });
  test('Renombrar funciona y persiste', () => {
    const { app: a } = boot();
    a.fn.renombrarPerfil(a.perfilActivo, 'Joaquín');
    eq(a.fn.perfilCorriente().nombre, 'Joaquín');
  });
}

// ═══════════════════════════════════════════════════════════
// Copia de seguridad
// ═══════════════════════════════════════════════════════════
{
  test('El backup incluye todos los perfiles y sus datos', () => {
    const { app: a } = boot();
    a.stars = 111; a.fn.saveProgressAhora();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    a.stars = 222; a.fn.saveProgressAhora();

    const b = a.fn.armarBackup();
    eq(b.app, 'PianoKids');
    eq(b.perfiles.length, 2);
    eq(Object.keys(b.datos).length, 2, 'faltan datos de algún perfil');
    assert(b.fecha, 'sin fecha');
  });

  test('Un backup ajeno se rechaza', () => {
    const { app: a } = boot();
    assert(a.fn.validarBackup({ app: 'OtraApp', version: 1, perfiles: [], datos: {} }));
    assert(a.fn.validarBackup(null));
    assert(a.fn.validarBackup({}));
  });
  test('Un backup de una versión más nueva se rechaza', () => {
    const { app: a } = boot();
    const err = a.fn.validarBackup({ app: 'PianoKids', version: 99, perfiles: [{ id: 'x' }], datos: {} });
    assert(err && /versión/.test(err), `mensaje poco claro: ${err}`);
  });
  test('Un backup sin perfiles se rechaza', () => {
    const { app: a } = boot();
    assert(a.fn.validarBackup({ app: 'PianoKids', version: 1, perfiles: [], datos: {} }));
  });
  test('Un backup válido pasa la validación', () => {
    const { app: a } = boot();
    a.fn.saveProgressAhora();
    eq(a.fn.validarBackup(a.fn.armarBackup()), null);
  });

  test('Roundtrip: exportar, romper todo y restaurar', () => {
    const { app: a } = boot();
    a.stars = 777; a.notesPlayed = 1234;
    a.modProgress['notas/n1'] = { stars: 3 };
    a.fn.saveProgressAhora();
    const h = a.fn.crearPerfil('Hermano', '🐶');
    a.fn.cambiarPerfil(h.id);
    a.stars = 88; a.fn.saveProgressAhora();
    const backup = JSON.parse(JSON.stringify(a.fn.armarBackup()));

    // simulamos que se borró todo
    a.fn.borrarPerfil(h.id);
    a.fn.resetEstado(); a.fn.saveProgressAhora();

    const r = a.fn.aplicarBackup(backup);
    assert(r.ok, `falló la restauración: ${r.msg}`);
    eq(a.perfiles.length, 2, 'no volvieron los 2 perfiles');
    eq(a.stars, 88, 'no se restauró el perfil activo del backup');
    a.fn.cambiarPerfil(backup.perfiles[0].id);
    eq(a.stars, 777, 'no se restauró el progreso del primer perfil');
    eq(a.fn.lecEstrellas('notas', 'n1'), 3, 'no se restauraron las lecciones');
  });
  test('Restaurar un backup inválido no rompe el estado actual', () => {
    const { app: a } = boot();
    a.stars = 500; a.fn.saveProgressAhora();
    const r = a.fn.aplicarBackup({ app: 'Otra', version: 1 });
    eq(r.ok, false);
    eq(a.stars, 500, 'un backup inválido pisó el progreso');
    eq(a.perfiles.length, 1);
  });
  test('El backup se limita al máximo de perfiles', () => {
    const { app: a } = boot();
    const muchos = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, nombre: 'P' + i, avatar: '🐱' }));
    a.fn.aplicarBackup({ app: 'PianoKids', version: 1, perfiles: muchos, datos: {}, activo: 'x0' });
    assert(a.perfiles.length <= a.MAX_PERFILES, `quedaron ${a.perfiles.length} perfiles`);
  });
  test('El nombre del archivo lleva la fecha', () => {
    assert(/pianokids-backup-'\+todayKey\(\)/.test(src), 'el backup no lleva fecha en el nombre');
  });
  test('Importar pide confirmación antes de pisar todo', () => {
    assert(/importarArchivo[\s\S]{0,600}confirm\(/.test(src),
      'restaura sin confirmar: se puede perder todo por un click');
  });
}

// ═══════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════
{
  const { app, doc } = boot();
  app.fn.renderPerfiles();

  test('Se lista el perfil activo', () => {
    eq(doc.querySelectorAll('#perfiles-lista .perfil').length, 1);
    eq(doc.querySelectorAll('#perfiles-lista .perfil.activo').length, 1);
  });
  test('Hay botón para agregar perfil mientras haya lugar', () => {
    assert(doc.querySelector('#perfiles-lista .perfil-add'), 'falta el botón de agregar');
  });
  test('Con 4 perfiles ya no se ofrece agregar', () => {
    const { app: a, doc: d } = boot();
    a.fn.crearPerfil('B'); a.fn.crearPerfil('C'); a.fn.crearPerfil('D');
    a.fn.renderPerfiles();
    eq(d.querySelectorAll('#perfiles-lista .perfil').length, 4);
    eq(d.querySelector('#perfiles-lista .perfil-add'), null);
  });
  test('El único perfil no muestra botón de borrar', () => {
    eq(doc.querySelector('#perfiles-lista .perfil-btn.del'), null);
  });
  test('El chip del encabezado muestra el perfil en uso', () => {
    const chip = doc.getElementById('sc-perfil');
    assert(chip, 'falta el chip de perfil');
    assert(chip.textContent.includes(app.fn.perfilCorriente().nombre), `dice "${chip.textContent}"`);
  });
  test('Hay controles de backup en el panel de padres', () => {
    assert(/descargarBackup\(\)/.test(src) && /importarArchivo\(this\)/.test(src));
    assert(doc.getElementById('backup-file'), 'falta el input de archivo');
  });
  test('Se le avisa al padre que el progreso es solo local', () => {
    assert(/solo en este dispositivo/i.test(src),
      'no se advierte que el progreso no sincroniza entre dispositivos');
  });
  test('Un nombre con comillas no rompe el HTML', () => {
    const { app: a, doc: d } = boot();
    a.fn.renombrarPerfil(a.perfilActivo, 'Ana "La" Pi');
    a.fn.renderPerfiles();
    const input = d.querySelector('#perfiles-lista .perfil-nombre');
    eq(input.value, 'Ana "La" Pi', 'el nombre con comillas se rompió');
  });
}

process.exit(report('PianoKids v1.7 — perfiles y copia de seguridad') === 0 ? 0 : 1);
