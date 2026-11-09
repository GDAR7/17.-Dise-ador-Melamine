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
    // Cada lado vale false (sin canto), true (delgado) o 'g' (grueso).
    // m.cantos guarda lo que eligió el usuario; por defecto, puertas y frentes llevan canto grueso y el resto delgado.
    const canto = kind === 'puerta' || kind === 'frente' ? 'g' : true;
    const lados = (m.cantos && m.cantos[nom]) || { L1: cL >= 1 && canto, L2: cL >= 2 && canto, A1: cA >= 1 && canto, A2: cA >= 2 && canto };
    // Medida de corte: los cantos de los extremos acortan el largo y los de los lados largos, el ancho
    P.push({ nom, L: Math.round(L - descuentoCanto(lados.A1) - descuentoCanto(lados.A2)), A: Math.round(A - descuentoCanto(lados.L1) - descuentoCanto(lados.L2)), q: q * (+m.qty || 1), cL: !!lados.L1 + !!lados.L2, cA: !!lados.A1 + !!lados.A2, lados, mat: mat.id, matNom: mat.nom, esp: mat.esp, mod: m.nom, modId: m.id, kind });
  };

  if (m.tipo === 'columnas') { piezasColumnas(m, add, mc, mf, mb); return P; }

  const Wi = W - 2 * e;              // ancho interior

  // --- Caja ---
  add('Lateral', H, D, 2, 1, 0, mc, 'lat');
  add('Techo', Wi, D, 1, 1, 0, mc, 'horiz');
  add('Piso', Wi, D, 1, 1, 0, mc, 'horiz');

  // --- Divisiones verticales y repisas ---
  const contar = lista => {
    const grupos = new Map();
    lista.forEach(x => grupos.set(x.nom, { x, q: (grupos.has(x.nom) ? grupos.get(x.nom).q : 0) + 1 }));
    return [...grupos.values()];
  };
  const interior = interiorMueble(m, e);
  contar(interior.divisiones).forEach(({ x, q }) => add(x.nom, x.alto, x.prof, q, 1, 0, mc, 'div'));
  contar(interior.repisas).forEach(({ x, q }) => add(x.nom, x.ancho, x.prof, q, 1, 0, mc, 'rep'));

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
  gruposPuertas(m).forEach(g => {
    const f = montajeFrente(m, e, ef);
    add(g.nom, tramoPuertas(m, e, f.abajo, f.arriba, g).alto, (f.ancho - 3 * (g.n - 1)) / g.n, g.n, 2, 2, mf, 'puerta');
  });

  // --- Cajones ---
  const nc = +m.cajones || 0;
  if (nc > 0) {
    const hc = +m.altoCaj || 170;
    const fa = montajeFrente(m, e, ef).anchoCajon;
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

/* Cuánto más cortas que las verticales son las repisas. Al elegir "al ras" se conserva el valor por si se vuelve al retiro */
const retiroRepisa = m => (m.retiroRepisa === 'ras' ? 0 : +m.retr || 0);

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

/* Grupos de divisiones verticales. num es fijo por la misma razón que en las puertas */
function gruposDivisiones(m) {
  const extra = (m.divisionesExtra || []).map(g => ({ id: `div${g.num}`, num: g.num, nomD: `División vertical ${g.num}`, nomR: `Repisa ${g.num}`, n: +g.n || 0, desde: g.desde, hasta: g.hasta }));
  return [{ id: 'div', nomD: 'División vertical', nomR: 'Repisa', n: +m.divs || 0, desde: m.divDesde, hasta: m.divHasta }, ...extra].filter(g => g.n > 0);
}

/* Posición de divisiones y repisas. Una repisa solo se parte si una división la atraviesa; si no, va de lado a lado.
   Es la única fuente de estas medidas: el despiece, el 3D y el 2D leen de aquí. */
function interiorMueble(m, e) {
  const H = +m.alto, Z = +m.zocalo || 0, Wi = +m.ancho - 2 * e, nr = +m.repisas || 0, D = +m.prof, retr = retiroRepisa(m);
  const y = n => yRepisa(m, e, nr - n + 1), grupos = gruposDivisiones(m);

  // La repisa donde termina una puerta llega hasta el frente y cierra ese espacio.
  // Las que quedan detrás de una puerta metida en el mueble se acortan para que esta pueda cerrar.
  const puertas = gruposPuertas(m), mf = S.mats.find(x => x.id === m.matF) || S.mats.find(x => x.id === m.matC) || S.mats[0];
  const limites = new Set(puertas.flatMap(g => { const l = limitesNivel(m, g); return [l.d, l.h]; }).filter(Boolean));
  const zFrente = montajeFrente(m, e, mf.esp).z;
  const tapada = n => puertas.some(g => { const [a, b] = nivelesGrupo(m, g); return a <= n - 1 && n <= b; });
  const prof = n => (limites.has(n) ? D : tapada(n) && zFrente < D ? Math.min(D - retr, zFrente - 2) : D - retr);
  const nombre = (n, base) => base + (limites.has(n) ? ' de cierre' : prof(n) < D - retr ? ' corta' : '');

  const anchoVano = g => (Wi - g.n * e) / (g.n + 1);
  // Las divisiones pueden alinearse con el retiro de las repisas; detrás de una puerta metida en el mueble se acortan para que cierre
  const profDivision = g => {
    const base = m.retiroDiv === 'igual' ? D - retr : D;
    const [a, b] = nivelesGrupo(m, g);
    const choca = zFrente < D && puertas.some(p => { const [c, f] = nivelesGrupo(m, p); return c <= b && a <= f; });
    return choca ? Math.min(base, zFrente - 2) : base;
  };
  const divisiones = [], repisas = [];
  grupos.forEach(g => {
    const { d, h } = limitesNivel(m, g), sup = d ? y(d) : H - e, inf = h ? y(h) + e : Z + e, av = anchoVano(g);
    for (let i = 1; i <= g.n; i++) divisiones.push({ nom: g.nomD, x: e + i * av + (i - 1) * e, y: inf, alto: sup - inf, prof: profDivision(g) });
  });
  for (let n = 1; n <= nr; n++) {
    const g = grupos.find(x => { const [a, b] = nivelesGrupo(m, x); return a <= n - 1 && n <= b; });
    const comun = { y: y(n), prof: prof(n), cierre: limites.has(n) };
    if (!g) { repisas.push({ ...comun, nom: nombre(n, grupos.length ? 'Repisa entera' : 'Repisa'), x: e, ancho: Wi }); continue; }
    const av = anchoVano(g);
    for (let v = 0; v <= g.n; v++) repisas.push({ ...comun, nom: nombre(n, g.nomR), x: e + v * (av + e), ancho: av });
  }
  return { divisiones, repisas };
}

/* Grupos de puertas del mueble. num es fijo: los lados y herrajes elegidos no se mezclan al quitar un grupo */
function gruposPuertas(m) {
  const extra = (m.puertasExtra || []).map(g => ({ id: `puerta${g.num}`, nom: `Puerta ${g.num}`, n: +g.n || 0, desde: g.desde, hasta: g.hasta }));
  return [{ id: 'puerta', nom: 'Puerta', n: +m.puertas || 0, desde: m.puertaDesde, hasta: m.puertaHasta }, ...extra].filter(g => g.n > 0);
}

/* Repisas límite ya validadas: d arriba y h abajo, con 0 = techo o piso */
function limitesNivel(m, g) {
  const d = repisaValida(m, g.desde), h = repisaValida(m, g.hasta);
  return d && h && d >= h ? { d: 0, h: 0 } : { d, h };   // rango imposible: se ignora
}

/* Niveles que ocupa un grupo, de 0 (bajo el techo) a nr (sobre el piso), ambos incluidos */
function nivelesGrupo(m, g) {
  const { d, h } = limitesNivel(m, g);
  return [d, h ? h - 1 : (+m.repisas || 0)];
}

function gruposSeCruzan(m, grupos) {
  const usados = new Set();
  return grupos.some(g => {
    const [a, b] = nivelesGrupo(m, g);
    for (let i = a; i <= b; i++) {
      if (usados.has(i)) return true;
      usados.add(i);
    }
    return false;
  });
}

/* Nivel para un grupo nuevo: junto al último creado o, si no se puede, el primero libre. null si no queda ninguno */
function nivelLibre(m, grupos) {
  const nr = +m.repisas || 0, ocupados = new Set();
  grupos.forEach(g => {
    const [a, b] = nivelesGrupo(m, g);
    for (let i = a; i <= b; i++) ocupados.add(i);
  });
  const ult = grupos.length ? nivelesGrupo(m, grupos[grupos.length - 1]) : [];
  const libre = [ult[0] - 1, ult[1] + 1, ...Array.from({ length: nr + 1 }, (_, i) => i)].find(i => i >= 0 && i <= nr && !ocupados.has(i));
  return libre === undefined ? null : libre;
}

/* Posición de los frentes según el montaje:
   superpuesta (Exterior) tapa todo el canto · media tapa la mitad · embutida (A nivel) queda dentro y al ras del frente ·
   interior queda dentro y metida el valor de rebaje. */
function montajeFrente(m, e, ef) {
  const W = +m.ancho, H = +m.alto, D = +m.prof, Z = +m.zocalo || 0;
  const alt = (+m.cajones || 0) * (+m.altoCaj || 0);
  if (m.tipoP === 'superpuesta') return { x: 0, ancho: W, z: D, arriba: H - 1 - (m.encimera ? ef : 0), abajo: Z + alt + 1, anchoCajon: W - 3 };
  if (m.tipoP === 'media') return { x: e / 2, ancho: W - e, z: D, arriba: H - e / 2, abajo: alt ? Z + alt + 1 : Z + e / 2, anchoCajon: W - e - 3 };
  const rebaje = m.tipoP === 'interior' ? Math.max(0, m.rebaje == null ? 20 : +m.rebaje || 0) : 0;
  return { x: e + 2, ancho: W - 2 * e - 4, z: D - ef - rebaje, arriba: H - e - 2, abajo: Z + e + alt + 2, anchoCajon: W - 2 * e - 4 };
}

/* Tramo vertical de un grupo de puertas. abajo y arriba son los límites si cubre todo el alto.
   Si otra puerta llega a la misma repisa, cada una cubre la mitad del canto con 3 mm de luz entre ambas. */
function tramoPuertas(m, e, abajo, arriba, g) {
  const nr = +m.repisas || 0;
  const { d, h } = limitesNivel(m, g);
  const y = n => yRepisa(m, e, nr - n + 1);
  const otros = gruposPuertas(m).filter(o => o.id !== g.id).map(o => limitesNivel(m, o));
  const techoDe = n => {
    const compartida = otros.some(o => o.h === n);
    if (m.tipoP === 'superpuesta') return compartida ? y(n) + e / 2 - 1.5 : y(n) + e;
    if (m.tipoP === 'media') return y(n) + e / 2 - (compartida ? 1.5 : 0);
    return y(n) - 2;
  };
  const baseDe = n => {
    const compartida = otros.some(o => o.d === n);
    if (m.tipoP === 'superpuesta') return compartida ? y(n) + e / 2 + 1.5 : y(n);
    if (m.tipoP === 'media') return y(n) + e / 2 + (compartida ? 1.5 : 0);
    return y(n) + e + 2;
  };
  const techo = d ? techoDe(d) : arriba;
  const base = h ? Math.max(abajo, baseDe(h)) : abajo;
  return { y: base, alto: techo - base };
}

function todasPiezas() {
  return S.mods.flatMap(m => piezas(m));
}

/* ---------- TAPACANTO ---------- */
function descuentoCanto(lado) {
  if (!lado) return 0;
  if (lado !== 'g') return +S.cfg.tcEsp || 0;
  return S.cfg.tcGrueso == null ? 2 : (+S.cfg.tcGrueso || 0);
}

/* Metros de tapacanto delgado y grueso de todo el proyecto */
function tapacantoPorTipo() {
  const mm = { fino: 0, grueso: 0 };
  todasPiezas().forEach(p => {
    [['L1', p.L], ['L2', p.L], ['A1', p.A], ['A2', p.A]].forEach(([k, largo]) => {
      if (p.lados[k]) mm[p.lados[k] === 'g' ? 'grueso' : 'fino'] += p.q * largo;
    });
  });
  return { fino: mm.fino / 1000, grueso: mm.grueso / 1000 };
}

/* Precio del tapacanto grueso; los proyectos anteriores a este tipo usan el del delgado */
const precioCantoGrueso = () => (S.cfg.tcPrecioG == null ? (+S.cfg.tcPrecio || 0) : (+S.cfg.tcPrecioG || 0));

function tapacantoML() {
  let mm = 0;
  todasPiezas().forEach(p => { mm += p.q * (p.cL * p.L + p.cA * p.A); });
  return mm / 1000;
}
