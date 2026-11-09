"use strict";
/* ============================================================
   CONSTRUCCIÓN (pestaña)
   ============================================================ */
let _detalleId = null, _detalleSeparar = 0.45;

function renderConstruccion() {
  const lista = $('#detLista'), box = $('#detbox');
  const m = S.mods.find(x => x.id === S.sel);
  if (!m) {
    V3.detalle = null;
    lista.innerHTML = '';
    box.innerHTML = emptyHtml('Sin elementos', 'Selecciona o crea un módulo para ver cómo se construye.');
    draw3($('#cvDet'));
    return;
  }
  const elementos = elementosConstruccion(m);
  const el = elementos.find(x => x.id === _detalleId) || elementos[0];
  _detalleId = el ? el.id : null;

  const grupos = [...new Set(elementos.map(x => x.grupo))];
  lista.innerHTML = grupos.map(g => `<div class="det-grupo">${esc(g)}</div>` + elementos.filter(x => x.grupo === g).map(x =>
    `<button class="det-item${x.id === _detalleId ? ' on' : ''}" data-det="${esc(x.id)}">${esc(x.titulo)}${x.cant > 1 ? `<small>×${x.cant}</small>` : ''}</button>`).join('')).join('');
  lista.querySelectorAll('[data-det]').forEach(b => b.onclick = () => { _detalleId = b.dataset.det; renderConstruccion(); });

  if (!el) { V3.detalle = null; box.innerHTML = emptyHtml('Sin elementos', 'Este mueble no tiene piezas.'); draw3($('#cvDet')); return; }
  V3.detalle = { mod: m, piezas: el.piezas, cant: el.cant, explode: _detalleSeparar };
  draw3($('#cvDet'));

  const guia = guiaConstruccion(el);
  box.innerHTML = `<div class="tcard"><div class="hd"><h3>${esc(el.grupo)} · ${esc(el.titulo)}</h3><div class="sp"></div>
      <span class="pill y">${el.cant} ${el.cant === 1 ? 'unidad' : 'unidades'}</span></div>
    <div class="tscroll">${htmlTablaElemento(el)}</div></div>
    <div class="det-guia">
      <div class="tcard"><div class="hd"><h3>Herrajes por unidad</h3></div><ul class="det-txt">${guia.herrajes.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
      <div class="tcard"><div class="hd"><h3>Pasos de armado</h3></div><ol class="det-txt">${guia.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
    </div>
    <div class="note">Guía orientativa del oficio. Confirma medidas y montaje con la ficha de tus herrajes.</div>`;
}

function htmlTablaElemento(el) {
  return `<table>
    <thead><tr><th>Pieza por unidad</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Cant.</th><th class="n">C.L</th><th class="n">C.A</th><th>Material</th></tr></thead>
    <tbody>${el.piezas.map(p => `<tr><td class="nm">${esc(p.nom.replace(`${el.grupo} · `, ''))}</td>
      <td class="n">${nf(p.L)}</td><td class="n">${nf(p.A)}</td><td class="n">${nf(p.q / el.cant)}</td>
      <td class="n">${p.cL || '–'}</td><td class="n">${p.cA || '–'}</td><td style="font-size:11px">${esc(p.matNom)}</td></tr>`).join('')}</tbody>
  </table>`;
}

/* Manual con todos los elementos del mueble seleccionado */
function htmlManual(m) {
  const cv = $('#cvDet'), previo = V3.detalle;
  imprimiendo = true;
  const secciones = elementosConstruccion(m).map(el => {
    V3.detalle = { mod: m, piezas: el.piezas, cant: el.cant, explode: _detalleSeparar };
    draw3(cv);
    const guia = guiaConstruccion(el);
    return `<section class="man-el">
      <h2>${esc(el.grupo)} · ${esc(el.titulo)}${el.cant > 1 ? ` <small>× ${el.cant}</small>` : ''}</h2>
      <div class="man-fila">
        <img src="${cv.toDataURL('image/png')}" alt="${esc(el.titulo)} desarmado">
        <div><h3>Herrajes por unidad</h3><ul>${guia.herrajes.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
      </div>
      ${htmlTablaElemento(el)}
      <h3>Pasos de armado</h3>
      <ol>${guia.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    </section>`;
  });
  imprimiendo = false;
  V3.detalle = previo;
  draw3(cv);
  return `<div class="manual"><h1>${esc(m.nom)}</h1><p>${m.ancho} × ${m.alto} × ${m.prof} mm · Guía orientativa: confirma medidas y montaje con la ficha de tus herrajes.</p>${secciones.join('')}</div>`;
}

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
