// partitura.js — Notación musical real (v2.3)
// ─────────────────────────────────────────────────────────────
// Dibuja una melodía como partitura de verdad: figuras según la duración,
// plicas, corchetes, puntillos y líneas adicionales.
//
// Se dibuja a mano con SVG en vez de traer una librería de notación. VexFlow y
// similares pesan más de 200 kB, más que TODA la app: no tiene sentido para
// dibujar cuatro figuras. Y ya teníamos las dos piezas difíciles resueltas —
// las posiciones del pentagrama (v1.3) y las duraciones (v2.1).

const Partitura = (() => {
  // Misma geometría que el pentagrama en vivo: líneas en 98..50, un escalón
  // diatónico son 6px. Así las dos vistas coinciden.
  const LINEAS = [50, 62, 74, 86, 98];
  const ARRIBA = 50,
    ABAJO = 98,
    GAP = 12;
  const MEDIO = 74; // línea del Si4: por encima la plica va para abajo

  // Qué figura corresponde a cada duración en negras.
  // hueca = cabeza sin rellenar, plica = lleva palito, corchetes = banderitas.
  const FIGURAS = [
    { d: 4, nombre: 'redonda', hueca: true, plica: false, corchetes: 0 },
    { d: 3, nombre: 'blanca con puntillo', hueca: true, plica: true, corchetes: 0, puntillo: true },
    { d: 2, nombre: 'blanca', hueca: true, plica: true, corchetes: 0 },
    { d: 1.5, nombre: 'negra con puntillo', hueca: false, plica: true, corchetes: 0, puntillo: true },
    { d: 1, nombre: 'negra', hueca: false, plica: true, corchetes: 0 },
    { d: 0.75, nombre: 'corchea con puntillo', hueca: false, plica: true, corchetes: 1, puntillo: true },
    { d: 0.5, nombre: 'corchea', hueca: false, plica: true, corchetes: 1 },
    { d: 0.25, nombre: 'semicorchea', hueca: false, plica: true, corchetes: 2 },
  ];
  function figuraDe(d) {
    return FIGURAS.find(f => f.d === d) || FIGURAS.find(f => f.d === 1);
  }

  // Líneas adicionales para las notas que caen fuera del pentagrama.
  function ledgers(y) {
    const out = [];
    if (y > ABAJO) for (let l = ABAJO + GAP; l <= y; l += GAP) out.push(l);
    else if (y < ARRIBA) for (let l = ARRIBA - GAP; l >= y; l -= GAP) out.push(l);
    return out;
  }

  // El ancho de cada nota es proporcional a su duración: así la partitura se
  // "lee" visualmente, que es medio punto de aprender a leer.
  function anchoDe(d) {
    return Math.round(26 + Math.min(d, 4) * 13);
  }

  function dibujarNota(x, y, fig, color, resaltada) {
    const rx = 7.2,
      ry = 5.4;
    const arribaLaPlica = y > MEDIO; // notas graves: plica hacia arriba
    const largoPlica = 30;
    let s = '';

    ledgers(y).forEach(ly => {
      s += `<line x1="${x - 12}" y1="${ly}" x2="${x + 12}" y2="${ly}" stroke="#b0b0c8" stroke-width="1.4"/>`;
    });

    // Cabeza. Las huecas llevan relleno del fondo y borde grueso.
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${y})"
      fill="${fig.hueca ? '#ffffff' : color}" stroke="${color}" stroke-width="${fig.hueca ? 2.2 : 1}"/>`;

    if (fig.plica) {
      const x1 = arribaLaPlica ? x + rx - 0.6 : x - rx + 0.6;
      const y2 = arribaLaPlica ? y - largoPlica : y + largoPlica;
      s += `<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y2}" stroke="${color}" stroke-width="1.8"/>`;
      for (let c = 0; c < fig.corchetes; c++) {
        const yc = y2 + (arribaLaPlica ? c * 6 : -c * 6);
        const dir = arribaLaPlica ? 1 : -1;
        s += `<path d="M ${x1} ${yc} q 9 ${3 * dir} 8 ${11 * dir} q -3 ${-6 * dir} -8 ${-7 * dir} z"
          fill="${color}"/>`;
      }
    }
    if (fig.puntillo) {
      s += `<circle cx="${x + rx + 6}" cy="${y - (Math.round(y) % 12 === 2 ? 6 : 0)}" r="2.1" fill="${color}"/>`;
    }
    if (resaltada) {
      s += `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#fb8c00" stroke-width="2.5" opacity=".9"/>`;
    }
    return s;
  }

  // notas: [{n,d}]   posiciones: mapa nota -> y   opciones: {compas, actual, color}
  function render(notas, posiciones, opciones) {
    const o = opciones || {};
    const inicioX = 62;
    let x = inicioX;
    const anchos = notas.map(p => anchoDe(p.d));
    const ancho = inicioX + anchos.reduce((a, b) => a + b, 0) + 20;

    // Alto suficiente para la nota más grave y la más aguda, con margen.
    const ys = notas.map(p => posiciones[p.n]).filter(y => y !== undefined);
    const minY = Math.min(ARRIBA, ...ys) - 42;
    const maxY = Math.max(ABAJO, ...ys) + 42;
    const alto = maxY - minY;

    let cuerpo = LINEAS.map(
      y => `<line x1="18" y1="${y}" x2="${ancho - 8}" y2="${y}" stroke="#d5d5e5" stroke-width="1.2"/>`
    ).join('');
    cuerpo += `<text x="20" y="94" font-size="76" fill="#9575cd" font-family="serif" opacity="0.45">𝄞</text>`;
    if (o.compas) {
      const [a, b] = o.compas.split('/');
      cuerpo += `<text x="46" y="${MEDIO - 1}" font-size="17" font-weight="800" fill="#7a7a95"
        font-family="Nunito,sans-serif" text-anchor="middle">${a}</text>`;
      cuerpo += `<text x="46" y="${MEDIO + 17}" font-size="17" font-weight="800" fill="#7a7a95"
        font-family="Nunito,sans-serif" text-anchor="middle">${b}</text>`;
    }

    notas.forEach((p, i) => {
      const y = posiciones[p.n];
      const w = anchos[i];
      if (y !== undefined) {
        const color = i === o.actual ? '#fb8c00' : o.color || '#3949ab';
        cuerpo += dibujarNota(x + w / 2, y, figuraDe(p.d), color, i === o.actual);
      }
      x += w;
    });

    return `<svg viewBox="18 ${minY} ${ancho - 18} ${alto}" width="${ancho - 18}" height="${alto}"
      xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="Partitura de ${notas.length} notas">${cuerpo}</svg>`;
  }

  // Dónde está cada nota horizontalmente, para poder centrar el scroll en la
  // que se está tocando.
  function xDeNota(notas, i) {
    let x = 62;
    for (let k = 0; k < i; k++) x += anchoDe(notas[k].d);
    return x + anchoDe(notas[i] ? notas[i].d : 1) / 2;
  }

  return { FIGURAS, figuraDe, ledgers, anchoDe, render, xDeNota, LINEAS, MEDIO };
})();
