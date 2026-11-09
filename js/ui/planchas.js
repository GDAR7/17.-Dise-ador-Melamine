"use strict";
/* ============================================================
   PLANCHAS (optimización)
   ============================================================ */
function renderOpt() {
  const box = $('#optbox');
  const grupos = optimizarTodo();
  if (!grupos.length) { box.innerHTML = emptyHtml('Sin planchas', 'Crea un módulo para calcular el corte.'); return; }
  _gi = 0;
  const modoBandas = S.cfg.modoCorte === 'bandas';

  const totPl =grupos.reduce((s, g) => s + g.boards.length, 0);
  const areaU = grupos.reduce((s, g) => s + g.boards.reduce((a, b) => a + b.area, 0), 0) / 1e6;
  const areaT = grupos.reduce((s, g) => s + g.boards.length * g.BW * g.BH, 0) / 1e6;
  const apr = areaT ? areaU / areaT * 100 : 0;

  let h = `<div class="seg" id="segCorte" style="width:max-content;max-width:100%;margin-bottom:12px">
    <button data-modo="max" class="${modoBandas ? '' : 'on'}">Máximo aprovechamiento</button>
    <button data-modo="bandas" class="${modoBandas ? 'on' : ''}">Por bandas</button>
  </div>
  <div class="stats">
    <div class="stat acc"><div class="k">Planchas necesarias</div><div class="v">${totPl}</div></div>
    <div class="stat gr"><div class="k">Aprovechamiento</div><div class="v">${nf(apr, 1)}<small>%</small></div></div>
    <div class="stat bl"><div class="k">Área utilizada</div><div class="v">${nf(areaU, 2)} <small>m²</small></div></div>
    <div class="stat"><div class="k">Desperdicio</div><div class="v">${nf(areaT - areaU, 2)} <small>m²</small></div></div>
  </div>
  ${modoBandas
    ? `<div class="note"><b>Corte por bandas (guillotina).</b> Las piezas se agrupan en franjas horizontales, igual que lo hace una sierra escuadradora: primero cortes de lado a lado y luego cortes dentro de cada franja. Se descuenta ${S.cfg.kerf} mm de sierra entre piezas.</div>`
    : `<div class="note"><b>Máximo aprovechamiento (guillotina libre).</b> Sin franjas fijas: cada corte atraviesa de lado a lado el trozo que se está cortando, y las piezas aprovechan los espacios sobrantes. ${S.cfg.rotar ? 'Las piezas marcadas con ↻ van giradas.' : 'Las piezas no se giran; activa «Permitir girar piezas» si el material no tiene veta.'} Se descuenta ${S.cfg.kerf} mm de sierra entre piezas.</div>`}
  <div class="note"><b>Tapacanto:</b> la línea roja discontinua marca los lados de cada pieza que llevan tapacanto.</div>`;

  grupos.forEach(g => {
    if (g.grandes.length) {
      h += `<div class="note" style="border-left-color:var(--red)"><b>Atención:</b> ${g.grandes.length} pieza(s) de ${esc(g.mat.nom)} no caben en la plancha de ${g.BW}×${g.BH} mm. Revisa medidas o divide la pieza.</div>`;
    }
    h += `<div class="tcard"><div class="hd">
      <h3 style="display:flex;align-items:center;gap:8px"><i style="width:12px;height:12px;border-radius:3px;background:${g.mat.color};display:block"></i>${esc(g.mat.nom)}</h3>
      <span class="sub">Plancha ${g.BW} × ${g.BH} mm</span><div class="sp"></div>
      <span class="pill y">${g.boards.length} plancha(s)</span></div>
      <div style="padding:12px">${g.boards.map((b, i) => boardHtml(b, i, g)).join('') || '<div style="color:var(--txt3);font-size:12px">—</div>'}</div></div>`;
  });
  box.innerHTML = h;
  box.querySelectorAll('#segCorte button').forEach(btn => btn.onclick = () => { S.cfg.modoCorte = btn.dataset.modo; recalc(); });
  // dibujar
  grupos.forEach((g, gi) => g.boards.forEach((b, bi) => drawBoard(`bcv-${gi}-${bi}`, b, g)));
}

let _gi = 0;
function boardHtml(b, i, g) {
  const gi = g._i != null ? g._i : (g._i = _gi++);
  const cls = b.pct > 80 ? 'g' : b.pct > 60 ? 'y' : 'r';
  return `<div class="board">
    <div class="bh"><b>Plancha ${i + 1}</b>
      <span class="sub">${b.piezas.length} piezas</span><div class="sp"></div>
      <span class="pill ${cls}">${nf(b.pct, 1)}% usado</span></div>
    <canvas class="bcv" id="bcv-${gi}-${i}"></canvas></div>`;
}

