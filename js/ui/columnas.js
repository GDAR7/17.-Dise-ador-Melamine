"use strict";
/* ============================================================
   UI — EDITOR DE COLUMNAS Y ZONAS
   ============================================================ */
const TIPOS_ZONA = { puerta: 'Puerta', cajon: 'Cajón', abierta: 'Nicho', seminicho: 'Semi nicho', semivacio: 'Semi abierta', sinlados: 'Abierta' };

function sumaColumna(m, c) {
  const disp = +m.alto - (+m.zocalo || 0);
  const suma = c.zonas.reduce((s, z) => s + (+z.alto || 0), 0);
  const dif = disp - suma;
  return dif === 0
    ? `<span class="ok">Zonas: ${nf(suma)} de ${nf(disp)} mm ✓</span>`
    : `<span class="mal">Zonas: ${nf(suma)} de ${nf(disp)} mm · ${dif > 0 ? 'faltan' : 'sobran'} ${nf(Math.abs(dif))} mm</span>`;
}

function htmlColumnas(m) {
  const zonaHtml = (z, zi, n) => `
    <div class="zona" data-zon="${zi}">
      <div class="row">
        <div class="f" style="flex:2"><label>Zona</label><input type="text" data-zf="nom" value="${esc(z.nom)}"></div>
        <div class="f"><label>Alto mm</label><input type="number" min="0" data-zf="alto" value="${z.alto}"></div>
      </div>
      <div class="row">
        <div class="f" style="flex:2"><label>Tipo</label><select data-zf="tipo">
          ${Object.keys(TIPOS_ZONA).map(t => `<option value="${t}" ${t === z.tipo ? 'selected' : ''}>${TIPOS_ZONA[t]}</option>`).join('')}
        </select></div>
        <div class="f"><label>Repisas</label><input type="number" min="0" data-zf="rep" value="${z.rep || 0}" ${admiteRepisas(z) ? '' : 'disabled'}></div>
        <div class="zacc">
          <button data-acc="subir" title="Subir zona" aria-label="Subir zona" ${zi === 0 ? 'disabled' : ''}>↑</button>
          <button data-acc="bajar" title="Bajar zona" aria-label="Bajar zona" ${zi === n - 1 ? 'disabled' : ''}>↓</button>
          <button data-acc="quitarZona" title="Quitar zona" aria-label="Quitar zona">×</button>
        </div>
      </div>
    </div>`;

  return `
    <div class="fgroup">
      <h4>Columnas y zonas</h4>
      <div class="row"><div class="f"><label>Fondo del mueble</label><select data-k="fondo">
        <option value="clavado" ${m.fondo === 'clavado' ? 'selected' : ''}>Clavado / atornillado por detrás</option>
        <option value="ranurado" ${m.fondo === 'ranurado' ? 'selected' : ''}>Ranurado (encajado)</option>
        <option value="ninguno" ${m.fondo === 'ninguno' ? 'selected' : ''}>Sin fondo</option>
      </select></div></div>
      ${m.columnas.map((c, ci) => `
        <div class="columna" data-col="${ci}">
          <div class="row">
            <div class="f" style="flex:2"><label>Columna ${ci + 1}</label><input type="text" data-cf="nom" value="${esc(c.nom)}"></div>
            <div class="f"><label>Ancho mm</label><input type="number" min="1" data-cf="ancho" value="${c.ancho}"></div>
            <div class="zacc"><button data-acc="quitarCol" title="Quitar columna" aria-label="Quitar columna">×</button></div>
          </div>
          <div class="col-suma">${sumaColumna(m, c)}</div>
          ${c.zonas.map((z, zi) => zonaHtml(z, zi, c.zonas.length)).join('')}
          <button class="btn" data-acc="agregarZona" style="width:100%;justify-content:center">＋ Agregar zona</button>
        </div>`).join('')}
      <button class="btn" data-acc="agregarCol" style="width:100%;justify-content:center">＋ Agregar columna</button>
    </div>`;
}

function actualizarSumas(m) {
  $$('#params .columna').forEach(d => {
    d.querySelector('.col-suma').innerHTML = sumaColumna(m, m.columnas[+d.dataset.col]);
  });
}

function bindColumnas(m) {
  const sincronizarAncho = () => {
    m.ancho = m.columnas.reduce((s, c) => s + (+c.ancho || 0), 0);
    const inp = $('#params [data-k=ancho]');
    if (inp) inp.value = m.ancho;
    renderList();
  };
  const estructura = () => { sincronizarAncho(); renderParams(); recalc(); };
  const valor = inp => (inp.type === 'number' ? (inp.value === '' ? 0 : +inp.value) : inp.value);

  $$('#params .columna').forEach(d => {
    const c = m.columnas[+d.dataset.col];
    d.querySelectorAll('[data-cf]').forEach(inp => inp.addEventListener('input', () => {
      c[inp.dataset.cf] = valor(inp);
      sincronizarAncho();
      recalc();
    }));
    d.querySelectorAll('.zona').forEach(zd => {
      const zi = +zd.dataset.zon, z = c.zonas[zi];
      zd.querySelectorAll('[data-zf]').forEach(inp => {
        const f = inp.dataset.zf;
        if (f === 'tipo') inp.addEventListener('change', () => { z.tipo = inp.value; if (!admiteRepisas(z)) z.rep = 0; estructura(); });
        else inp.addEventListener('input', () => { z[f] = valor(inp); actualizarSumas(m); recalc(); });
      });
      const mover = delta => { const o = c.zonas[zi + delta]; c.zonas[zi + delta] = z; c.zonas[zi] = o; estructura(); };
      zd.querySelector('[data-acc=subir]').onclick = () => mover(-1);
      zd.querySelector('[data-acc=bajar]').onclick = () => mover(1);
      zd.querySelector('[data-acc=quitarZona]').onclick = () => { c.zonas.splice(zi, 1); estructura(); };
    });
    d.querySelector('[data-acc=agregarZona]').onclick = () => {
      c.zonas.push({ nom: `Zona ${c.zonas.length + 1}`, alto: 300, tipo: 'puerta', rep: 0 });
      estructura();
    };
    d.querySelector('[data-acc=quitarCol]').onclick = () => {
      if (m.columnas.length === 1) { toast('El mueble necesita al menos una columna'); return; }
      m.columnas.splice(+d.dataset.col, 1);
      estructura();
    };
  });
  $('#params [data-acc=agregarCol]').onclick = () => {
    m.columnas.push({ nom: `Columna ${m.columnas.length + 1}`, ancho: 600, zonas: [{ nom: 'Zona 1', alto: +m.alto - (+m.zocalo || 0), tipo: 'puerta', rep: 0 }] });
    estructura();
  };
}
