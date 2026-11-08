"use strict";
/* ============================================================
   GEOMETRÍA 3D  (lista de cajas)
   ============================================================ */
function geo(m, opts = {}) {
  if (m.tipo === 'columnas') return geoColumnas(m, opts);
  const mc = S.mats.find(x => x.id === m.matC) || S.mats[0];
  const mf = S.mats.find(x => x.id === m.matF) || mc;
  const mb = S.mats.find(x => x.id === m.matB) || mc;
  const e = mc.esp, ef = mf.esp, eb = mb.esp;
  const W = +m.ancho, H = +m.alto, D = +m.prof, Z = +m.zocalo || 0;
  const B = [];
  const box = (x, y, z, w, h, d, c, tag) => B.push({ x, y, z, w, h, d, c, tag });
  const cC = mc.color, cF = mf.color, cB = mb.color;

  box(0, 0, 0, e, H, D, cC, 'Lateral');
  box(W - e, 0, 0, e, H, D, cC, 'Lateral');
  box(e, Z, 0, W - 2 * e, e, D, cC, 'Piso');
  box(e, H - e, 0, W - 2 * e, e, D, cC, 'Techo');

  const nd = +m.divs || 0;
  const Wi = W - 2 * e;
  const vanos = nd + 1;
  const av = (Wi - nd * e) / vanos;
  const nr = +m.repisas || 0;
  const y0 = Z + e, y1 = H - e, j = apoyoDivision(m);
  const yDiv = j ? yRepisa(m, e, j) + e : y0;
  for (let i = 1; i <= nd; i++) {
    const x = e + i * av + (i - 1) * e;
    box(x, yDiv, 0, e, y1 - yDiv, D, cC, 'División');
  }

  for (let i = 1; i <= nr; i++) {
    const y = y0 + (y1 - y0) * i / (nr + 1) - e / 2;
    if (i <= j) { box(e, y, 0, Wi, e, D - (+m.retr || 0), cC, 'Repisa'); continue; }
    for (let v = 0; v < vanos; v++) {
      const x = e + v * (av + e);
      box(x, y, 0, av, e, D - (+m.retr || 0), cC, 'Repisa');
    }
  }

  if (Z > 0) {
    box(e, 0, D - e, W - 2 * e, Z, e, cC, 'Zócalo');
    box(e, 0, 0, W - 2 * e, Z, e, cC, 'Zócalo');
  }

  if (opts.fondo !== false && m.fondo !== 'ninguno') {
    if (m.fondo === 'clavado') box(0, Z, -eb, W, H - Z, eb, cB, 'Fondo');
    else box(e - 6, Z + e - 6, 0, Wi + 12, H - 2 * e - Z + 12, eb, cB, 'Fondo');
  }

  if (m.encimera) box(0, H, -0, W, ef, D + 25, cF, 'Encimera');

  const nc = +m.cajones || 0, hc = +m.altoCaj || 170;
  const np = +m.puertas || 0;
  const zf = m.tipoP === 'superpuesta' ? D : D - ef;
  const supe = m.tipoP === 'superpuesta';

  if (opts.puertas !== false) {
    // frentes de cajón abajo
    for (let i = 0; i < nc; i++) {
      const y = Z + i * hc;
      const x = supe ? 0 : e + 2;
      const w = supe ? W : Wi - 4;
      box(x, y + 1, zf, w, hc - 3, ef, cF, 'Frente cajón');
    }
    // puertas arriba
    if (np > 0) {
      const yBase = Z + nc * hc;
      const hTot = (supe ? H - (m.encimera ? ef : 0) : H - e) - yBase - 2;
      const wTot = supe ? W : Wi - 4;
      const x0 = supe ? 0 : e + 2;
      const pw = (wTot - 3 * (np - 1)) / np;
      const t = tramoPuertas(m, e, yBase + 1, yBase + 1 + hTot);
      if (t.alto > 0) for (let i = 0; i < np; i++) box(x0 + i * (pw + 3), t.y, zf, pw, t.alto, ef, cF, 'Puerta');
    }
  }
  return { B, W, H, D: D + (m.encimera ? 25 : 0) };
}

/* ============================================================
   RENDER 3D
   ============================================================ */
const V3 = { yaw: -0.52, pitch: 0.28, zoom: 1, all: false, puertas: true, fondo: true, drag: null };

