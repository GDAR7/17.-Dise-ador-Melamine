"use strict";
/* ============================================================
   COSTEO
   ============================================================ */
function renderCosteo() {
  const box = $('#cosbox');
  if (!modsVisibles().length) { box.innerHTML = emptyHtml('Sin costeo', 'Crea un módulo para calcular el presupuesto.'); return; }
  const M = S.cfg.moneda;
  const grupos = optimizarTodo();
  const pctMerma = +S.cfg.merma || 0;
  const merma = 1 + pctMerma / 100;

  const planchas = grupos.map(g => {
    const base = g.boards.length;
    // Las planchas se compran enteras: la merma solo suma cuando completa una unidad.
    const n = base + Math.floor(base * pctMerma / 100);
    return { nom: g.mat.nom, n, pu: g.mat.precio, tot: n * g.mat.precio, base };
  });
  const subPl = planchas.reduce((s, p) => s + p.tot, 0);

  const metrosCanto = tapacantoPorTipo();
  const cantos = [{ nom: 'Tapacanto delgado (con merma)', csv: 'Tapacanto delgado', m: metrosCanto.fino * merma, pu: +S.cfg.tcPrecio || 0 }];
  if (metrosCanto.grueso > 0) cantos.push({ nom: 'Tapacanto grueso (con merma)', csv: 'Tapacanto grueso', m: metrosCanto.grueso * merma, pu: precioCantoGrueso() });
  const subTc = cantos.reduce((s, c) => s + c.m * c.pu, 0);

  const hw = herrajesCalc().filter(h => h.cant > 0);
  const subHw = hw.reduce((s, h) => s + h.cant * h.precio, 0);

  const total = subPl + subTc + subHw;
  const nUnid = modsVisibles().reduce((s, m) => s + (+m.qty || 1), 0);

  let h = `<div class="stats">
    <div class="stat acc"><div class="k">Costo de materiales</div><div class="v">${M} ${nf(total, 0)}</div></div>
    <div class="stat"><div class="k">Planchas</div><div class="v">${M} ${nf(subPl, 0)}</div></div>
    <div class="stat"><div class="k">Tapacanto</div><div class="v">${M} ${nf(subTc, 0)}</div></div>
    <div class="stat"><div class="k">Herrajes</div><div class="v">${M} ${nf(subHw, 0)}</div></div>
  </div>
  <div class="note">Incluye <b>${S.cfg.merma}%</b> de merma sobre el tapacanto y sobre las planchas (solo cuando completa una plancha entera). No incluye mano de obra, transporte, pegamento ni acabados.</div>

  <div class="tcard"><div class="hd"><h3>Planchas</h3><div class="sp"></div>
    <span class="pill">${planchas.reduce((s, p) => s + p.n, 0)} unidades</span></div>
    <div class="tscroll"><table>
      <thead><tr><th>Material</th><th class="n">Optimizadas</th><th class="n">Con merma</th><th class="n">P. unit.</th><th class="n">Parcial</th></tr></thead>
      <tbody>${planchas.map(p => `<tr><td class="nm">${esc(p.nom)}</td>
        <td class="n">${p.base}</td><td class="n">${p.n}</td>
        <td class="n">${nf(p.pu, 2)}</td><td class="n">${M} ${nf(p.tot, 2)}</td></tr>`).join('')}
        <tr class="grp"><td colspan="4">Subtotal planchas</td><td class="n">${M} ${nf(subPl, 2)}</td></tr>
      </tbody></table></div></div>

  <div class="tcard"><div class="hd"><h3>Tapacanto</h3></div>
    <div class="tscroll"><table>
      <thead><tr><th>Concepto</th><th class="n">Metros</th><th class="n">P. unit.</th><th class="n">Parcial</th></tr></thead>
      <tbody>${cantos.map(c => `<tr><td class="nm">${c.nom}</td><td class="n">${nf(c.m, 1)} m</td>
        <td class="n">${nf(c.pu, 2)}</td><td class="n">${M} ${nf(c.m * c.pu, 2)}</td></tr>`).join('')}
        <tr class="grp"><td colspan="3">Subtotal tapacanto</td><td class="n">${M} ${nf(subTc, 2)}</td></tr>
      </tbody></table></div></div>

  <div class="tcard"><div class="hd"><h3>Herrajes</h3></div>
    <div class="tscroll"><table>
      <thead><tr><th>Herraje</th><th class="n">Cantidad</th><th class="n">P. unit.</th><th class="n">Parcial</th></tr></thead>
      <tbody>${hw.map(x => `<tr><td class="nm">${esc(x.nom)}</td><td class="n">${nf(x.cant)}</td>
        <td class="n">${nf(x.precio, 2)}</td><td class="n">${M} ${nf(x.cant * x.precio, 2)}</td></tr>`).join('')}
        <tr class="grp"><td colspan="3">Subtotal herrajes</td><td class="n">${M} ${nf(subHw, 2)}</td></tr>
      </tbody></table></div></div>

  <div class="tcard"><div class="hd"><h3>Resumen por módulo</h3></div>
    <div class="tscroll"><table>
      <thead><tr><th>Módulo</th><th class="n">Cant.</th><th class="n">Medidas</th><th class="n">Área melamina</th><th class="n">Tapacanto</th><th class="n">% del costo</th></tr></thead>
      <tbody>${modsVisibles().map(m => {
        const ps = piezas(m);
        const a = ps.reduce((s, p) => s + p.q * p.L * p.A, 0) / 1e6;
        const t = ps.reduce((s, p) => s + p.q * (p.cL * p.L + p.cA * p.A), 0) / 1000;
        const aTot = todasPiezas().reduce((s, p) => s + p.q * p.L * p.A, 0) / 1e6;
        return `<tr><td class="nm">${TIPOS[m.tipo].ic} ${esc(m.nom)}</td><td class="n">${m.qty}</td>
          <td class="n" style="font-size:11px">${m.ancho}×${m.alto}×${m.prof}</td>
          <td class="n">${nf(a, 2)} m²</td><td class="n">${nf(t, 1)} m</td>
          <td class="n">${nf(aTot ? a / aTot * 100 : 0, 1)}%</td></tr>`;
      }).join('')}</tbody></table></div></div>

  <div class="tcard"><div class="hd" style="background:#2b2414">
    <h3 style="color:var(--acc2);font-size:15px">TOTAL MATERIALES</h3><div class="sp"></div>
    <b class="mono" style="font-size:20px;color:var(--acc2)">${M} ${nf(total, 2)}</b></div>
    <div style="padding:11px 13px;font-size:11.5px;color:var(--txt3)">
      ${nUnid} unidad(es) · promedio ${M} ${nf(total / Math.max(1, nUnid), 2)} por mueble ·
      ${nf(grupos.reduce((s, g) => s + g.boards.length, 0))} planchas optimizadas
    </div></div>

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
    <button class="btn" id="bCotCsv">⧉ Copiar presupuesto (CSV)</button>
  </div>`;

  box.innerHTML = h;
  $('#bCotCsv').onclick = () => {
    const r = [['PRESUPUESTO', S.proyecto], [], ['Concepto', 'Cantidad', 'Unidad', 'P.Unit', 'Parcial']];
    planchas.forEach(p => r.push([p.nom, p.n, 'plancha', p.pu.toFixed(2), p.tot.toFixed(2)]));
    cantos.forEach(c => r.push([c.csv, c.m.toFixed(1), 'm', c.pu.toFixed(2), (c.m * c.pu).toFixed(2)]));
    hw.forEach(x => r.push([x.nom, x.cant, 'u', x.precio.toFixed(2), (x.cant * x.precio).toFixed(2)]));
    r.push([], ['TOTAL', '', '', '', total.toFixed(2)]);
    copy(r.map(x => x.join(';')).join('\n'), 'Presupuesto copiado');
  };
}
