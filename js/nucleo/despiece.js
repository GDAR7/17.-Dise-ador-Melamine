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
    // Lados con tapacanto, con el largo en horizontal: L1 abajo, L2 arriba, A1 derecha, A2 izquierda.
    // m.cantos guarda lo que eligió el usuario; cL y cA son solo el valor por defecto.
    const lados = (m.cantos && m.cantos[nom]) || { L1: cL >= 1, L2: cL >= 2, A1: cA >= 1, A2: cA >= 2 };
    // Medida de corte: los cantos de los extremos acortan el largo y los de los lados largos, el ancho
    const tc = +S.cfg.tcEsp || 0;
    P.push({ nom, L: Math.round(L - tc * (lados.A1 + lados.A2)), A: Math.round(A - tc * (lados.L1 + lados.L2)), q: q * (+m.qty || 1), cL: lados.L1 + lados.L2, cA: lados.A1 + lados.A2, lados, mat: mat.id, matNom: mat.nom, esp: mat.esp, mod: m.nom, modId: m.id, kind });
  };

  if (m.tipo === 'columnas') { piezasColumnas(m, add, mc, mf, mb); return P; }

  const Wi = W - 2 * e;              // ancho interior
  const Hi = H - 2 * e - Z;          // alto interior libre

  // --- Caja ---
  add('Lateral', H, D, 2, 1, 0, mc, 'lat');
  add('Techo', Wi, D, 1, 1, 0, mc, 'horiz');
  add('Piso', Wi, D, 1, 1, 0, mc, 'horiz');

  // --- Divisiones verticales ---
  const nd = +m.divs || 0;
  const nr = +m.repisas || 0;
  const j = apoyoDivision(m);
  if (nd > 0) add('División vertical', j ? H - e - yRepisa(m, e, j) - e : Hi, D, nd, 1, 0, mc, 'div');

  // Ancho de cada vano (los interiores pierden espesor de división)
  const vanos = nd + 1;
  const anchoVano = (Wi - nd * e) / vanos;

  // --- Repisas ---
  // La repisa donde se apoyan las divisiones y las de debajo van de lado a lado
  const enteras = j;
  add('Repisa', anchoVano, D - (+m.retr || 0), (nr - enteras) * vanos, 1, 0, mc, 'rep');
  add('Repisa entera', Wi, D - (+m.retr || 0), enteras, 1, 0, mc, 'rep');

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
    const arribaP = m.tipoP === 'superpuesta' ? H - 1 - (m.encimera ? ef : 0) : H - e - 2;
    ph = tramoPuertas(m, e, arribaP - ph, arribaP).alto;
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

/* Altura de la cara inferior de la repisa i, contada desde abajo */
function yRepisa(m, e, i) {
  const ya = (+m.zocalo || 0) + e, yb = +m.alto - e;
  return ya + (yb - ya) * i / ((+m.repisas || 0) + 1) - e / 2;
}

/* En los campos las repisas se cuentan desde arriba: devuelve ese n.º si existe, o 0 */
function repisaValida(m, v) {
  const n = Math.round(+v || 0);
  return n >= 1 && n <= (+m.repisas || 0) ? n : 0;
}

/* Repisa, contada desde abajo, donde se apoyan las divisiones que bajan del techo. 0 = llegan al piso */
function apoyoDivision(m) {
  const k = (+m.divs || 0) > 0 ? repisaValida(m, m.divHasta) : 0;
  return k ? (+m.repisas || 0) - k + 1 : 0;
}

/* Tramo vertical de las puertas según las repisas elegidas. abajo y arriba son los límites si cubren todo */
function tramoPuertas(m, e, abajo, arriba) {
  const nr = +m.repisas || 0, supe = m.tipoP === 'superpuesta';
  let d = repisaValida(m, m.puertaDesde), h = repisaValida(m, m.puertaHasta);
  if (d && h && d >= h) d = h = 0;     // rango imposible: se ignora
  const y = n => yRepisa(m, e, nr - n + 1);
  // Superpuesta: tapa el canto de la repisa límite. Embutida: queda entre repisas con 2 mm de holgura.
  const techo = d ? y(d) + (supe ? e : -2) : arriba;
  const base = h ? Math.max(abajo, y(h) + (supe ? 0 : e + 2)) : abajo;
  return { y: base, alto: techo - base };
}

function todasPiezas() {
  return S.mods.flatMap(m => piezas(m));
}

/* ---------- HERRAJES ---------- */
function herrajesCalc() {
  let bis = 0, bisSemi = 0, bisEmb = 0, cor = 0, tir = 0, tor = 0, sop = 0, reg = 0;
  S.mods.forEach(m => {
    const q = +m.qty || 1;
    if (m.tipo === 'columnas') {
      const r = herrajesColumnas(m);
      bis += q * r.bis; bisSemi += q * r.bisSemi; cor += q * r.cor; tir += q * r.tir; tor += q * r.tor; sop += q * r.sop; reg += q * r.reg;
      return;
    }
    const np = +m.puertas || 0, nc = +m.cajones || 0, nr = +m.repisas || 0, nd = +m.divs || 0;
    const alto = +m.alto;
    const puerta = (+m.puertaDesde || +m.puertaHasta) ? piezas(m).find(p => p.kind === 'puerta') : null;
    const nBis = q * np * ((puerta ? puerta.L : alto) > 1600 ? 3 : 2);
    if (m.tipoP === 'embutida') bisEmb += nBis; else bis += nBis;
    cor += q * nc;
    tir += q * (np + nc);
    const j = apoyoDivision(m);
    sop += q * (j + (nr - j) * (nd + 1)) * 4;
    tor += q * (16 + nr * 4 + nd * 8 + np * 4 + nc * 6);
    reg += q * ((+m.zocalo || 0) > 0 ? 4 : 0);
  });
  const map = { bisagra: bis, bisagraSemi: bisSemi, bisagraEmb: bisEmb, corredera: cor, tirador: tir, tornillo: tor, soporte: sop, regaton: reg };
  return S.herrajes.map(h => ({ ...h, cant: map[h.por] != null ? map[h.por] : 0 }));
}

/* ---------- TAPACANTO ---------- */
function tapacantoML() {
  let mm = 0;
  todasPiezas().forEach(p => { mm += p.q * (p.cL * p.L + p.cA * p.A); });
  return mm / 1000;
}
