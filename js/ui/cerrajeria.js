"use strict";
/* ============================================================
   CERRAJERÍA (pestaña)
   ============================================================ */
const CATALOGO_CERRAJERIA = [
  { por: 'bisagra', titulo: 'Bisagras rectas', ayuda: 'Puertas superpuestas' },
  { por: 'bisagraSemi', titulo: 'Bisagras semicodo', ayuda: 'Columnas con ambos laterales compartidos' },
  { por: 'bisagraEmb', titulo: 'Bisagras embutidas', ayuda: 'Puertas embutidas' },
  { por: 'corredera', titulo: 'Rieles de cajón', ayuda: 'El largo se elige según el fondo de cada cajón' },
  { por: 'tirador', titulo: 'Manijas y jaladores', ayuda: 'Puertas y cajones' }
];

function htmlCatalogo() {
  return `<div class="cat-grid">${CATALOGO_CERRAJERIA.map(c => `<div class="cat" data-cat="${c.por}">
    <h4>${c.titulo}</h4><div class="cat-ayuda">${c.ayuda}</div>
    <div class="cat-cab"><span></span><span>Modelo</span><span>${esc(S.cfg.moneda)}</span><span title="Tornillos por unidad">Torn.</span><span></span></div>
    ${S.herrajes.filter(h => h.por === c.por).map(h => `<div class="cat-fila" data-h="${h.id}">
      <input type="radio" name="cat-${c.por}" aria-label="Usar ${esc(h.nom)}" ${herrajeActivo(c.por) === h ? 'checked' : ''}>
      <input type="text" data-hf="nom" value="${esc(h.nom)}" aria-label="Modelo">
      <input type="number" min="0" step="0.01" data-hf="precio" value="${h.precio}" aria-label="Precio">
      <input type="number" min="0" data-hf="tor" value="${tornillosDe(h)}" aria-label="Tornillos por unidad">
      <button class="rm" data-hquitar aria-label="Quitar ${esc(h.nom)}" title="Quitar">×</button>
    </div>`).join('')}
    <button class="btn cat-add" data-hagregar="${c.por}">＋ Agregar modelo</button>
  </div>`).join('')}</div>`;
}

function renderCerrajeria() {
  const box = $('#cerbox');
  if (!S.mods.length) { box.innerHTML = emptyHtml('Sin cerrajería', 'Crea un módulo para calcular sus herrajes.'); return; }
  const M = S.cfg.moneda, compras = herrajesCalc().filter(h => h.cant > 0);
  const elementos = S.mods.map(m => ({ m, els: elementosConstruccion(m) }));

  const rieles = {};
  elementos.forEach(({ els }) => els.forEach(el => lineasElemento(el).forEach(l => {
    if (l.por === 'corredera') rieles[l.extra] = (rieles[l.extra] || 0) + l.cant * el.cant;
  })));
  const clavos = elementos.reduce((s, { els }) => s + els.reduce((a, el) => a + clavosFondo(el) * el.cant, 0), 0);
  const esTornillo = h => h.por === 'tornillo' || h.por === 'tornilloH';
  const totalTornillos = compras.filter(esTornillo).reduce((s, h) => s + h.cant, 0);
  const totalPiezas = compras.filter(h => !esTornillo(h)).reduce((s, h) => s + h.cant, 0);
  const subtotal = compras.reduce((s, h) => s + h.cant * h.precio, 0);

  box.innerHTML = `<div class="stats">
      <div class="stat"><div class="k">Herrajes</div><div class="v">${nf(totalPiezas)}</div></div>
      <div class="stat bl"><div class="k">Tornillos aprox.</div><div class="v">${nf(totalTornillos)}</div></div>
      <div class="stat"><div class="k">Clavos del fondo</div><div class="v">${nf(clavos)}</div></div>
      <div class="stat acc"><div class="k">Costo</div><div class="v">${M} ${nf(subtotal, 0)}</div></div>
    </div>
    <div class="note"><b>Cantidades aproximadas.</b> Los tornillos varían según el modelo; ajusta cuántos lleva cada herraje en el catálogo y compra un margen. Los precios del catálogo son de ejemplo: cámbialos por los tuyos.</div>
    <div class="tcard"><div class="hd"><h3>Lista de compra</h3></div><div class="tscroll"><table>
      <thead><tr><th>Herraje</th><th class="n">Cantidad</th><th class="n">P. unit.</th><th class="n">Parcial</th></tr></thead>
      <tbody>${compras.map(h => `<tr><td class="nm">${esc(h.nom)}</td><td class="n">${nf(h.cant)}</td><td class="n">${nf(h.precio, 2)}</td><td class="n">${M} ${nf(h.cant * h.precio, 2)}</td></tr>`).join('')}
      <tr class="grp"><td colspan="3">Subtotal</td><td class="n">${M} ${nf(subtotal, 2)}</td></tr></tbody>
    </table></div></div>
    ${Object.keys(rieles).length ? `<div class="note"><b>Rieles a comprar:</b> ${Object.entries(rieles).map(([m, n]) => `${nf(n)} × ${esc(m)}`).join(' · ')}</div>` : ''}
    <div class="cat-bloque"><h3 class="cat-tit">Catálogo: marca el modelo que vas a usar</h3>${htmlCatalogo()}</div>
    ${elementos.map(({ m, els }) => `<div class="tcard"><div class="hd"><h3>${TIPOS[m.tipo].ic} ${esc(m.nom)}</h3><span class="sub">herrajes por unidad</span></div><div class="tscroll"><table>
      <thead><tr><th>Elemento</th><th class="n">Cant.</th><th>Lleva</th></tr></thead>
      <tbody>${els.map(el => `<tr><td class="nm">${esc(el.grupo === m.nom ? el.titulo : `${el.grupo} · ${el.titulo}`)}</td><td class="n">${el.cant}</td>
        <td style="font-size:11.5px">${lineasElemento(el).map(l => esc(textoLinea(l))).join(' · ') || '—'}</td></tr>`).join('')}</tbody>
    </table></div></div>`).join('')}`;

  box.querySelectorAll('.cat-fila').forEach(f => {
    const h = S.herrajes.find(x => x.id === f.dataset.h);
    f.querySelector('input[type=radio]').onchange = () => {
      S.herrajes.filter(x => x.por === h.por).forEach(x => { x.activo = x === h; });
      recalc(); renderParams();
    };
    f.querySelectorAll('[data-hf]').forEach(inp => inp.onchange = () => {
      h[inp.dataset.hf] = inp.type === 'number' ? (+inp.value || 0) : inp.value;
      recalc(); renderParams();
    });
    f.querySelector('[data-hquitar]').onclick = () => {
      if (S.herrajes.filter(x => x.por === h.por).length === 1) { toast('Debe quedar al menos un modelo'); return; }
      S.herrajes = S.herrajes.filter(x => x !== h);
      recalc(); renderParams();
    };
  });
  box.querySelectorAll('[data-hagregar]').forEach(b => b.onclick = () => {
    S.herrajes.push({ id: uid(), nom: 'Modelo nuevo', precio: 1, por: b.dataset.hagregar, activo: false });
    recalc(); renderParams();
  });
}
