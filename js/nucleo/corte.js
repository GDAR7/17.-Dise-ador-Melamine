"use strict";
/* ============================================================
   OPTIMIZACIÓN DE CORTE (guillotina por bandas, FFDH)
   ============================================================ */
function optimizar(lista, mat) {
  return S.cfg.modoCorte === 'bandas' ? optimizarBandas(lista, mat) : optimizarMax(lista, mat);
}

/* ------------------------------------------------------------
   Máximo aprovechamiento: guillotina libre con búsqueda.
   Cada corte divide un trozo en dos, sin franjas fijas. Se prueban
   muchas combinaciones y se conserva la que usa menos planchas y
   deja el retazo más grande. Es determinista: mismos datos, mismo plano.
   ------------------------------------------------------------ */
const _cacheCorte = new Map();
function optimizarMax(lista, mat) {
  const kerf = +S.cfg.kerf || 0;
  const BW = +mat.fw, BH = +mat.fh;
  const rotar = !!S.cfg.rotar && !mat.veta;
  const clave = JSON.stringify([lista, kerf, BW, BH, rotar]);
  if (_cacheCorte.has(clave)) return _cacheCorte.get(clave);

  const orient = it => {
    const o = [{ w: it.L, h: it.A, rot: false }];
    if (rotar && it.L !== it.A) o.push({ w: it.A, h: it.L, rot: true });
    return o;
  };
  const items = [], grandes = [];
  lista.forEach(p => {
    for (let i = 0; i < p.q; i++) {
      const it = { ...p };
      (orient(it).some(o => o.w <= BW && o.h <= BH) ? items : grandes).push(it);
    }
  });

  const LIMITE = 6e6;   // tope de comparaciones, para que la pantalla no se trabe
  let trabajo = 0;

  const puntaje = (F, o, fit) => {
    const lw = F.w - o.w, lh = F.h - o.h;
    const corto = Math.min(lw, lh), largo = Math.max(lw, lh);
    if (fit === 0) return [F.w * F.h - o.w * o.h, corto];
    if (fit === 1) return [corto, largo];
    return [largo, corto];
  };
  const cortaHorizontal = (F, o, regla) => {
    const lw = F.w - o.w, lh = F.h - o.h;
    switch (regla) {
      case 0: return lw <= lh;
      case 1: return lw > lh;
      case 2: return o.w * lh > lw * o.h;
      case 3: return o.w * lh <= lw * o.h;
      case 4: return F.w <= F.h;
      default: return F.w > F.h;
    }
  };

  function empaquetar(orden, fit, regla) {
    const tableros = [];
    const buscar = (bi, best) => {
      const libres = tableros[bi].libres;
      for (let fi = 0; fi < libres.length; fi++) {
        const F = libres[fi];
        for (const o of best.opts) {
          trabajo++;
          if (o.w > F.w || o.h > F.h) continue;
          const [a, b] = puntaje(F, o, fit);
          if (!best.o || a < best.a || (a === best.a && b < best.b)) Object.assign(best, { bi, fi, o, a, b });
        }
      }
    };
    for (const it of orden) {
      const best = { opts: orient(it), o: null };
      for (let bi = 0; bi < tableros.length; bi++) buscar(bi, best);
      if (!best.o) {
        tableros.push({ libres: [{ x: 0, y: 0, w: BW, h: BH }], piezas: [] });
        buscar(tableros.length - 1, best);
      }
      const t = tableros[best.bi], F = t.libres[best.fi], o = best.o;
      t.libres[best.fi] = t.libres[t.libres.length - 1];
      t.libres.pop();
      t.piezas.push({ ...it, x: F.x, y: F.y, w: o.w, h: o.h, rot: o.rot });
      const horiz = cortaHorizontal(F, o, regla);
      const der = { x: F.x + o.w + kerf, y: F.y, w: F.w - o.w - kerf, h: horiz ? o.h : F.h };
      const inf = { x: F.x, y: F.y + o.h + kerf, w: horiz ? F.w : o.w, h: F.h - o.h - kerf };
      if (der.w > 0 && der.h > 0) t.libres.push(der);
      if (inf.w > 0 && inf.h > 0) t.libres.push(inf);
    }
    const ultima = tableros.length ? tableros[tableros.length - 1].piezas.reduce((s, p) => s + p.w * p.h, 0) : 0;
    const retazo = tableros.reduce((m, t) => t.libres.reduce((n, r) => Math.max(n, r.w * r.h), m), 0);
    return { tableros, nota: [tableros.length, ultima, -retazo] };
  }
  const mejorQue = (a, b) => {
    for (let i = 0; i < a.nota.length; i++) if (a.nota[i] !== b.nota[i]) return a.nota[i] < b.nota[i];
    return false;
  };

  const lado = it => Math.max(it.L, it.A), corto = it => Math.min(it.L, it.A);
  const ordenes = [
    (a, b) => b.L * b.A - a.L * a.A,
    (a, b) => lado(b) - lado(a) || corto(b) - corto(a),
    (a, b) => corto(b) - corto(a) || lado(b) - lado(a),
    (a, b) => (b.L + b.A) - (a.L + a.A),
    (a, b) => b.A - a.A || b.L - a.L,
    (a, b) => b.L - a.L || b.A - a.A
  ];

  let mejor = null, mejorOrden = items, mejorFit = 0, mejorRegla = 0;
  for (const cmp of ordenes) {
    const orden = [...items].sort(cmp);
    for (let fit = 0; fit < 3; fit++) for (let regla = 0; regla < 6; regla++) {
      if (mejor && trabajo > LIMITE) continue;
      const r = empaquetar(orden, fit, regla);
      if (!mejor || mejorQue(r, mejor)) { mejor = r; mejorOrden = orden; mejorFit = fit; mejorRegla = regla; }
    }
  }

  // Afinado: pequeños cambios de orden sobre la mejor solución
  let semilla = 20261108;
  const azar = n => {
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) % n;
  };
  for (let i = 0; i < 400 && items.length > 2 && trabajo <= LIMITE; i++) {
    const orden = [...mejorOrden];
    for (let k = 1 + azar(3); k > 0; k--) {
      const a = azar(orden.length), b = azar(orden.length);
      const t = orden[a]; orden[a] = orden[b]; orden[b] = t;
    }
    const r = empaquetar(orden, mejorFit, mejorRegla);
    if (mejorQue(r, mejor)) { mejor = r; mejorOrden = orden; }
  }

  const boards = (mejor ? mejor.tableros : []).map(t => {
    const area = t.piezas.reduce((s, p) => s + p.w * p.h, 0);
    return { piezas: t.piezas, libres: unirLibres(t.libres, kerf), area, pct: (area / (BW * BH)) * 100 };
  });
  const res = { boards, BW, BH, grandes };
  if (_cacheCorte.size >= 40) _cacheCorte.clear();
  _cacheCorte.set(clave, res);
  return res;
}