function draw3() {
  const cv = $('#cv3'), ctx = cv.getContext('2d');
  const dpr = imprimiendo ? IMP.dpr : (window.devicePixelRatio || 1);
  const w = imprimiendo ? IMP.w : cv.clientWidth, h = imprimiendo ? IMP.h : cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const mods = V3.all ? S.mods : (S.sel ? [S.mods.find(m => m.id === S.sel)].filter(Boolean) : []);
  if (!mods.length) { msgCv(ctx, w, h, 'Selecciona o crea un módulo'); $('#leg3').innerHTML = ''; return; }

  // Ensamblar escena (módulos lado a lado)
  let boxes = [], ox = 0, maxH = 0, maxD = 0;
  mods.forEach(m => {
    const n = V3.all ? (+m.qty || 1) : 1;
    for (let i = 0; i < n; i++) {
      const g = geo(m, { puertas: V3.puertas, fondo: V3.fondo });
      g.B.forEach(b => boxes.push({ ...b, x: b.x + ox }));
      ox += g.W + (V3.all ? 20 : 0);
      maxH = Math.max(maxH, g.H); maxD = Math.max(maxD, g.D);
    }
  });
  const totW = ox;
  const cx0 = totW / 2, cy0 = maxH / 2, cz0 = maxD / 2;

  // escala
  const span = Math.max(totW, maxH, maxD) * 1.45;
  const sc = Math.min(w, h) / span * V3.zoom;

  const cy = Math.cos(V3.yaw), sy = Math.sin(V3.yaw);
  const cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch);
  const F = span * 2.6;
  function pr(p) {
    // El frente del mueble (z mayor) queda hacia el observador, con la izquierda a la izquierda
    const x = p[0] - cx0, y = p[1] - cy0, z = cz0 - p[2];
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const k = F / (F + z2 + span * 0.1);
    return [w / 2 + x1 * sc * k, h / 2 - y2 * sc * k, z2];
  }

  // Caras
  const faces = [];
  const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const FI = [
    { i: [4, 5, 6, 7], l: 1.00 },  // frente
    { i: [1, 0, 3, 2], l: 0.42 },  // atrás
    { i: [5, 1, 2, 6], l: 0.70 },  // derecha
    { i: [0, 4, 7, 3], l: 0.58 },  // izquierda
    { i: [7, 6, 2, 3], l: 0.92 },  // arriba
    { i: [0, 1, 5, 4], l: 0.34 }   // abajo
  ];
  boxes.forEach(b => {
    const V = C.map(c => pr([b.x + c[0] * b.w, b.y + c[1] * b.h, b.z + c[2] * b.d]));
    FI.forEach(f => {
      const pts = f.i.map(k => V[k]);
      const z = pts.reduce((s, p) => s + p[2], 0) / 4;
      faces.push({ pts, z, c: b.c, l: f.l, tag: b.tag });
    });
  });
  faces.sort((a, b) => b.z - a.z);

  // Piso sombra
  ctx.save();
  const sh = [[0, 0, 0], [totW, 0, 0], [totW, 0, maxD], [0, 0, maxD]].map(pr);
  ctx.beginPath(); ctx.moveTo(sh[0][0], sh[0][1]);
  sh.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.filter = 'blur(2px)'; ctx.fill();
  ctx.restore();

  faces.forEach(f => {
    ctx.beginPath();
    ctx.moveTo(f.pts[0][0], f.pts[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = shade(f.c, f.l);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.30)'; ctx.lineWidth = 0.6; ctx.stroke();
  });

  // Cotas generales
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillStyle = imprimiendo ? '#333' : '#9aa3b8';
  const mm = mods[0];
  const txt = V3.all
    ? `Proyecto · ${S.mods.length} módulo(s) · ${S.mods.reduce((s, m) => s + (+m.qty || 1), 0)} unidad(es)`
    : `${mm.nom} · ${mm.ancho} × ${mm.alto} × ${mm.prof} mm`;
  ctx.fillText(txt, 12, h - 28);

  // Leyenda materiales
  const usados = {};
  boxes.forEach(b => usados[b.c] = true);
  const legm = S.mats.filter(m => usados[m.color]);
  $('#leg3').innerHTML = legm.map(m => `<div><i style="background:${m.color}"></i><span>${m.nom}</span></div>`).join('')
    || '<div><span style="color:var(--txt3)">—</span></div>';
}

function shade(hex, l) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const f = v => cl(Math.round(v * l), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function msgCv(ctx, w, h, t) {
  ctx.font = '500 13px Inter, sans-serif'; ctx.fillStyle = '#6b7489';
  ctx.textAlign = 'center'; ctx.fillText(t, w / 2, h / 2); ctx.textAlign = 'left';
}

/* ---------- interacción 3D ---------- */
(function () {
  const cv = $('#cv3');
  let last = null, pinch = null;
  const pos = e => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  const down = e => { last = pos(e); };
  const move = e => {
    if (e.touches && e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) { V3.zoom = cl(V3.zoom * (d / pinch), .3, 4); draw3(); }
      pinch = d; e.preventDefault(); return;
    }
    if (!last) return;
    const p = pos(e);
    V3.yaw += (p.x - last.x) * 0.009;
    V3.pitch = cl(V3.pitch + (p.y - last.y) * 0.007, -1.35, 1.35);
    last = p; draw3();
    if (e.touches) e.preventDefault();
  };
  const up = () => { last = null; pinch = null; };
  cv.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  cv.addEventListener('touchstart', down, { passive: true });
  cv.addEventListener('touchmove', move, { passive: false });
  cv.addEventListener('touchend', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); V3.zoom = cl(V3.zoom * (e.deltaY < 0 ? 1.1 : .9), .3, 4); draw3(); }, { passive: false });
})();
