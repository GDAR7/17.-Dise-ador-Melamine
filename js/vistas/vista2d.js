"use strict";
/* ============================================================
   RENDER 2D (plano con cotas)
   ============================================================ */
const V2 = { vista: 'frontal', cotas: true, col: 0 };   // col: columna que se corta en la vista lateral

/* Escribe sobre cada zona su nombre y su alto */
function rotularZonas(ctx, m, e, X, Y) {
  const conTextura = !!texturaDe(S.mats.find(x => x.id === m.matF));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${imprimiendo ? 8.5 : 10}px Inter, sans-serif`;
  columnasMueble(m).forEach(({ c, x0, parte }) => {
    const W = +c.ancho || 0;
    zonasColumna(parte.vm, c, e).forEach(({ z, a: a0, b: b0 }) => {
      const a = a0 + parte.dy, b = b0 + parte.dy;
      if (Y(a) - Y(b) < 11) return;
      // Una zona abierta sin fondo deja ver el lienzo oscuro de la pantalla
      const hueco = z.tipo !== 'puerta' && z.tipo !== 'cajon';
      ctx.fillStyle = hueco && m.fondo === 'ninguno' && !imprimiendo ? '#9aa3b8' : 'rgba(20,16,10,.88)';
      const txt = trunc(ctx, `${z.nom} ${b - a}`, X(W) - X(0) - 6);
      if (conTextura) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeText(txt, X(x0 + W / 2), (Y(a) + Y(b)) / 2); }
      ctx.fillText(txt, X(x0 + W / 2), (Y(a) + Y(b)) / 2);
    });
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function draw2(cv = $('#cv2'), vista = V2.vista) {
  const ctx = cv.getContext('2d');
  const dpr = imprimiendo ? IMP.dpr : (window.devicePixelRatio || 1);
  const w = imprimiendo ? IMP.w2d : cv.clientWidth, h = imprimiendo ? IMP.h : cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const m = S.mods.find(x => x.id === S.sel);
  if (!m) { msgCv(ctx, w, h, 'Selecciona o crea un módulo'); return; }

  const mc = S.mats.find(x => x.id === m.matC) || S.mats[0];
  const mf = S.mats.find(x => x.id === m.matF) || mc;
  const e = mc.esp, ef = mf.esp;
  const Z = +m.zocalo || 0;
  // Un mueble por columnas toma sus medidas totales de la geometría: el escritorio con alzada suma las dos partes
  const gCol = esPorColumnas(m) ? geo(m) : null;
  const W = gCol ? gCol.W : +m.ancho, H = gCol ? gCol.H : +m.alto, D = gCol ? gCol.D : +m.prof;

  const front = vista === 'frontal';
  const cols = gCol ? columnasMueble(m) : [];
  const iCol = gCol ? Math.max(0, Math.min(V2.col, cols.length - 1)) : 0;
  const colLateral = gCol && !front && cols[iCol] ? cols[iCol].c : null;
  if (cv.id === 'cv2') {
    const selCol = $('#s2col');
    selCol.hidden = !colLateral;
    if (colLateral) selCol.innerHTML = cols.map(({ c, parte }, i) => `<option value="${i}" ${i === iCol ? 'selected' : ''}>${esc(parte.pre + c.nom)}</option>`).join('');
  }
  const ow = front ? W : D, oh = H;
  const pad = imprimiendo ? 50 : 78;
  const sc = Math.min((w - pad * 2) / ow, (h - pad * 2) / oh);
  const x0 = (w - ow * sc) / 2, y0 = (h - oh * sc) / 2;
  const X = v => x0 + v * sc;
  const Y = v => y0 + (oh - v) * sc;      // y desde abajo
  const rect = (x, y, bw, bh, fill, stroke) => {
    ctx.fillStyle = fill; ctx.fillRect(X(x), Y(y + bh), bw * sc, bh * sc);
    ctx.strokeStyle = stroke || 'rgba(0,0,0,.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(X(x), Y(y + bh), bw * sc, bh * sc);
  };
  // Los frentes llevan la veta en vertical, a lo largo de su altura
  const texFrente = (x, y, bw, bh) => {
    const tex = texturaDe(mf);
    if (!tex) return;
    const k = sc / pxPorMm(tex, mf);
    ctx.beginPath(); ctx.rect(X(x), Y(y + bh), bw * sc, bh * sc);
    if (mf.texGirar) rellenarTextura(ctx, tex, k, 0, 0, k, X(x), Y(y));
    else rellenarTextura(ctx, tex, 0, -k, k, 0, X(x), Y(y));
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(X(x), Y(y + bh), bw * sc, bh * sc);
  };

  // fondo del interior
  ctx.fillStyle = imprimiendo ? '#fff' : '#0d0f13';
  ctx.fillRect(X(0), Y(oh), ow * sc, oh * sc);

  if (gCol) {
    // De atrás hacia adelante, para que los frentes queden encima. La vista lateral es un corte por una sola columna:
    // se omiten los laterales del mueble y los de las cajas de cajón, que taparían el interior. El tablero no es de ninguna columna.
    const enCorte = b => b.col == null || (b.col === iCol && b.tag !== 'Lateral' && !(b.tag === 'Cajón' && b.w <= e));
    gCol.B.filter(b => front || enCorte(b)).sort((a, b) => a.z - b.z).forEach(b => {
      const frente = b.tag === 'Puerta' || b.tag === 'Frente cajón';
      rect(front ? b.x : b.z, b.y, front ? b.w : b.d, b.h, shade(b.c, frente ? .97 : .8));
      if (frente && front) texFrente(b.x, b.y, b.w, b.h);
    });
    if (front) rotularZonas(ctx, m, e, X, Y);
  } else if (front) {
    rect(0, 0, e, H, shade(mc.color, .72));
    rect(W - e, 0, e, H, shade(mc.color, .72));
    rect(e, Z, W - 2 * e, e, shade(mc.color, .9));
    rect(e, H - e, W - 2 * e, e, shade(mc.color, .9));
    const interior = interiorMueble(m, e);
    interior.divisiones.forEach(v => rect(v.x, v.y, e, v.alto, shade(mc.color, .78)));
    interior.repisas.forEach(r => rect(r.x, r.y, r.ancho, e, shade(mc.color, .86)));
    if (Z > 0) rect(e, 0, W - 2 * e, Z, shade(mc.color, .6));
    if (m.encimera) rect(0, H, W, ef, shade(mf.color, 1));
    // frentes
    const nc = +m.cajones || 0, hc = +m.altoCaj || 170;
    const f = montajeFrente(m, e, ef);
    ctx.globalAlpha = .93;
    for (let i = 0; i < nc; i++) {
      const x = f.x, bw = f.ancho;
      rect(x, Z + i * hc + 1, bw, hc - 3, shade(mf.color, .97), 'rgba(0,0,0,.6)');
      texFrente(x, Z + i * hc + 1, bw, hc - 3);
      // tirador
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(X(x + bw / 2 - 40), Y(Z + i * hc + hc / 2 + 4), 80 * sc, 8 * sc);
    }
    gruposPuertas(m).forEach(g => {
      const np = g.n;
      const pw = (f.ancho - 3 * (np - 1)) / np;
      const t = tramoPuertas(m, e, f.abajo, f.arriba, g);
      for (let i = 0; i < np && t.alto > 0; i++) {
        const x = f.x + i * (pw + 3);
        rect(x, t.y, pw, t.alto, shade(mf.color, .97), 'rgba(0,0,0,.6)');
        texFrente(x, t.y, pw, t.alto);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        const hx = i < np / 2 ? x + pw - 45 : x + 20;
        ctx.fillRect(X(hx), Y(t.y + t.alto / 2 + 45), 9 * sc, 90 * sc);
      }
    });
    ctx.globalAlpha = 1;
  } else {
    // lateral
    rect(0, 0, D, H, shade(mc.color, .66));
    ctx.fillStyle = imprimiendo ? '#fff' : '#0d0f13';
    ctx.fillRect(X(0), Y(H - e), D * sc, (H - 2 * e - Z) * sc);
    rect(0, Z, D, e, shade(mc.color, .9));
    rect(0, H - e, D, e, shade(mc.color, .9));
    new Map(interiorMueble(m, e).repisas.map(r => [r.y, r.prof])).forEach((prof, y) => rect(0, y, prof, e, shade(mc.color, .86)));
    if (Z > 0) rect(0, 0, D, Z, shade(mc.color, .6));
    if (m.encimera) rect(0, H, D + 25, ef, shade(mf.color, 1));
  }

  if (imprimiendo) {
    ctx.fillStyle = '#000'; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(front ? 'Vista frontal' : `Vista lateral${colLateral ? ` · ${colLateral.nom}` : ''}`, w / 2, 16);
    ctx.textAlign = 'left';
  }

  if (!V2.cotas) return;
  // ---- Cotas ----
  ctx.strokeStyle = (imprimiendo ? '#8a5a00' : '#f0a843'); ctx.fillStyle = (imprimiendo ? '#8a5a00' : '#f0a843');
  ctx.lineWidth = 1; ctx.font = '600 11px "JetBrains Mono", monospace';
  const dim = (ax, ay, bx, by, label, side) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const t = 4;
    ctx.beginPath();
    if (ay === by) { ctx.moveTo(ax, ay - t); ctx.lineTo(ax, ay + t); ctx.moveTo(bx, by - t); ctx.lineTo(bx, by + t); }
    else { ctx.moveTo(ax - t, ay); ctx.lineTo(ax + t, ay); ctx.moveTo(bx - t, by); ctx.lineTo(bx + t, by); }
    ctx.stroke();
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    ctx.save();
    if (ay !== by) { ctx.translate(mx, my); ctx.rotate(-Math.PI / 2); ctx.translate(-mx, -my); }
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = imprimiendo ? '#fff' : '#12141a'; ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 15);
    ctx.fillStyle = (imprimiendo ? '#8a5a00' : '#f0a843'); ctx.textAlign = 'center'; ctx.fillText(label, mx, my + 4);
    ctx.restore(); ctx.textAlign = 'left';
  };
  const yb2 = Y(0) + 32, xl = X(0) - 34;
  dim(X(0), yb2, X(ow), yb2, `${ow} mm`);
  dim(xl, Y(0), xl, Y(oh), `${oh} mm`);
  // guías
  ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(240,168,67,.35)';
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), yb2 + 6);
  ctx.moveTo(X(ow), Y(0)); ctx.lineTo(X(ow), yb2 + 6);
  ctx.moveTo(X(0), Y(0)); ctx.lineTo(xl - 6, Y(0));
  ctx.moveTo(X(0), Y(oh)); ctx.lineTo(xl - 6, Y(oh));
  ctx.stroke(); ctx.setLineDash([]);

  // profundidad / altos parciales
  ctx.fillStyle = '#6b7489'; ctx.font = '500 11px Inter, sans-serif';
  ctx.fillText(front ? `Profundidad ${D} mm · esp. ${e} mm` : `Ancho ${colLateral ? colLateral.ancho : W} mm · esp. ${e} mm`, X(0), Y(oh) - 14);
  if (Z > 0) {
    ctx.strokeStyle = '#5b9dd9'; ctx.fillStyle = '#5b9dd9'; ctx.font = '600 10px "JetBrains Mono",monospace';
    dim(X(ow) + 22, Y(0), X(ow) + 22, Y(Z), `${Z}`);
  }
}