/* Une retazos contiguos del mismo ancho o alto para mostrarlos como uno solo */
function unirLibres(libres, kerf) {
  const r = libres.map(x => ({ ...x }));
  for (let hubo = true; hubo;) {
    hubo = false;
    for (let i = 0; i < r.length && !hubo; i++) for (let j = 0; j < r.length && !hubo; j++) {
      if (i === j) continue;
      const a = r[i], b = r[j];
      const vert = a.x === b.x && a.w === b.w && [a.y + a.h, a.y + a.h + kerf].includes(b.y);
      const horz = a.y === b.y && a.h === b.h && [a.x + a.w, a.x + a.w + kerf].includes(b.x);
      if (vert) a.h = b.y + b.h - a.y;
      else if (horz) a.w = b.x + b.w - a.x;
      if (vert || horz) { r.splice(j, 1); hubo = true; }
    }
  }
  return r;
}

/* Corte por bandas: franjas horizontales de lado a lado */
function optimizarBandas(lista, mat) {
  const kerf = +S.cfg.kerf || 0;
  const BW = +mat.fw, BH = +mat.fh;
  const rotar = !!S.cfg.rotar && !mat.veta;
  // expandir cantidades
  const items = [];
  lista.forEach(p => { for (let i = 0; i < p.q; i++) items.push({ ...p, w: p.L, h: p.A }); });
  // normalizar: w = dimensión larga si cabe
  items.forEach(it => {
    if (rotar && it.h > it.w && it.h <= BW && it.w <= BH) { const t = it.w; it.w = it.h; it.h = t; it.rot = true; }
  });
  const grandes = items.filter(it => (it.w > BW || it.h > BH) && (it.h > BW || it.w > BH));
  const ok = items.filter(it => !grandes.includes(it));
  ok.sort((a, b) => b.h - a.h || b.w - a.w);

  const boards = [];
  const nuevaPlancha = () => { const b = { rows: [], usada: 0, piezas: [] }; boards.push(b); return b; };

  ok.forEach(it => {
    let colocada = false;
    for (const b of boards) {
      // probar en bandas existentes
      for (const r of b.rows) {
        for (const orient of orientaciones(it)) {
          if (orient.h <= r.h && r.x + orient.w <= BW) {
            b.piezas.push({ ...it, x: r.x, y: r.y, w: orient.w, h: orient.h, rot: orient.rot });
            r.x += orient.w + kerf; colocada = true; break;
          }
        }
        if (colocada) break;
      }
      if (colocada) break;
      // nueva banda
      for (const orient of orientaciones(it)) {
        if (b.usada + orient.h <= BH && orient.w <= BW) {
          const r = { y: b.usada, h: orient.h, x: 0 };
          b.rows.push(r);
          b.piezas.push({ ...it, x: 0, y: r.y, w: orient.w, h: orient.h, rot: orient.rot });
          r.x = orient.w + kerf;
          b.usada += orient.h + kerf;
          colocada = true; break;
        }
      }
      if (colocada) break;
    }
    if (!colocada) {
      const b = nuevaPlancha();
      const orient = orientaciones(it).find(o => o.w <= BW && o.h <= BH) || orientaciones(it)[0];
      const r = { y: 0, h: orient.h, x: orient.w + kerf };
      b.rows.push(r);
      b.piezas.push({ ...it, x: 0, y: 0, w: orient.w, h: orient.h, rot: orient.rot });
      b.usada = orient.h + kerf;
    }
  });

  function orientaciones(it) {
    const o = [{ w: it.w, h: it.h, rot: !!it.rot }];
    if (rotar) o.push({ w: it.h, h: it.w, rot: !it.rot });
    return o;
  }

  boards.forEach(b => {
    b.area = b.piezas.reduce((s, p) => s + p.w * p.h, 0);
    b.pct = (b.area / (BW * BH)) * 100;
  });
  return { boards, BW, BH, grandes };
}

function optimizarTodo() {
  const todas = todasPiezas();
  const porMat = {};
  todas.forEach(p => { (porMat[p.mat] = porMat[p.mat] || []).push(p); });
  return Object.keys(porMat).map(mid => {
    const mat = S.mats.find(m => m.id === mid) || S.mats[0];
    return { mat, ...optimizar(porMat[mid], mat) };
  });
}
