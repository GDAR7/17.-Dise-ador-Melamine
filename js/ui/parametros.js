"use strict";
/* ============================================================
   UI — PANEL DE PARÁMETROS
   ============================================================ */
/* Pestañas inferiores del panel. La elegida es una preferencia de pantalla, no parte del proyecto */
let _grupoParams = (() => { try { return localStorage.getItem('melamina.ptab') || 'mueble'; } catch (e) { return 'mueble'; } })();

function mostrarGrupoParametros() {
  $$('#params .ptab').forEach(d => { d.hidden = d.dataset.ptab !== _grupoParams; });
  $$('#ptabs button').forEach(b => {
    const on = b.dataset.ptab === _grupoParams;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

$$('#ptabs button').forEach(b => b.onclick = () => {
  _grupoParams = b.dataset.ptab;
  try { localStorage.setItem('melamina.ptab', _grupoParams); } catch (e) { }
  mostrarGrupoParametros();
  $('#params').scrollTop = 0;
});

function renderParams() {
  const m = S.mods.find(x => x.id === S.sel);
  const matOpts = (sel, filtro) => S.mats.filter(filtro || (() => true))
    .map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nom)}</option>`).join('');

  let html = '';

  if (m) {
    html += `
    <div class="ptab" data-ptab="mueble">
    <div class="fgroup">
      <h4>Identificación</h4>
      <div class="row"><div class="f" style="flex:2"><label>Nombre del módulo</label>
        <input type="text" data-k="nom" value="${esc(m.nom)}"></div>
        <div class="f" style="max-width:68px"><label>Cant.</label>
        <input type="number" min="1" data-k="qty" value="${m.qty}"></div></div>
      <div class="row"><div class="f"><label>Tipo</label><select data-k="tipo">
        ${Object.keys(TIPOS).map(t => `<option value="${t}" ${t === m.tipo ? 'selected' : ''}>${TIPOS[t].nom}</option>`).join('')}
      </select></div></div>
    </div>

    <div class="fgroup">
      <h4>Medidas exteriores (mm)</h4>
      <div class="row">
        <div class="f"><label>Ancho</label><input type="number" data-k="ancho" value="${m.ancho}" ${m.tipo === 'columnas' ? 'disabled title="Es la suma de las columnas"' : ''}></div>
        <div class="f"><label>Alto</label><input type="number" data-k="alto" value="${m.alto}"></div>
        <div class="f"><label>Profundidad</label><input type="number" data-k="prof" value="${m.prof}"></div>
      </div>
      <div class="row">
        <div class="f"><label>Alto de zócalo</label><input type="number" data-k="zocalo" value="${m.zocalo}"></div>
        <div class="f"><label>Retranqueo repisa</label><input type="number" data-k="retr" value="${m.retr}"></div>
      </div>
    </div>

    <div class="fgroup">
      <h4>Materiales</h4>
      <div class="row"><div class="f"><label>Cuerpo (laterales, repisas)</label>
        <select data-k="matC">${matOpts(m.matC)}</select></div></div>
      <div class="row"><div class="f"><label>Frentes (puertas, cajones)</label>
        <select data-k="matF">${matOpts(m.matF)}</select></div></div>
      <div class="row"><div class="f"><label>Fondo</label>
        <select data-k="matB">${matOpts(m.matB)}</select></div></div>
    </div>

    </div>
    <div class="ptab" data-ptab="interior">
    ${m.tipo === 'columnas' ? htmlColumnas(m) : `
    <div class="fgroup">
      <h4>Interior</h4>
      <div class="row">
        <div class="f"><label>Repisas por vano</label><input type="number" min="0" data-k="repisas" value="${m.repisas}"></div>
        <div class="f"><label>Divisiones verticales</label><input type="number" min="0" data-k="divs" value="${m.divs}"></div>
      </div>
      <div class="row"><div class="f"><label>Divisiones: del techo hasta la repisa n.º (se cuenta desde arriba · 0 = completas)</label>
        <input type="number" min="0" data-k="divHasta" value="${m.divHasta || 0}"></div></div>
      <div class="row"><div class="f"><label>Fondo del mueble</label><select data-k="fondo">
        <option value="clavado" ${m.fondo === 'clavado' ? 'selected' : ''}>Clavado / atornillado por detrás</option>
        <option value="ranurado" ${m.fondo === 'ranurado' ? 'selected' : ''}>Ranurado (encajado)</option>
        <option value="ninguno" ${m.fondo === 'ninguno' ? 'selected' : ''}>Sin fondo</option>
      </select></div></div>
      <label class="chk"><input type="checkbox" data-k="encimera" ${m.encimera ? 'checked' : ''}> Incluir encimera / tapa superior</label>
    </div>

    <div class="fgroup">
      <h4>Frentes</h4>
      <div class="row">
        <div class="f"><label>Puertas</label><input type="number" min="0" max="6" data-k="puertas" value="${m.puertas}"></div>
        <div class="f"><label>Cajones</label><input type="number" min="0" max="8" data-k="cajones" value="${m.cajones}"></div>
      </div>
      <div class="row">
        <div class="f"><label>Puertas desde repisa n.º (0 = techo)</label><input type="number" min="0" data-k="puertaDesde" value="${m.puertaDesde || 0}"></div>
        <div class="f"><label>Hasta repisa n.º (0 = piso)</label><input type="number" min="0" data-k="puertaHasta" value="${m.puertaHasta || 0}"></div>
      </div>
      <div class="row"><div class="f"><label>Alto de cada cajón</label><input type="number" data-k="altoCaj" value="${m.altoCaj}"></div></div>
      <div class="f"><label>Montaje de frentes</label>
        <div class="seg">
          <button data-seg="tipoP" data-v="superpuesta" class="${m.tipoP === 'superpuesta' ? 'on' : ''}">Superpuesta</button>
          <button data-seg="tipoP" data-v="embutida" class="${m.tipoP === 'embutida' ? 'on' : ''}">Embutida</button>
        </div>
      </div>
    </div>`}
    </div>`;
  } else {
    const aviso = '<div style="padding:20px 14px;color:var(--txt3);font-size:12px;text-align:center">Crea un módulo para editar sus parámetros.</div>';
    html += `<div class="ptab" data-ptab="mueble">${aviso}</div><div class="ptab" data-ptab="interior">${aviso}</div>`;
  }

  /* --- Materiales / planchas --- */
  html += `
  <div class="ptab" data-ptab="materiales">
  <div class="fgroup">
    <h4>Planchas y materiales</h4>
    <div id="matlist"></div>
    <button class="btn" id="bAddMat" style="width:100%;justify-content:center;margin-top:6px">＋ Agregar material</button>
  </div>

  </div>
  <div class="ptab" data-ptab="cantos">
  <div class="fgroup">
    <h4>Corte y tapacanto</h4>
    <div class="row">
      <div class="f"><label>Espesor de sierra (mm)</label><input type="number" data-c="kerf" value="${S.cfg.kerf}"></div>
      <div class="f"><label>Merma extra (%)</label><input type="number" data-c="merma" value="${S.cfg.merma}"></div>
    </div>
    <div class="row">
      <div class="f"><label>Canto delgado ${S.cfg.moneda}/m</label><input type="number" step="0.01" data-c="tcPrecio" value="${S.cfg.tcPrecio}"></div>
      <div class="f"><label>Canto grueso ${S.cfg.moneda}/m</label><input type="number" step="0.01" data-c="tcPrecioG" value="${precioCantoGrueso()}"></div>
    </div>
    <div class="row">
      <div class="f"><label>Delgado (0.4 mm): descontar del corte (mm)</label><input type="number" min="0" step="0.05" data-c="tcEsp" value="${S.cfg.tcEsp || 0}"></div>
      <div class="f"><label>Grueso (2 mm): descontar del corte (mm)</label><input type="number" min="0" step="0.05" data-c="tcGrueso" value="${S.cfg.tcGrueso == null ? 2 : S.cfg.tcGrueso}"></div>
    </div>
    <div class="row">
      <div class="f"><label>Moneda</label><input type="text" data-c="moneda" value="${esc(S.cfg.moneda)}"></div>
    </div>
    <label class="chk"><input type="checkbox" data-c="rotar" ${S.cfg.rotar ? 'checked' : ''}> Permitir girar piezas (ignorar veta)</label>
  </div>

  </div>
  <div class="ptab" data-ptab="herrajes">
  <div class="fgroup">
    <h4>Herrajes y precios</h4>
    <div id="hwlist"></div>
    <button class="btn" id="bAddHw" style="width:100%;justify-content:center;margin-top:6px">＋ Agregar herraje</button>
  </div>

  </div>
  <div class="ptab" data-ptab="proyecto">
  <div class="fgroup">
    <h4>Proyecto</h4>
    <div class="row"><div class="f"><label>Nombre del proyecto</label>
      <input type="text" data-p="proyecto" value="${esc(S.proyecto)}"></div></div>
    <button class="btn" id="bReset" style="width:100%;justify-content:center;color:var(--red)">Borrar todo y empezar de cero</button>
  </div>
  </div>`;

  $('#params').innerHTML = html;
  mostrarGrupoParametros();

  /* bind módulo */
  $$('#params [data-k]').forEach(inp => {
    const k = inp.dataset.k;
    const ev = inp.type === 'checkbox' || inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const mm = S.mods.find(x => x.id === S.sel); if (!mm) return;
      if (inp.type === 'checkbox') mm[k] = inp.checked;
      else if (inp.type === 'number') mm[k] = inp.value === '' ? 0 : +inp.value;
      else mm[k] = inp.value;
      if (k === 'tipo') { Object.assign(mm, { divHasta: 0, puertaDesde: 0, puertaHasta: 0 }, PRESETS[inp.value] || {}); renderParams(); }
      if (k === 'nom' || k === 'qty' || k === 'ancho' || k === 'alto' || k === 'prof' || k === 'tipo') renderList();
      if (mm.tipo === 'columnas' && (k === 'alto' || k === 'zocalo')) actualizarSumas(mm);
      recalc();
    });
  });
  $$('#params [data-seg]').forEach(b => b.onclick = () => {
    const mm = S.mods.find(x => x.id === S.sel); if (!mm) return;
    mm[b.dataset.seg] = b.dataset.v; renderParams(); recalc();
  });
  if (m && m.tipo === 'columnas') bindColumnas(m);
  /* bind config */
  $$('#params [data-c]').forEach(inp => {
    const k = inp.dataset.c;
    const ev = inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      if (inp.type === 'checkbox') S.cfg[k] = inp.checked;
      else if (inp.type === 'number') S.cfg[k] = +inp.value || 0;
      else S.cfg[k] = inp.value;
      recalc();
    });
  });
  $$('#params [data-p]').forEach(inp => inp.addEventListener('input', () => { S.proyecto = inp.value; save(); }));

  renderMats(); renderHw();
  $('#bAddMat').onclick = () => {
    S.mats.push({ id: uid(), nom: 'Melamina nueva 18 mm', esp: 18, color: '#d8d2c6', precio: 130, fw: 2500, fh: 1830 });
    renderParams(); recalc();
  };
  $('#bAddHw').onclick = () => {
    S.herrajes.push({ id: uid(), nom: 'Herraje', precio: 1, por: 'fijo', cantFija: 1 });
    renderParams(); recalc();
  };
  $('#bReset').onclick = () => {
    if (!confirm('¿Borrar todo el proyecto y empezar de cero?')) return;
    S = defState(); S.sel = null; refresh(); toast('Proyecto reiniciado');
  };
}

const tieneTextura = m => typeof m.textura === 'string' && m.textura.startsWith('data:image/');
let _materialTextura = null;

$('#texIn').onchange = async e => {
  const archivo = e.target.files[0], mat = S.mats.find(x => x.id === _materialTextura);
  e.target.value = '';
  if (!archivo || !mat) return;
  try {
    mat.textura = await prepararTextura(archivo);
    renderParams(); recalc();
    toast('Imagen aplicada');
  } catch (x) { toast('No se pudo leer esa imagen'); }
};

function renderMats() {
  const el = $('#matlist'); if (!el) return;
  el.innerHTML = S.mats.map(m => `
    <div class="mat" data-id="${m.id}">
      <div class="top">
        <input type="color" class="sw" data-f="color" value="${m.color}" style="padding:0;border:0;background:none">
        <input type="text" data-f="nom" value="${esc(m.nom)}">
        ${S.mats.length > 1 ? `<button class="rm" data-rm="${m.id}">×</button>` : ''}
      </div>
      <div class="g">
        <div class="f"><label>Espesor mm</label><input type="number" data-f="esp" value="${m.esp}"></div>
        <div class="f"><label>Precio/plancha</label><input type="number" step="0.01" data-f="precio" value="${m.precio}"></div>
        <div class="f"><label>Ancho plancha</label><input type="number" data-f="fw" value="${m.fw}"></div>
        <div class="f"><label>Alto plancha</label><input type="number" data-f="fh" value="${m.fh}"></div>
      </div>
      <label class="chk"><input type="checkbox" data-f="veta" ${m.veta ? 'checked' : ''}> Tiene veta (no girar sus piezas)</label>
      <div class="tex">
        ${tieneTextura(m) ? `<img class="tex-img" src="${esc(m.textura)}" alt="Textura de ${esc(m.nom)}">` : ''}
        <button class="btn" data-texcargar="${m.id}">⤒ ${tieneTextura(m) ? 'Cambiar imagen' : 'Cargar imagen'}</button>
        ${tieneTextura(m) ? `<button class="btn${m.texGirar ? ' on' : ''}" data-texgirar="${m.id}">⟳ Girar veta 90°</button>
        <button class="btn" data-texquitar="${m.id}">Quitar</button>` : ''}
      </div>
      ${tieneTextura(m) ? `<div class="f"><label>La foto cubre, de largo (mm)</label><input type="number" min="1" data-f="texAncho" value="${m.texAncho || m.fw}"></div>` : ''}
    </div>`).join('');
  el.querySelectorAll('.mat').forEach(d => {
    const mat = S.mats.find(x => x.id === d.dataset.id);
    d.querySelectorAll('[data-f]').forEach(inp => {
      const f = inp.dataset.f;
      inp.addEventListener(inp.type === 'color' ? 'input' : 'input', () => {
        mat[f] = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? (+inp.value || 0) : inp.value;
        if (f === 'nom' || f === 'esp') renderParams();
        recalc();
      });
    });
  });
  el.querySelectorAll('[data-texcargar]').forEach(b => b.onclick = () => {
    _materialTextura = b.dataset.texcargar;
    $('#texIn').click();
  });
  el.querySelectorAll('[data-texquitar]').forEach(b => b.onclick = () => {
    const mat = S.mats.find(x => x.id === b.dataset.texquitar);
    delete mat.textura; delete mat.texAncho; delete mat.texGirar;
    renderParams(); recalc();
  });
  el.querySelectorAll('[data-texgirar]').forEach(b => b.onclick = () => {
    const mat = S.mats.find(x => x.id === b.dataset.texgirar);
    mat.texGirar = !mat.texGirar;
    renderParams(); recalc();
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    const id = b.dataset.rm;
    S.mats = S.mats.filter(m => m.id !== id);
    S.mods.forEach(m => { ['matC', 'matF', 'matB'].forEach(k => { if (m[k] === id) m[k] = S.mats[0].id; }); });
    renderParams(); recalc();
  });
}

function renderHw() {
  const el = $('#hwlist'); if (!el) return;
  el.innerHTML = S.herrajes.map(h => `
    <div class="hw" data-id="${h.id}">
      <input type="text" data-f="nom" value="${esc(h.nom)}">
      <input type="number" step="0.01" data-f="precio" value="${h.precio}">
      <span class="u">${S.cfg.moneda}/u</span>
      <button class="rm" data-rm="${h.id}">×</button>
    </div>`).join('');
  el.querySelectorAll('.hw').forEach(d => {
    const h = S.herrajes.find(x => x.id === d.dataset.id);
    d.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
      h[inp.dataset.f] = inp.type === 'number' ? (+inp.value || 0) : inp.value; recalc();
    }));
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    S.herrajes = S.herrajes.filter(h => h.id !== b.dataset.rm); renderParams(); recalc();
  });
}
