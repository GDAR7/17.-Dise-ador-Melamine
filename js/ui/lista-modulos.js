"use strict";
/* ============================================================
   UI — LISTA DE MÓDULOS
   ============================================================ */
const OJO = {
  abierto: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  cerrado: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><path d="M4 4l16 16"/></svg>'
};

function renderList() {
  const el = $('#modlist');
  if (!S.mods.length) {
    el.innerHTML = `<div style="padding:22px 14px;text-align:center;color:var(--txt3);font-size:12px">
      Sin módulos todavía.<br>Usa una plantilla de abajo 👇</div>`;
  } else {
    el.innerHTML = S.mods.map(m => `
      <div class="mod ${m.id === S.sel ? 'sel' : ''}${m.oculto ? ' oculto' : ''}" data-id="${m.id}">
        <div class="ic">${TIPOS[m.tipo].ic}</div>
        <div class="nm"><b>${esc(m.nom)}</b><span>${m.ancho}×${m.alto}×${m.prof}</span></div>
        ${(+m.qty || 1) > 1 ? `<div class="qt">×${m.qty}</div>` : ''}
        <button class="del" data-vis="${m.id}" title="${m.oculto ? 'Mostrar' : 'Ocultar'}" aria-label="${m.oculto ? 'Mostrar' : 'Ocultar'} ${esc(m.nom)}" aria-pressed="${!!m.oculto}">${m.oculto ? OJO.cerrado : OJO.abierto}</button>
        <button class="del" data-dup="${m.id}" title="Duplicar" aria-label="Duplicar">⧉</button>
        <button class="del" data-del="${m.id}" title="Eliminar" aria-label="Eliminar">×</button>
      </div>`).join('');
  }
  $('#modcount').textContent = modsVisibles().reduce((s, m) => s + (+m.qty || 1), 0);
  el.querySelectorAll('.mod').forEach(d => d.onclick = ev => {
    if (ev.target.dataset.del || ev.target.dataset.dup) return;
    if (d.classList.contains('oculto')) { toast('Este mueble está oculto: actívalo con el ojo'); return; }
    S.sel = d.dataset.id; refresh();
  });
  el.querySelectorAll('[data-vis]').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const m = S.mods.find(x => x.id === b.dataset.vis);
    m.oculto = !m.oculto;
    refresh();
    toast(`${m.nom}: ${m.oculto ? 'oculto' : 'visible'}`);
  });
  el.querySelectorAll('[data-dup]').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const i = S.mods.findIndex(m => m.id === b.dataset.dup);
    const copia = { ...JSON.parse(JSON.stringify(S.mods[i])), id: uid(), oculto: false };
    copia.nom += ' (copia)';
    S.mods.splice(i + 1, 0, copia);
    S.sel = copia.id;
    refresh(); toast('Mueble duplicado');
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const id = b.dataset.del;
    S.mods = S.mods.filter(m => m.id !== id);
    if (S.sel === id) S.sel = S.mods[0] ? S.mods[0].id : null;
    refresh(); toast('Módulo eliminado');
  });
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderPresets() {
  $('#pgrid').innerHTML = Object.keys(TIPOS).map(t =>
    `<button class="pbtn" data-t="${t}"><span>${TIPOS[t].ic}</span>${TIPOS[t].nom}</button>`).join('');
  $$('#pgrid .pbtn').forEach(b => b.onclick = () => {
    const m = nuevoMod(b.dataset.t);
    S.mods.push(m); S.sel = m.id; refresh();
    if (innerWidth <= 900) mview('center');
    toast(TIPOS[b.dataset.t].nom + ' agregado');
  });
}
