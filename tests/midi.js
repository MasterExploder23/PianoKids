// Suite de teclado MIDI (v1.4).
// Uso:  node tests/midi.js
const fs = require('fs');
const path = require('path');
const { boot, test, assert, eq, report, ROOT, src, srcC } = require('./harness');

const esperar = () => new Promise(r => setTimeout(r, 0));

// ═══════════════════════════════════════════════════════════
// Conversión de número MIDI a nota
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const m = app.fn.midiANota;

  test('El do central es el 60 (referencia de todo el estándar MIDI)', () => eq(m(60), 'C4'));
  test('Mapea correctamente el resto de la octava central', () => {
    eq([61, 62, 63, 64, 65].map(m), ['C#4', 'D4', 'D#4', 'E4', 'F4']);
    eq([66, 67, 68, 69, 70, 71].map(m), ['F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4']);
  });
  test('Cambia de octava en el do, no en el la', () => {
    eq(m(59), 'B3'); eq(m(60), 'C4'); eq(m(71), 'B4'); eq(m(72), 'C5');
  });
  test('Cubre los extremos del teclado en pantalla', () => {
    eq(m(48), 'C3'); eq(m(84), 'C6');
  });
  test('Rechaza números fuera del rango MIDI', () => {
    eq(m(-1), null); eq(m(128), null);
  });
  test('Toda nota generada existe en el mapa del pentagrama', () => {
    for (let n = 48; n <= 84; n++) {
      assert(app.STAFF_Y[m(n)] !== undefined, `${m(n)} (MIDI ${n}) no tiene posición`);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Transposición: cualquier teclado tiene que servir
// ═══════════════════════════════════════════════════════════
{
  const { app } = boot();
  const r = app.fn.midiAlRango, m = app.fn.midiANota;

  test('Las notas dentro del rango no se tocan', () => {
    eq(r(60), 60); eq(r(48), 48); eq(r(84), 84);
  });
  // La transposición es la mínima que entra en el rango: C2 sube a C3, no a C4.
  test('Las notas graves de un piano de 88 teclas suben por octavas', () => {
    eq(m(r(21)), 'A3', 'el la más grave de un piano debería sonar como La3');
    eq(m(r(36)), 'C3', 'C2 debería subir sólo hasta C3');
    eq(m(r(24)), 'C3', 'C1 debería subir hasta C3');
  });
  test('Las notas agudas bajan por octavas', () => {
    eq(m(r(108)), 'C6', 'el do más agudo debería bajar a C6');
    eq(m(r(96)), 'C6');
  });
  test('La transposición siempre conserva la nota, solo cambia la octava', () => {
    for (let n = 21; n <= 108; n++) {
      const t = r(n);
      assert(t !== null, `MIDI ${n} quedó sin mapear`);
      eq(t % 12, n % 12, `MIDI ${n} cambió de nota al transportarse`);
      assert(t >= 48 && t <= 84, `MIDI ${n} quedó fuera de rango tras transponer`);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Mensajes MIDI reales contra la app
// ═══════════════════════════════════════════════════════════
(async () => {
  {
    const { app, doc, midi } = boot({ midi: true });
    await app.fn.midiIniciar(); await esperar();

    test('Un Note On toca la nota', () => {
      midi.noteOn(60, 100);
      eq(app.notesPlayed, 1);
      assert(app.pressedKeys.has('C4'), 'C4 no quedó registrada');
    });
    test('Un Note On resalta la tecla en pantalla', () => {
      assert(doc.getElementById('k-piano-libre-C4').classList.contains('pressed'),
        'la tecla no se pintó');
    });
    test('Un Note Off suelta la nota', () => {
      midi.noteOff(60);
      eq(app.pressedKeys.size, 0);
      assert(!doc.getElementById('k-piano-libre-C4').classList.contains('pressed'));
    });
    test('Note On con velocity 0 cuenta como Note Off (convención MIDI)', () => {
      midi.noteOn(62, 90);
      assert(app.pressedKeys.has('D4'));
      midi.enviar([0x90, 62, 0]);
      eq(app.pressedKeys.size, 0, 'velocity 0 debe soltar, no trabar la tecla');
    });
    test('Se pueden tocar acordes (varias notas a la vez)', () => {
      midi.noteOn(60); midi.noteOn(64); midi.noteOn(67);
      eq(app.pressedKeys.size, 3, 'no soporta polifonía');
      [60, 64, 67].forEach(n => midi.noteOff(n));
      eq(app.pressedKeys.size, 0);
    });
    test('Los mensajes que no son notas se ignoran', () => {
      const antes = app.notesPlayed;
      midi.enviar([0xB0, 64, 127]); // pedal de sustain
      midi.enviar([0xE0, 0, 64]);   // pitch bend
      midi.enviar([0xF8]);          // clock
      eq(app.notesPlayed, antes, 'un mensaje de control disparó una nota');
    });
    test('Una tecla fuera de rango suena transportada, no se pierde', () => {
      const antes = app.notesPlayed;
      midi.noteOn(24); // C1, muy por debajo del teclado en pantalla
      eq(app.notesPlayed, antes + 1, 'la nota grave se perdió');
      assert(app.pressedKeys.has('C3'), 'no se transportó a C3, la nota más grave del teclado');
      midi.noteOff(24);
    });
    test('El logro de teclado real se desbloquea', () => {
      assert(app.ACHS[app.ACH_MIDI].ok, 'no se desbloqueó el logro');
    });
    test('El logro MIDI no pisa el de "Cambió el sonido"', () => {
      eq(app.ACHS[app.ACH_MIDI].n, 'Teclado real');
      eq(app.ACHS[8].n, 'Cambió el sonido');
    });
  }

  // ── Ruteo al piano visible ────────────────────────────────
  {
    const { app, doc, midi, wire } = boot({ midi: true });
    await app.fn.midiIniciar(); await esperar();

    test('Con el piano libre a la vista, rutea a piano-libre', () => {
      eq(app.fn.pianoActivo(), 'piano-libre');
    });
    test('Al abrir Canciones, el teclado MIDI toca en ese piano', () => {
      wire();
      const btn = [...doc.querySelectorAll('.nav-btn')].find(b => /Canciones/.test(b.textContent));
      btn.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
      eq(app.fn.pianoActivo(), 'piano-songs');
      midi.noteOn(60);
      assert(doc.getElementById('k-piano-songs-C4').classList.contains('pressed'),
        'la nota no llegó al piano de canciones');
      midi.noteOff(60);
    });
    test('Al abrir Pentagrama, el MIDI dibuja la nota', () => {
      wire();
      const btn = [...doc.querySelectorAll('.nav-btn')].find(b => /Pentagrama/.test(b.textContent));
      btn.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
      midi.noteOn(48); // C3
      const nota = doc.getElementById('staff-current').querySelector('ellipse');
      assert(nota, 'no se dibujó la nota en el pentagrama');
      eq(+nota.getAttribute('cy'), 152, 'C3 por MIDI cayó en la altura equivocada');
      midi.noteOff(48);
    });
  }

  // ── Conexión y desconexión ────────────────────────────────
  {
    const { app, doc, midi } = boot({ midi: true, midiName: 'Yamaha P-45' });
    await app.fn.midiIniciar(); await esperar();

    test('El chip muestra el nombre del teclado conectado', () => {
      const chip = doc.getElementById('midi-chip');
      assert(chip.style.display !== 'none', 'el chip quedó oculto con un teclado conectado');
      assert(/Yamaha P-45/.test(chip.textContent), `el chip dice "${chip.textContent}"`);
    });
    test('Al desconectar, se sueltan las notas y se oculta el chip', () => {
      midi.noteOn(60);
      assert(app.pressedKeys.size === 1);
      midi.desconectar();
      eq(app.pressedKeys.size, 0, 'quedó una nota sonando tras desconectar el teclado');
      eq(doc.getElementById('midi-chip').style.display, 'none');
    });
  }

  // ── Sin soporte ni teclado ────────────────────────────────
  {
    const { app, doc } = boot({ midi: false });
    test('Sin Web MIDI (Safari/iOS) la app no rompe', async () => {});
    const ok = await app.fn.midiIniciar();
    test('midiIniciar devuelve false y no lanza excepción', () => eq(ok, false));
    test('El chip MIDI queda oculto', () => eq(doc.getElementById('midi-chip').style.display, 'none'));
    test('El teclado en pantalla sigue funcionando', () => {
      const k = doc.querySelector('#piano-libre .wk');
      const ev = new doc.defaultView.Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(ev, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
      k.dispatchEvent(ev);
      eq(app.notesPlayed, 1, 'sin MIDI el teclado en pantalla dejó de andar');
    });
  }

  {
    const { app, doc } = boot({ midi: true, midiInputs: 0 });
    await app.fn.midiIniciar(); await esperar();
    test('Con Web MIDI pero sin teclado enchufado, el chip no aparece', () => {
      eq(doc.getElementById('midi-chip').style.display, 'none');
    });
    test('No se desbloquea el logro sin teclado', () => {
      assert(!app.ACHS[app.ACH_MIDI].ok);
    });
  }

  // ── Dinámica ──────────────────────────────────────────────
  {
    test('pianoPlay acepta velocity y la pasa al sintetizador', () => {
      assert(/functionpianoPlay\(note,el,pid,vel\)/.test(srcC), 'pianoPlay no recibe velocity');
      assert(/triggerAttack\(note,undefined,v\)/.test(srcC), 'la velocity no llega al synth');
    });
    test('La velocity se acota para que ninguna nota quede inaudible', () => {
      assert(/Math\.max\(0?\.15,Math\.min\(1,vel\)\)/.test(srcC), 'falta el clamp de velocity');
    });
    test('Sin MIDI se usa un valor fijo (mouse y teclas no tienen dinámica)', () => {
      assert(/:0?\.8;/.test(srcC), 'falta el valor por defecto de velocity');
    });
  }

  test('Se pide acceso MIDI sin sysex (no hace falta y evita permisos extra)', () => {
    assert(/requestMIDIAccess\(\{sysex:false\}\)/.test(srcC));
  });

  process.exit(report('PianoKids v1.4 — teclado MIDI') === 0 ? 0 : 1);
})();
