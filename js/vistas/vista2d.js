"use strict";
/* ============================================================
   RENDER 2D (plano con cotas)
   ============================================================ */
const V2 = { vista: 'frontal', cotas: true };

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
  const W = +m.ancho, H = +m.alto, D = +m.prof, Z = +m.zocalo || 0;

  const front = vista === 'frontal';
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

  // fondo del interior
  ctx.fillStyle = imprimiendo ? '#fff' : '#0d0f13';
  ctx.fillRect(X(0), Y(oh), ow * sc, oh * sc);

  if (front) {
    rect(0, 0, e, H, shade(mc.color, .72));
    rect(W - e, 0, e, H, shade(mc.color, .72));
    rect(e, Z, W - 2 * e, e, shade(mc.color, .9));
    rect(e, H - e, W - 2 * e, e, shade(mc.color, .9));
    const nd = +m.divs || 0, Wi = W - 2 * e, vanos = nd + 1, av = (Wi - nd * e) / vanos;
    const nr = +m.repisas || 0, ya = Z + e, yb = H - e, j = apoyoDivision(m);
    const yDiv = j ? yRepisa(m, e, j) + e : ya;
    for (let i = 1; i <= nd; i++) rect(e + i * av + (i - 1) * e, yDiv, e, yb - yDiv, shade(mc.color, .78));
    for (let i = 1; i <= nr; i++) {
      const y = ya + (yb - ya) * i / (nr + 1) - e / 2;
      if (i <= j) { rect(e, y, Wi, e, shade(mc.color, .86)); continue; }
      for (let v = 0; v < vanos; v++) rect(e + v * (av + e), y, av, e, shade(mc.color, .86));
    }
    if (Z > 0) rect(e, 0, W - 2 * e, Z, shade(mc.color, .6));
    if (m.encimera) rect(0, H, W, ef, shade(mf.color, 1));
    // frentes
    const nc = +m.cajones || 0, hc = +m.altoCaj || 170, np = +m.puertas || 0;
    const supe = m.tipoP === 'superpuesta';
    ctx.globalAlpha = .93;
    for (let i = 0; i < nc; i++) {
      const x = supe ? 0 : e + 2, bw = supe ? W : W - 2 * e - 4;
      rect(x, Z + i * hc + 1, bw, hc - 3, shade(mf.color, .97), 'rgba(0,0,0,.6)');
      // tirador
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(X(x + bw / 2 - 40), Y(Z + i * hc + hc / 2 + 4), 80 * sc, 8 * sc);
    }
    if (np > 0) {
      const yB = Z + nc * hc;
      const hT = (supe ? H - (m.encimera ? 0 : 0) : H - e) - yB - 2;
      const wT = supe ? W : W - 2 * e - 4, xx = supe ? 0 : e + 2;
      const pw = (wT - 3 * (np - 1)) / np;
      const t = tramoPuertas(m, e, yB + 1, yB + 1 + hT);
      for (let i = 0; i < np && t.alto > 0; i++) {
        const x = xx + i * (pw + 3);
        rect(x, t.y, pw, t.alto, shade(mf.color, .97), 'rgba(0,0,0,.6)');
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        const hx = i < np / 2 ? x + pw - 45 : x + 20;
        ctx.fillRect(X(hx), Y(t.y + t.alto / 2 + 45), 9 * sc, 90 * sc);
      }
    }
    ctx.globalAlpha = 1;
  } else {
    // lateral
    rect(0, 0, D, H, shade(mc.color, .66));
    ctx.fillStyle = imprimiendo ? '#fff' : '#0d0f13';
    ctx.fillRect(X(0), Y(H - e), D * sc, (H - 2 * e - Z) * sc);
    rect(0, Z, D, e, shade(mc.color, .9));
    rect(0, H - e, D, e, shade(mc.color, .9));
    const nr = +m.repisas || 0, ya = Z + e, yb = H - e;
    for (let i = 1; i <= nr; i++) {
      const y = ya + (yb - ya) * i / (nr + 1) - e / 2;
      rect(0, y, D - (+m.retr || 0), e, shade(mc.color, .86));
    }
    if (Z > 0) rect(0, 0, D, Z, shade(mc.color, .6));
    if (m.encimera) rect(0, H, D + 25, ef, shade(mf.color, 1));
  }

  if (imprimiendo) {
    ctx.fillStyle = '#000'; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(front ? 'Vista frontal' : 'Vista lateral', w / 2, 16);
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
  ctx.fillText(front ? `Profundidad ${D} mm · esp. ${e} mm` : `Ancho ${W} mm · esp. ${e} mm`, X(0), Y(oh) - 14);
  if (Z > 0) {
    ctx.strokeStyle = '#5b9dd9'; ctx.fillStyle = '#5b9dd9'; ctx.font = '600 10px "JetBrains Mono",monospace';
    dim(X(ow) + 22, Y(0), X(ow) + 22, Y(Z), `${Z}`);
  }
}