function drawBoard(id, b, g) {
  const cv = document.getElementById(id); if (!cv) return;
  const W = imprimiendo ? IMP.w : (cv.clientWidth || 600);
  const ar = g.BH / g.BW;
  const H = Math.round(W * ar);
  const dpr = imprimiendo ? IMP.dpr : (window.devicePixelRatio || 1);
  cv.style.height = H + 'px';
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = W / g.BW;
  ctx.fillStyle = imprimiendo ? '#fff' : '#15171d'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#3d4559'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, W - 1, H - 1);

  const tex = texturaDe(g.mat);
  // Con textura se escribe con un halo claro, para que el texto se lea sobre cualquier imagen
  const rotulo = (txt, tx, ty) => {
    if (tex) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeText(txt, tx, ty); }
    ctx.fillText(txt, tx, ty);
  };

  b.piezas.forEach(p => {
    const x = p.x * sc, y = p.y * sc, w = p.w * sc, h = p.h * sc;
    ctx.fillStyle = shade(g.mat.color, .82);
    ctx.fillRect(x, y, w, h);
    if (tex) {
      // La imagen representa la plancha: cada pieza muestra la parte de la que realmente sale
      const k = sc / pxPorMm(tex, g.mat);
      ctx.beginPath(); ctx.rect(x, y, w, h);
      if (g.mat.texGirar) rellenarTextura(ctx, tex, 0, k, k, 0, 0, 0);
      else rellenarTextura(ctx, tex, k, 0, 0, k, 0, 0);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    dibujarCantos(ctx, p, x, y, w, h);
    // etiqueta
    const lbl = `${p.L}×${p.A}`;
    const nmz = p.nom;
    ctx.fillStyle = 'rgba(20,16,10,.88)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (h > 26 && w > 58) {
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      rotulo(lbl, x + w / 2, y + h / 2 - (h > 40 ? 6 : 0));
      if (h > 40) { ctx.font = '500 9px Inter, sans-serif'; rotulo(trunc(ctx, nmz, w - 8), x + w / 2, y + h / 2 + 7); }
    } else if (h > 12 && w > 42) {
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      rotulo(lbl, x + w / 2, y + h / 2);
    }
    if (p.rot) {
      ctx.fillStyle = 'rgba(91,157,217,.9)'; ctx.font = '700 8px Inter';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (w > 20 && h > 14) ctx.fillText('↻', x + 3, y + 2);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  });
  // sobrantes del modo máximo aprovechamiento
  if (b.libres) {
    b.libres.filter(r => Math.min(r.w, r.h) >= 50).forEach(r => {
      const x = r.x * sc, y = r.y * sc, w = r.w * sc, h = r.h * sc;
      ctx.fillStyle = 'rgba(95,191,143,.10)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(95,191,143,.5)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + .5, y + .5, Math.max(0, w - 1), Math.max(0, h - 1)); ctx.setLineDash([]);
      const med = `${Math.round(r.w)} × ${Math.round(r.h)}`;
      const txt = `Retazo: ${med} mm`;
      ctx.fillStyle = imprimiendo ? '#1c7a4c' : '#5fbf8f'; ctx.font = '600 10px Inter'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      if (w > ctx.measureText(txt).width + 10 && h > 16) ctx.fillText(txt, x + w / 2, y + h / 2);
      else if (w > ctx.measureText(med).width + 8 && h > 14) ctx.fillText(med, x + w / 2, y + h / 2);
      else if (h > ctx.measureText(med).width + 8 && w > 14) {
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText(med, 0, 0); ctx.restore();
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    return;
  }
  // sobrante
  const uy = b.usada * sc;
  if (uy < H - 2) {
    ctx.fillStyle = 'rgba(95,191,143,.10)'; ctx.fillRect(0, uy, W, H - uy);
    ctx.strokeStyle = 'rgba(95,191,143,.5)'; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, uy); ctx.lineTo(W, uy); ctx.stroke(); ctx.setLineDash([]);
    if (H - uy > 18) {
      ctx.fillStyle = imprimiendo ? '#1c7a4c' : '#5fbf8f'; ctx.font = '600 10px Inter';
      ctx.fillText(`Retazo aprovechable: ${Math.round(g.BH - b.usada)} × ${g.BW} mm`, 7, uy + 14);
    }
  }
}
/* Marca con línea discontinua los lados de la pieza que llevan tapacanto */
function dibujarCantos(ctx, p, x, y, w, h) {
  const m = 4; // separación respecto al borde de la pieza
  if (Math.min(w, h) < m * 3) return;
  // Una pieza girada lleva sus lados girados 90° en sentido antihorario.
  const { L1, L2, A1, A2 } = p.lados;
  const [abajo, arriba, der, izq] = p.rot ? [A2, A1, L1, L2] : [L1, L2, A1, A2];
  const lados = [];
  if (abajo) lados.push([x + m, y + h - m, x + w - m, y + h - m]);
  if (arriba) lados.push([x + m, y + m, x + w - m, y + m]);
  if (der) lados.push([x + w - m, y + m, x + w - m, y + h - m]);
  if (izq) lados.push([x + m, y + m, x + m, y + h - m]);

  const trazar = (color, grosor, guiones) => {
    ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.setLineDash(guiones);
    ctx.beginPath();
    lados.forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); });
    ctx.stroke();
  };
  trazar('rgba(255,255,255,.8)', 3.5, []); // base clara: mantiene la línea visible sobre cualquier color
  trazar('#d81e1e', 1.8, [7, 4]);
  ctx.setLineDash([]);
}

function trunc(ctx, t, max) {
  if (ctx.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 3 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}
