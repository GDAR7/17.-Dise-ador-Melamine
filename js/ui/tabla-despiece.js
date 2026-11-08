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
  <div class="note"><b>Cómo leer el despiece.</b> <i>Largo</i> es la dimensión que corre con la veta. <i>C.L</i> y <i>C.A</i> son cuántos cantos se enchapan en cada dirección. <b>Haz clic en un lado del dibujo de la columna Lados</b> para poner o quitar el tapacanto: el dibujo tiene el largo en horizontal, y los metros, el costo y el plano de corte se actualizan solos.</div>`;

  S.mods.forEach(m => {
    const fs = porMod[m.id]; if (!fs) return;
    const sub = fs.reduce((s, p) => s + p.q, 0);
    h += `<div class="tcard">
      <div class="hd"><h3>${TIPOS[m.tipo].ic} ${esc(m.nom)}</h3>
        <span class="sub">${m.ancho}×${m.alto}×${m.prof} mm${(+m.qty || 1) > 1 ? ` · ×${m.qty} unidades` : ''}</span>
        <div class="sp"></div><span class="pill">${sub} piezas</span></div>
      <div class="tscroll"><table>
        <thead><tr><th>Pieza</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Cant.</th>
        <th class="n">C.L</th><th class="n">C.A</th><th class="n">Lados</th><th>Material</th><th class="n">Canto m</th></tr></thead>
        <tbody>${fs.map(p => `<tr data-i="${filas.indexOf(p)}" data-mod="${p.modId}" data-nom="${esc(p.nom)}">
          <td class="nm">${esc(p.nom)}</td>
          <td class="n">${nf(p.L)}</td><td class="n">${nf(p.A)}</td>
          <td class="n">${p.q}</td>
          <td class="n">${p.cL || '–'}</td><td class="n">${p.cA || '–'}</td>
          <td class="n">${selectorLados(p, filas.indexOf(p))}</td>
          <td style="font-size:11px">${esc(p.matNom)}</td>
          <td class="n">${nf(p.q * (p.cL * p.L + p.cA * p.A) / 1000, 2)}</td></tr>`).join('')}
        </tbody></table></div></div>`;
  });

  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <button class="btn" id="bCsv">⧉ Copiar despiece (CSV)</button>
    <button class="btn" id="bTxt">⧉ Copiar lista para el carpintero</button></div>`;
  box.innerHTML = h;

  box.querySelectorAll('tbody tr').forEach(tr => tr.onclick = e => {
    if (!e.target.closest('.lado')) seleccionarPieza(filas[tr.dataset.i]);
  });

  box.querySelectorAll('.lado').forEach(b => b.onclick = () => {
    const { i, lado } = b.dataset;
    const p = filas[i];
    const m = S.mods.find(x => x.id === p.modId);
    (m.cantos = m.cantos || {})[p.nom] = { ...p.lados, [lado]: !p.lados[lado] };
    recalc();
    const nuevo = box.querySelector(`.lado[data-i="${i}"][data-lado="${lado}"]`);
    if (nuevo) nuevo.focus();
  });

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

/* Resalta en 3D la pieza de la fila elegida; un segundo clic la deselecciona */
function seleccionarPieza(p) {
  const misma = V3.sel && V3.sel.modId === p.modId && V3.sel.nom === p.nom;
  V3.sel = misma ? null : { modId: p.modId, nom: p.nom };
  if (V3.sel && S.sel !== p.modId) { S.sel = p.modId; renderList(); renderParams(); }
  marcarSeleccion();
  draw3();
}

/* Sincroniza la fila marcada, los textos y la vista isométrica con la selección */
function marcarSeleccion() {
  if (V3.sel && !todasPiezas().some(p => p.modId === V3.sel.modId && p.nom === V3.sel.nom)) V3.sel = null;
  $$('#desbox tbody tr').forEach(tr => tr.classList.toggle('sel', !!V3.sel && tr.dataset.mod === V3.sel.modId && tr.dataset.nom === V3.sel.nom));
  const chip = $('#b3sel');
  chip.hidden = !V3.sel;
  chip.textContent = V3.sel ? `✕ ${V3.sel.nom}` : '';
  $('#isoTit').textContent = V3.sel ? V3.sel.nom : 'Haz clic en una pieza de la tabla para ubicarla';
  draw3($('#cvIso'));
}

const NOMBRES_LADO = { L2: 'Largo superior', L1: 'Largo inferior', A2: 'Ancho izquierdo', A1: 'Ancho derecho' };

/* Dibujo de la pieza con sus cuatro lados clicables */
function selectorLados(p, i) {
  return `<div class="cantos">${Object.keys(NOMBRES_LADO).map(k => {
    const titulo = `${NOMBRES_LADO[k]}: ${p.lados[k] ? 'con' : 'sin'} tapacanto`;
    return `<button class="lado ${k}${p.lados[k] ? ' on' : ''}" data-i="${i}" data-lado="${k}" title="${titulo}" aria-label="${esc(p.nom)}. ${titulo}" aria-pressed="${!!p.lados[k]}"></button>`;
  }).join('')}</div>`;
}

function copy(txt, msg) {
  navigator.clipboard.writeText(txt).then(() => toast(msg)).catch(() => toast('No se pudo copiar'));
}
function emptyHtml(t, p) {
  return `<div class="empty"><div class="big">▦</div><h3>${t}</h3><p>${p}</p></div>`;
}
