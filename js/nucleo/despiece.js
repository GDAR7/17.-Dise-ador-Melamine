"use strict";
/* ============================================================
   GENERACIÓN DEL DESPIECE
   Sistema de caja: laterales de piso a techo, piso/techo
   entre laterales, repisas retranqueadas.
   ============================================================ */
function piezas(m) {
  const mc = S.mats.find(x => x.id === m.matC) || S.mats[0];
  const mf = S.mats.find(x => x.id === m.matF) || mc;
  const mb = S.mats.find(x => x.id === m.matB) || mc;
  const e = mc.esp, ef = mf.esp;
  const W = +m.ancho, H = +m.alto, D = +m.prof, Z = +m.zocalo || 0;
  const P = [];
  // L = largo (lado mayor nominal), A = ancho; cL/cA = n° de cantos en cada dirección
  const add = (nom, L, A, q, cL, cA, mat, kind) => {
    if (q <= 0 || L <= 0 || A <= 0) return;
    P.push({ nom, L: Math.round(L), A: Math.round(A), q: q * (+m.qty || 1), cL, cA, mat: mat.id, matNom: mat.nom, esp: mat.esp, mod: m.nom, modId: m.id, kind });
  };

  const Wi = W - 2 * e;              // ancho interior
  const Hi = H - 2 * e - Z;          // alto interior libre

  // --- Caja ---
  add('Lateral', H, D, 2, 1, 0, mc, 'lat');
  add('Techo', Wi, D, 1, 1, 0, mc, 'horiz');
  add('Piso', Wi, D, 1, 1, 0, mc, 'horiz');

  // --- Divisiones verticales ---
  const nd = +m.divs || 0;
  if (nd > 0) add('División vertical', H - 2 * e - Z, D, nd, 1, 0, mc, 'div');

  // Ancho de cada vano (los interiores pierden espesor de división)
  const vanos = nd + 1;
  const anchoVano = (Wi - nd * e) / vanos;

  // --- Repisas ---
  const nr = +m.repisas || 0;
  if (nr > 0) add('Repisa', anchoVano, D - (+m.retr || 0), nr * vanos, 1, 0, mc, 'rep');

  // --- Zócalo ---
  if (Z > 0) {
    add('Zócalo frontal', Wi, Z, 1, 1, 0, mc, 'zoc');
    add('Zócalo posterior', Wi, Z, 1, 0, 0, mc, 'zoc');
  }

  // --- Fondo ---
  if (m.fondo === 'clavado') add('Fondo', W, H - Z, 1, 0, 0, mb, 'fondo');
  else if (m.fondo === 'ranurado') add('Fondo (ranurado)', Wi + 12, H - 2 * e - Z + 12, 1, 0, 0, mb, 'fondo');

  // --- Encimera / tapa superior ---
  if (m.encimera) add('Encimera', W, D + 25, 1, 1, 2, mf, 'enc');

  // --- Puertas ---
  const np = +m.puertas || 0;
  if (np > 0) {
    let pa, ph;
    const altoFrentes = (+m.cajones || 0) * (+m.altoCaj || 0);
    if (m.tipoP === 'superpuesta') {
      pa = (W - 3 * (np - 1)) / np;
      ph = H - Z - altoFrentes - 2 - (m.encimera ? ef : 0);
    } else {
      pa = (Wi - 3 * (np - 1) - 4) / np;
      ph = H - 2 * e - Z - altoFrentes - 4;
    }
    add('Puerta', ph, pa, np, 2, 2, mf, 'puerta');
  }

  // --- Cajones ---
  const nc = +m.cajones || 0;
  if (nc > 0) {
    const hc = +m.altoCaj || 170;
    const fa = m.tipoP === 'superpuesta' ? W - 3 : Wi - 4;
    add('Frente de cajón', hc - 3, fa, nc, 2, 2, mf, 'frente');
    const guia = 13;                      // holgura por lado para corredera
    const anchoCaja = Wi - 2 * guia;
    const altoCaja = Math.max(80, hc - 40);
    const profCaja = Math.max(200, D - 60);
    add('Lateral de cajón', profCaja, altoCaja, nc * 2, 1, 0, mc, 'caj');
    add('Frontal/Trasera cajón', anchoCaja - 2 * e, altoCaja, nc * 2, 1, 0, mc, 'caj');
    add('Fondo de cajón', anchoCaja - 2 * e, profCaja - 2 * e, nc, 0, 0, mb, 'caj');
  }
  return P;
}

function todasPiezas() {
  return S.mods.flatMap(m => piezas(m));
}

/* ---------- HERRAJES ---------- */
function herrajesCalc() {
  let bis = 0, cor = 0, tir = 0, tor = 0, sop = 0, reg = 0;
  S.mods.forEach(m => {
    const q = +m.qty || 1;
    const np = +m.puertas || 0, nc = +m.cajones || 0, nr = +m.repisas || 0, nd = +m.divs || 0;
    const alto = +m.alto;
    bis += q * np * (alto > 1600 ? 3 : 2);
    cor += q * nc;
    tir += q * (np + nc);
    sop += q * nr * (nd + 1) * 4;
    tor += q * (16 + nr * 4 + nd * 8 + np * 4 + nc * 6);
    reg += q * ((+m.zocalo || 0) > 0 ? 4 : 0);
  });
  const map = { bisagra: bis, corredera: cor, tirador: tir, tornillo: tor, soporte: sop, regaton: reg };
  return S.herrajes.map(h => ({ ...h, cant: map[h.por] != null ? map[h.por] : 0 }));
}

/* ---------- TAPACANTO ---------- */
function tapacantoML() {
  let mm = 0;
  todasPiezas().forEach(p => { mm += p.q * (p.cL * p.L + p.cA * p.A); });
  return mm / 1000;
}
