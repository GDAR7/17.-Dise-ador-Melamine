"use strict";
/* ============================================================
   DESPIECE
   ============================================================ */
function renderDespiece() {
  const box = $('#desbox');
  const todas = todasPiezas();
  if (!todas.length) { box.innerHTML = emptyHtml('Sin piezas', 'Crea un módulo para generar el despiece.'); return; }

  // agrupar piezas idénticas
  const key = p => [p.modId, p.nom, p.L, p.A, p.mat].join('|');
  const agr = {};
  todas.forEach(p => { agr[key(p)] = agr[key(p)] ? (agr[key(p)].q += p.q, agr[key(p)]) : { ...p }; });
  const filas = Object.values(agr);

  // por módulo
  const porMod = {};
  filas.forEach(p => (porMod[p.modId] = porMod[p.modId] || []).push(p));

  const totalPz = filas.reduce((s, p) => s + p.q, 0);
  const m2 = filas.reduce((s, p) => s + p.q * p.L * p.A, 0) / 1e6;
  const tc = tapacantoML();

  let h = `<div class="stats">
    <div class="stat"><div class="k">Piezas totales</div><div class="v">${nf(totalPz)}</div></div>
    <div class="stat bl"><div class="k">Área de melamina</div><div class="v">${nf(m2, 2)} <small>m²</small></div></div>
    <div class="stat acc"><div class="k">Tapacanto</div><div class="v">${nf(tc, 1)} <small>m</small></div></div>
    <div class="stat gr"><div class="k">Tipos de pieza</div><div class="v">${filas.length}</div></div>
  </div>
  <div class="note"><b>Cómo leer el despiece.</b> <i>Largo</i> es la dimensión que corre con la veta. <i>C.L</i> y <i>C.A</i> son cuántos cantos se enchapan en cada dirección. El fondo y el interior de cajones no llevan tapacanto.</div>`;

  S.mods.forEach(m => {
    const fs = porMod[m.id]; if (!fs) return;
    const sub = fs.reduce((s, p) => s + p.q, 0);
    h += `<div class="tcard">
      <div class="hd"><h3>${TIPOS[m.tipo].ic} ${esc(m.nom)}</h3>
        <span class="sub">${m.ancho}×${m.alto}×${m.prof} mm${(+m.qty || 1) > 1 ? ` · ×${m.qty} unidades` : ''}</span>
        <div class="sp"></div><span class="pill">${sub} piezas</span></div>
      <div class="tscroll"><table>
        <thead><tr><th>Pieza</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Cant.</th>
        <th class="n">C.L</th><th class="n">C.A</th><th>Material</th><th class="n">Canto m</th></tr></thead>
        <tbody>${fs.map(p => `<tr>
          <td class="nm">${esc(p.nom)}</td>
          <td class="n">${nf(p.L)}</td><td class="n">${nf(p.A)}</td>
          <td class="n">${p.q}</td>
          <td class="n">${p.cL || '–'}</td><td class="n">${p.cA || '–'}</td>
          <td style="font-size:11px">${esc(p.matNom)}</td>
          <td class="n">${nf(p.q * (p.cL * p.L + p.cA * p.A) / 1000, 2)}</td></tr>`).join('')}
        </tbody></table></div></div>`;
  });

  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <button class="btn" id="bCsv">⧉ Copiar despiece (CSV)</button>
    <button class="btn" id="bTxt">⧉ Copiar lista para el carpintero</button></div>`;
  box.innerHTML = h;

  $('#bCsv').onclick = () => {
    const rows = [['Modulo', 'Pieza', 'Largo_mm', 'Ancho_mm', 'Cantidad', 'Cantos_largo', 'Cantos_ancho', 'Material', 'Tapacanto_m']];
    filas.forEach(p => rows.push([p.mod, p.nom, p.L, p.A, p.q, p.cL, p.cA, p.matNom, (p.q * (p.cL * p.L + p.cA * p.A) / 1000).toFixed(2)]));
    copy(rows.map(r => r.join(';')).join('\n'), 'Despiece copiado en CSV');
  };
  $('#bTxt').onclick = () => {
    let t = `DESPIECE — ${S.proyecto}\n${'='.repeat(46)}\n`;
    S.mods.forEach(m => {
      const fs = porMod[m.id]; if (!fs) return;
      t += `\n${m.nom}  (${m.ancho}x${m.alto}x${m.prof} mm)${(+m.qty || 1) > 1 ? ` x${m.qty}` : ''}\n`;
      fs.forEach(p => t += `  ${String(p.q).padStart(3)} u  ${String(p.L).padStart(5)} x ${String(p.A).padStart(5)} mm  ${p.nom}  [${p.matNom}]\n`);
    });
    t += `\nTapacanto total: ${tc.toFixed(1)} m\nÁrea: ${m2.toFixed(2)} m²\n`;
    copy(t, 'Lista copiada');
  };
}

function copy(txt, msg) {
  navigator.clipboard.writeText(txt).then(() => toast(msg)).catch(() => toast('No se pudo copiar'));
}
function emptyHtml(t, p) {
  return `<div class="empty"><div class="big">▦</div><h3>${t}</h3><p>${p}</p></div>`;
}
