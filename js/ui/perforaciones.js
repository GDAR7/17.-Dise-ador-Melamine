"use strict";
/* ============================================================
   PERFORACIONES (pestaña)
   ============================================================ */
function svgPlano(p) {
  const s = Math.min(520 / p.L, 120 / p.A), W = p.L * s, H = p.A * s, pad = 2;
  const circulos = p.marcas.map(c => `<circle cx="${c.x * s}" cy="${c.y * s}" r="${Math.max(2, c.r * s)}"/>`).join('');
  const lineas = (p.lineas || []).map(l => `<line x1="${l.x * s}" y1="${l.y0 * s}" x2="${l.x * s}" y2="${l.y1 * s}"/>`).join('');
  return `<svg class="plano" viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" width="${W + pad * 2}" height="${H + pad * 2}" role="img" aria-label="Plano de ${esc(p.titulo)}">
    <rect width="${W}" height="${H}"/>${lineas}${circulos}</svg>`;
}

function renderPerforaciones() {
  const box = $('#perbox');
  if (!S.mods.length) { box.innerHTML = emptyHtml('Sin perforaciones', 'Crea un módulo para ver sus perforaciones.'); return; }
  box.innerHTML = `<div class="note"><b>Medidas orientativas.</b> Son las habituales del oficio; confirma siempre con la ficha de tus herrajes. En cada plano el largo de la pieza va en horizontal, con el extremo inferior a la izquierda. En los laterales, el canto trasero queda arriba.</div>`
    + S.mods.map(m => {
      const planos = perforaciones(m);
      return `<div class="tcard"><div class="hd"><h3>${TIPOS[m.tipo].ic} ${esc(m.nom)}</h3><span class="sub">${m.ancho}×${m.alto}×${m.prof} mm</span></div>
        <div style="padding:12px">${planos.length ? planos.map(p => `<div class="perf">
          <div class="bh"><b>${esc(p.titulo)}</b><span class="sub">${nf(p.L)} × ${nf(p.A)} mm</span><div class="sp"></div><span class="pill">× ${p.cant}</span></div>
          ${svgPlano(p)}
          <div class="perf-txt"><b>${esc(p.herraje)}.</b> ${esc(p.detalle)}</div>
        </div>`).join('') : '<div class="perf-txt">Este mueble no lleva perforaciones de herrajes.</div>'}</div></div>`;
    }).join('');
}
