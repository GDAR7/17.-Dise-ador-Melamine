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

let _cerFila = null;      // { modId, nom } de la fila marcada
let _animApertura = 0;

const elementoDePieza = (m, nom) => elementosConstruccion(m).find(e => e.piezas.some(p => p.nom === nom));
const piezaConHerraje = (el, p) => !!el && (el.tipo === 'puerta' || (el.tipo === 'cajon' && p.kind === 'frente'));

function comboHerraje(m, p, el, i) {
  if (!piezaConHerraje(el, p)) return '<span style="color:var(--txt3)">—</span>';
  const auto = herrajeActivo(el.tipo === 'puerta' ? (POR_BISAGRA[el.bisagra] || 'bisagra') : 'corredera');
  const elegido = herrajeElegido(m, p.nom);
  return `<select class="cer-combo" data-combo="${i}" aria-label="Herraje de ${esc(p.nom)}">
    <option value="">Catálogo: ${esc(auto ? auto.nom : 'sin modelo')}</option>
    ${herrajesParaPieza(el.tipo).map(h => `<option value="${h.id}" ${elegido === h ? 'selected' : ''}>${esc(h.nom)}</option>`).join('')}
  </select>`;
}

function htmlTablasPiezas() {
  let i = -1;
  return modsVisibles().map(m => `<div class="tcard"><div class="hd"><h3>${TIPOS[m.tipo].ic} ${esc(m.nom)}</h3><span class="sub">${m.ancho}×${altoTotal(m)}×${m.prof} mm</span></div>
    <div class="tscroll"><table>
      <thead><tr><th>Pieza</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Lados</th><th>Herraje</th></tr></thead>
      <tbody>${piezas(m).map(p => {
        i++;
        const marcada = _cerFila && _cerFila.modId === m.id && _cerFila.nom === p.nom;
        return `<tr data-i="${i}"${marcada ? ' class="sel"' : ''}><td class="nm">${esc(p.nom)}</td><td class="n">${nf(p.L)}</td><td class="n">${nf(p.A)}</td>
          <td class="n">${selectorLados(p, i)}</td><td>${comboHerraje(m, p, elementoDePieza(m, p.nom), i)}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>`).join('');
}

/* Abre y cierra el elemento en la vista isométrica, según el herraje que lleva */
function simularApertura(p) {
  const m = S.mods.find(x => x.id === p.modId), el = m && elementoDePieza(m, p.nom);
  if (!piezaConHerraje(el, p)) return;
  const h = herrajeElegido(m, p.nom);
  const lat = el.piezas.find(x => x.nom.includes('Lateral'));
  V3.sel = null;
  V3.abrir = {
    modId: m.id, t: 0,
    piezas: el.tipo === 'cajon' ? el.piezas.map(x => x.nom) : [p.nom],
    modo: el.tipo === 'cajon' ? 'corredera' : h && /pist[oó]n/i.test(h.nom) ? 'piston' : 'bisagra',
    lado: el.col == null ? null : el.lado,
    centro: +m.ancho / 2,
    recorrido: lat ? (largoRiel(lat.L) || lat.L) * 0.9 : 0
  };
  const suave = !!(h && /suave/i.test(h.nom));
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ABRIR = 800, QUIETO = 500, CERRAR = suave ? 1700 : 800, TOTAL = ABRIR + QUIETO + CERRAR;
  const curva = x => x * x * (3 - 2 * x);
  const inicio = performance.now();
  cancelAnimationFrame(_animApertura);
  const paso = ahora => {
    if (!V3.abrir) return;
    const e = ahora - inicio;
    V3.abrir.t = reducir ? 1 : e < ABRIR ? curva(e / ABRIR) : e < ABRIR + QUIETO ? 1 : curva(1 - (e - ABRIR - QUIETO) / CERRAR);
    draw3($('#cvCer'));
    if (e < (reducir ? 1500 : TOTAL)) _animApertura = requestAnimationFrame(paso);
    else { V3.abrir = null; draw3($('#cvCer')); }
  };
  _animApertura = requestAnimationFrame(paso);
}

function actualizarPanelCerrajeria(filas) {
  const p = _cerFila && filas.find(x => x.modId === _cerFila.modId && x.nom === _cerFila.nom);
  if (_cerFila && !p) _cerFila = null;
  const m = p && S.mods.find(x => x.id === p.modId);
  const puede = !!p && piezaConHerraje(elementoDePieza(m, p.nom), p);
  $('#cerTit').textContent = p ? p.nom : 'Haz clic en una pieza; las puertas y cajones se abren';
  const b = $('#bSim');
  b.disabled = !puede;
  b.onclick = () => { if (puede) simularApertura(p); };
}

function renderCerrajeria() {
  const box = $('#cerbox');
  if (!modsVisibles().length) {
    box.innerHTML = emptyHtml('Sin cerrajería', 'Crea un módulo para calcular sus herrajes.');
    _cerFila = null;
    actualizarPanelCerrajeria([]);
    draw3($('#cvCer'));
    return;
  }
  const M = S.cfg.moneda, compras = herrajesCalc().filter(h => h.cant > 0);
  const elementos = modsVisibles().map(m => ({ m, els: elementosConstruccion(m) }));

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
    ${htmlTablasPiezas()}
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

  const filas = modsVisibles().flatMap(m => piezas(m));
  actualizarPanelCerrajeria(filas);
  draw3($('#cvCer'));
  box.querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = e => {
    if (e.target.closest('select, .lado')) return;
    const p = filas[tr.dataset.i], m = S.mods.find(x => x.id === p.modId);
    const misma = _cerFila && _cerFila.modId === p.modId && _cerFila.nom === p.nom;
    _cerFila = misma ? null : { modId: p.modId, nom: p.nom };
    box.querySelectorAll('tr.sel').forEach(x => x.classList.remove('sel'));
    if (!misma) tr.classList.add('sel');
    if (!misma && S.sel !== p.modId) { S.sel = p.modId; renderList(); renderParams(); }
    actualizarPanelCerrajeria(filas);
    if (!misma && piezaConHerraje(elementoDePieza(m, p.nom), p)) simularApertura(p);
    else { V3.abrir = null; V3.sel = misma ? null : { modId: p.modId, nom: p.nom }; marcarSeleccion(); }
  });
  box.querySelectorAll('.lado').forEach(b => b.onclick = () => cambiarLado(filas[b.dataset.i], b.dataset.lado));
  box.querySelectorAll('[data-combo]').forEach(sel => sel.onchange = () => {
    const p = filas[sel.dataset.combo], m = S.mods.find(x => x.id === p.modId);
    m.herrajesPieza = m.herrajesPieza || {};
    if (sel.value) m.herrajesPieza[p.nom] = sel.value; else delete m.herrajesPieza[p.nom];
    _cerFila = { modId: p.modId, nom: p.nom };
    if (S.sel !== p.modId) { S.sel = p.modId; renderList(); renderParams(); }
    recalc();
    simularApertura(p);
  });

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
