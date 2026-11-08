"use strict";
/* ============================================================
   UI — LISTA DE MÓDULOS
   ============================================================ */
function renderList() {
  const el = $('#modlist');
  if (!S.mods.length) {
    el.innerHTML = `<div style="padding:22px 14px;text-align:center;color:var(--txt3);font-size:12px">
      Sin módulos todavía.<br>Usa una plantilla de abajo 👇</div>`;
  } else {
    el.innerHTML = S.mods.map(m => `
      <div class="mod ${m.id === S.sel ? 'sel' : ''}" data-id="${m.id}">
        <div class="ic">${TIPOS[m.tipo].ic}</div>
        <div class="nm"><b>${esc(m.nom)}</b><span>${m.ancho}×${m.alto}×${m.prof}</span></div>
        ${(+m.qty || 1) > 1 ? `<div class="qt">×${m.qty}</div>` : ''}
        <button class="del" data-del="${m.id}" title="Eliminar">×</button>
      </div>`).join('');
  }
  $('#modcount').textContent = S.mods.reduce((s, m) => s + (+m.qty || 1), 0);
  el.querySelectorAll('.mod').forEach(d => d.onclick = ev => {
    if (ev.target.dataset.del) return;
    S.sel = d.dataset.id; refresh();
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
