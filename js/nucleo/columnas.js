"use strict";
/* ============================================================
   MUEBLE POR COLUMNAS
   Cada columna es una caja independiente con su propio ancho y
   sus zonas apiladas (puerta, cajón o abierta). Las zonas se
   guardan de arriba hacia abajo, como se ven en el mueble.
   ============================================================ */
function columnasEjemplo() {
  const zona = (nom, alto, tipo, rep = 0) => ({ nom, alto, tipo, rep });
  const altillo = () => zona('Altillo', 350, 'puerta');
  return [
    { nom: 'Cajonería', ancho: 600, zonas: [altillo(), zona('Vajilla', 900, 'puerta', 2), zona('Cubiertos', 150, 'cajon'), zona('Utensilios', 150, 'cajon'), zona('Sartenes', 200, 'cajon'), zona('Ollas medianas', 250, 'cajon'), zona('Ollas grandes', 300, 'cajon')] },
    { nom: 'Despensa', ancho: 600, zonas: [altillo(), zona('Abarrotes', 1150, 'puerta', 4), zona('Pesados', 800, 'puerta', 1)] },
    { nom: 'Microondas', ancho: 600, zonas: [altillo(), zona('Vasos', 800, 'puerta', 2), zona('Nicho', 400, 'abierta'), zona('Tápers', 375, 'cajon'), zona('Bolsas', 375, 'cajon')] }
  ];
}

/* Zonas de abajo hacia arriba con su tramo [a, b], su interior libre [ib, it] y si llevan entrepaño encima */
function zonasColumna(m, c, e) {
  const H = +m.alto, Z = +m.zocalo || 0;
  const zs = [...c.zonas].reverse().filter(z => (+z.alto || 0) > 0);
  let y = Z;
  return zs.map((z, i) => {
    const a = y, b = Math.min(H, y + +z.alto);
    y = b;
    const sig = zs[i + 1], ant = zs[i - 1];
    // Los cajones seguidos comparten hueco: no llevan entrepaño entre ellos
    const juntoAbajo = ant && !(ant.tipo === 'cajon' && z.tipo === 'cajon');
    const juntoArriba = sig && !(sig.tipo === 'cajon' && z.tipo === 'cajon');
    return {
      z, a, b, panel: !!juntoArriba,
      ib: ant ? (juntoAbajo ? a + e / 2 : a) : Z + e,
      it: sig ? (juntoArriba ? b - e / 2 : b) : H - e
    };
  });
}

function piezasColumnas(m, add, mc, mf, mb) {
  const e = mc.esp, H = +m.alto, D = +m.prof, Z = +m.zocalo || 0, retr = +m.retr || 0;
  (m.columnas || []).forEach(c => {
    const W = +c.ancho || 0, Wi = W - 2 * e, pre = `${c.nom} · `;
    add(pre + 'Lateral', H, D, 2, 1, 0, mc, 'lat');
    add(pre + 'Techo', Wi, D, 1, 1, 0, mc, 'horiz');
    add(pre + 'Piso', Wi, D, 1, 1, 0, mc, 'horiz');
    if (Z > 0) {
      add(pre + 'Zócalo frontal', Wi, Z, 1, 1, 0, mc, 'zoc');
      add(pre + 'Zócalo posterior', Wi, Z, 1, 0, 0, mc, 'zoc');
    }
    if (m.fondo === 'clavado') add(pre + 'Fondo', W, H - Z, 1, 0, 0, mb, 'fondo');
    else if (m.fondo === 'ranurado') add(pre + 'Fondo (ranurado)', Wi + 12, H - 2 * e - Z + 12, 1, 0, 0, mb, 'fondo');

    const zonas = zonasColumna(m, c, e);
    add(pre + 'Entrepaño', Wi, D, zonas.filter(x => x.panel).length, 1, 0, mc, 'horiz');
    zonas.forEach(({ z, a, b }) => {
      const alto = b - a, nom = pre + z.nom;
      if (z.tipo !== 'cajon') add(`${nom} · Repisa`, Wi, D - retr, +z.rep || 0, 1, 0, mc, 'rep');
      if (z.tipo === 'puerta') add(`${nom} · Puerta`, alto - 3, W - 3, 1, 2, 2, mf, 'puerta');
      if (z.tipo === 'cajon') {
        const anchoCaja = Wi - 26, altoCaja = Math.max(80, alto - 40), profCaja = Math.max(200, D - 60);
        add(`${nom} · Frente`, alto - 3, W - 3, 1, 2, 2, mf, 'frente');
        add(`${nom} · Lateral cajón`, profCaja, altoCaja, 2, 1, 0, mc, 'caj');
        add(`${nom} · Frontal/Trasera cajón`, anchoCaja - 2 * e, altoCaja, 2, 1, 0, mc, 'caj');
        add(`${nom} · Fondo cajón`, anchoCaja - 2 * e, profCaja - 2 * e, 1, 0, 0, mb, 'caj');
      }
    });
  });
}

