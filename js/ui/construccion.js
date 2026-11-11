"use strict";
/* ============================================================
   CONSTRUCCIÓN (pestaña)
   ============================================================ */
let _detalleId = null, _detalleSeparar = 0.45, _detallePieza = null;
let _detalleMin = (() => { try { return localStorage.getItem('melamina.detmin') === '1'; } catch (e) { return false; } })();

function aplicarDetalleMin() {
  $('.det-cuerpo').classList.toggle('min', _detalleMin);
  const b = $('#bDetMin');
  b.textContent = _detalleMin ? '▴ Mostrar detalle de piezas' : '▾ Ocultar detalle de piezas';
  b.setAttribute('aria-expanded', String(!_detalleMin));
}

/* Redibuja las dos vistas con la pieza marcada en la tabla */
function dibujarVistasDetalle(m, el) {
  if (V3.detalle) V3.detalle.sel = _detallePieza;
  draw3($('#cvDet'));
  dibujarDetalle2D($('#cvDet2'), m, el, _detallePieza);
}

function renderConstruccion() {
  const lista = $('#detLista'), box = $('#detbox');
  const m = S.mods.find(x => x.id === S.sel);
  if (!m) {
    V3.detalle = null;
    lista.innerHTML = '';
    box.innerHTML = emptyHtml('Sin elementos', 'Selecciona o crea un módulo para ver cómo se construye.');
    draw3($('#cvDet'));
    dibujarDetalle2D($('#cvDet2'), null, null);
    return;
  }
  const elementos = elementosConstruccion(m);
  const el = elementos.find(x => x.id === _detalleId) || elementos[0];
  _detalleId = el ? el.id : null;

  const grupos = [...new Set(elementos.map(x => x.grupo))];
  lista.innerHTML = grupos.map(g => `<div class="det-grupo">${esc(g)}</div>` + elementos.filter(x => x.grupo === g).map(x =>
    `<button class="det-item${x.id === _detalleId ? ' on' : ''}" data-det="${esc(x.id)}">${esc(x.titulo)}${x.cant > 1 ? `<small>×${x.cant}</small>` : ''}</button>`).join('')).join('');
  lista.querySelectorAll('[data-det]').forEach(b => b.onclick = () => { _detalleId = b.dataset.det; renderConstruccion(); });

  if (!el) { V3.detalle = null; box.innerHTML = emptyHtml('Sin elementos', 'Este mueble no tiene piezas.'); draw3($('#cvDet')); dibujarDetalle2D($('#cvDet2'), null, null); return; }
  if (!el.piezas.some(p => p.nom === _detallePieza)) _detallePieza = null;
  V3.detalle = { mod: m, piezas: el.piezas, cant: el.cant, explode: _detalleSeparar };
  dibujarVistasDetalle(m, el);

  const guia = guiaConstruccion(el);
  box.innerHTML = `<div class="tcard"><div class="hd"><h3>${esc(el.grupo)} · ${esc(el.titulo)}</h3><div class="sp"></div>
      <span class="pill y">${el.cant} ${el.cant === 1 ? 'unidad' : 'unidades'}</span></div>
    <div class="tscroll">${htmlTablaElemento(el)}</div></div>
    <div class="det-guia">
      <div class="tcard"><div class="hd"><h3>Herrajes por unidad</h3></div><ul class="det-txt">${guia.herrajes.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="tcard"><div class="hd"><h3>Pasos de armado</h3></div><ol class="det-txt">${guia.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
    </div>
    <div class="note">Guía orientativa del oficio. Confirma medidas y montaje con la ficha de tus herrajes.</div>`;

  const filas = [...box.querySelectorAll('tbody tr[data-pieza]')];
  const marcar = () => filas.forEach(f => f.classList.toggle('sel', f.dataset.pieza === _detallePieza));
  filas.forEach(f => f.onclick = () => {
    _detallePieza = f.dataset.pieza === _detallePieza ? null : f.dataset.pieza;
    marcar();
    dibujarVistasDetalle(m, el);
  });
  marcar();
}

function htmlTablaElemento(el) {
  return `<table>
    <thead><tr><th>Pieza por unidad</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Cant.</th><th class="n">C.L</th><th class="n">C.A</th><th>Material</th></tr></thead>
    <tbody>${el.piezas.map(p => `<tr data-pieza="${esc(p.nom)}"><td class="nm">${esc(p.nom.replace(`${el.grupo} · `, ''))}</td>
      <td class="n">${nf(p.L)}</td><td class="n">${nf(p.A)}</td><td class="n">${nf(p.q / el.cant)}</td>
      <td class="n">${p.cL || '–'}</td><td class="n">${p.cA || '–'}</td><td style="font-size:11px">${esc(p.matNom)}</td></tr>`).join('')}</tbody>
  </table>`;
}

/* Manual con todos los elementos del mueble seleccionado */
function htmlManual(m) {
  const cv = $('#cvDet'), cv2 = $('#cvDet2');
  imprimiendo = true;
  const secciones = elementosConstruccion(m).map(el => {
    V3.detalle = { mod: m, piezas: el.piezas, cant: el.cant, explode: _detalleSeparar };
    draw3(cv);
    dibujarDetalle2D(cv2, m, el);
    const guia = guiaConstruccion(el);
    return `<section class="man-el">
      <h2>${esc(el.grupo)} · ${esc(el.titulo)}${el.cant > 1 ? ` <small>× ${el.cant}</small>` : ''}</h2>
      <div class="man-fila">
        <img src="${cv.toDataURL('image/png')}" alt="${esc(el.titulo)} desarmado">
        <img src="${cv2.toDataURL('image/png')}" alt="${esc(el.titulo)}: vistas frontal y lateral con medidas">
      </div>
      <h3>Herrajes por unidad</h3>
      <ul>${guia.herrajes.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      ${htmlTablaElemento(el)}
      <h3>Pasos de armado</h3>
      <ol>${guia.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    </section>`;
  });
  imprimiendo = false;
  renderConstruccion();
  return `<div class="manual"><h1>${esc(m.nom)}</h1><p>${m.ancho} × ${altoTotal(m)} × ${m.prof} mm · Guía orientativa: confirma medidas y montaje con la ficha de tus herrajes.</p>${secciones.join('')}</div>`;
}

$('#bDetMin').onclick = () => {
  _detalleMin = !_detalleMin;
  try { localStorage.setItem('melamina.detmin', _detalleMin ? '1' : '0'); } catch (e) { }
  aplicarDetalleMin();
  renderConstruccion();
};
aplicarDetalleMin();

$('#bManual').onclick = () => {
  const m = S.mods.find(x => x.id === S.sel);
  if (!m) { toast('Selecciona un mueble'); return; }
  imprimirEspecial(htmlManual(m));
};

$('#rDet').oninput = e => {
  _detalleSeparar = e.target.value / 100;
  if (V3.detalle) V3.detalle.explode = _detalleSeparar;
  draw3($('#cvDet'));
};