function herrajesColumnas(m) {
  const e = (S.mats.find(x => x.id === m.matC) || S.mats[0]).esp;
  const r = { bis: 0, cor: 0, tir: 0, tor: 0, sop: 0, reg: 0 };
  (m.columnas || []).forEach(c => {
    r.tor += 16;
    if ((+m.zocalo || 0) > 0) r.reg += 4;
    zonasColumna(m, c, e).forEach(({ z, a, b, panel }) => {
      if (panel) r.tor += 8;
      if (z.tipo === 'puerta') { r.bis += b - a > 1600 ? 3 : 2; r.tir++; r.tor += 4; }
      if (z.tipo === 'cajon') { r.cor++; r.tir++; r.tor += 6; }
      if (z.tipo !== 'cajon') { r.sop += (+z.rep || 0) * 4; r.tor += (+z.rep || 0) * 4; }
    });
  });
  return r;
}

function geoColumnas(m, opts = {}) {
  const mc = S.mats.find(x => x.id === m.matC) || S.mats[0];
  const mf = S.mats.find(x => x.id === m.matF) || mc;
  const mb = S.mats.find(x => x.id === m.matB) || mc;
  const e = mc.esp, ef = mf.esp, eb = mb.esp, cC = mc.color, cF = mf.color, cB = mb.color;
  const H = +m.alto, D = +m.prof, Z = +m.zocalo || 0, retr = +m.retr || 0;
  const B = [];
  const box = (x, y, z, w, h, d, c, tag) => B.push({ x, y, z, w, h, d, c, tag });

  let x0 = 0;
  (m.columnas || []).forEach(c => {
    const W = +c.ancho || 0, Wi = W - 2 * e, xi = x0 + e;
    box(x0, 0, 0, e, H, D, cC, 'Lateral');
    box(x0 + W - e, 0, 0, e, H, D, cC, 'Lateral');
    box(xi, Z, 0, Wi, e, D, cC, 'Piso');
    box(xi, H - e, 0, Wi, e, D, cC, 'Techo');
    if (Z > 0) {
      box(xi, 0, D - e, Wi, Z, e, cC, 'Zócalo');
      box(xi, 0, 0, Wi, Z, e, cC, 'Zócalo');
    }
    if (opts.fondo !== false && m.fondo !== 'ninguno') {
      if (m.fondo === 'clavado') box(x0, Z, -eb, W, H - Z, eb, cB, 'Fondo');
      else box(xi - 6, Z + e - 6, 0, Wi + 12, H - 2 * e - Z + 12, eb, cB, 'Fondo');
    }
    zonasColumna(m, c, e).forEach(({ z, a, b, ib, it, panel }) => {
      if (panel) box(xi, b - e / 2, 0, Wi, e, D, cC, 'Entrepaño');
      if (z.tipo !== 'cajon') {
        const n = +z.rep || 0;
        for (let i = 1; i <= n; i++) box(xi, ib + (it - ib) * i / (n + 1) - e / 2, 0, Wi, e, D - retr, cC, 'Repisa');
      }
      if (z.tipo !== 'abierta' && opts.puertas !== false) {
        box(x0 + 1.5, a + 1.5, D, W - 3, b - a - 3, ef, cF, z.tipo === 'cajon' ? 'Frente cajón' : 'Puerta');
      }
    });
    x0 += W;
  });
  return { B, W: x0, H, D };
}
