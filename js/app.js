"use strict";
/* ============================================================
   REFRESH / TABS
   ============================================================ */
let activePane = 'p3d';
function recalc() {
  const n = todasPiezas().reduce((s, p) => s + p.q, 0);
  $('#bdes').textContent = n;
  const g = S.mods.length ? optimizarTodo() : [];
  $('#bopt').textContent = g.reduce((s, x) => s + x.boards.length, 0);
  if (activePane === 'p3d') draw3();
  if (activePane === 'p2d') draw2();
  if (activePane === 'pdes') renderDespiece();
  if (activePane === 'popt') renderOpt();
  if (activePane === 'pcos') renderCosteo();
  if (activePane === 'pper') renderPerforaciones();
  if (activePane === 'pdet') renderConstruccion();
  marcarSeleccion();
  save();
}
function refresh() { renderList(); renderParams(); recalc(); }

$$('#tabs .tab').forEach(t => t.onclick = () => {
  $$('#tabs .tab').forEach(x => x.classList.remove('on'));
  $$('.pane').forEach(x => x.classList.remove('on'));
  t.classList.add('on');
  activePane = t.dataset.p;
  $('#' + activePane).classList.add('on');
  _gi = 0;
  recalc();
  if (activePane === 'popt') setTimeout(() => {
    const grupos = optimizarTodo();
    grupos.forEach((g, gi) => g.boards.forEach((b, bi) => drawBoard(`bcv-${gi}-${bi}`, b, g)));
  }, 40);
});

/* botones de vista */
$('#b3fit').onclick = () => { V3.yaw = -0.52; V3.pitch = 0.28; V3.zoom = 1; draw3(); };
$('#b3door').onclick = e => { V3.puertas = !V3.puertas; e.currentTarget.classList.toggle('on', V3.puertas); draw3(); };
$('#b3back').onclick = e => { V3.fondo = !V3.fondo; e.currentTarget.classList.toggle('on', V3.fondo); draw3(); };
$('#b3all').onclick = e => { V3.all = !V3.all; e.currentTarget.classList.toggle('on', V3.all); draw3(); };
$('#s2col').onchange = e => { V2.col = +e.target.value; draw2(); };
$('#r3exp').oninput = e => { V3.explode = e.target.value / 100; draw3(); };
$('#b3sel').onclick = () => { V3.sel = null; marcarSeleccion(); draw3(); };
$('#b2f').onclick = () => { V2.vista = 'frontal'; $('#b2f').classList.add('on'); $('#b2l').classList.remove('on'); draw2(); };
$('#b2l').onclick = () => { V2.vista = 'lateral'; $('#b2l').classList.add('on'); $('#b2f').classList.remove('on'); draw2(); };
$('#b2dim').onclick = e => { V2.cotas = !V2.cotas; e.currentTarget.classList.toggle('on', V2.cotas); draw2(); };

/* header */
$('#bNew').onclick = () => {
  const m = nuevoMod('librero'); S.mods.push(m); S.sel = m.id; refresh();
  if (innerWidth <= 900) mview('center');
};
$('#bSave').onclick = () => {
  const sugerido = S.mods.length === 1 ? S.mods[0].nom : S.proyecto;
  const archivo = nombreArchivo(sugerido, 'json');
  if (!archivo) return;
  descargar(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), archivo);
  toast(`Guardado como ${archivo}`);
};
let agregarAlAbrir = false;
$('#bLoad').onclick = () => { agregarAlAbrir = false; $('#fileIn').click(); };
$('#bAdd').onclick = () => { agregarAlAbrir = true; $('#fileIn').click(); };
$('#fileIn').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const p = JSON.parse(r.result);
      if (!Array.isArray(p.mods)) throw 0;
      if (agregarAlAbrir) {
        const nuevos = agregarProyecto(p);
        if (nuevos.length) S.sel = nuevos[0].id;
        refresh(); toast(`${nuevos.length} mueble(s) agregado(s)`);
      } else {
        S = Object.assign(defState(), p);
        asegurarHerrajes(S);
        S.sel = S.mods[0] ? S.mods[0].id : null;
        refresh(); toast('Proyecto cargado');
      }
    } catch (x) { toast('Archivo no válido'); }
  };
  r.readAsText(f);
  e.target.value = '';
};
$('#bPrint').onclick = () => window.print();

/* impresión: solo la pestaña abierta está dibujada, así que se generan todas antes de imprimir */
addEventListener('beforeprint', () => {
  if (document.body.classList.contains('imp-esp')) return;
  imprimiendo = true;
  renderDespiece();
  renderOpt();
  renderCosteo();
  renderPerforaciones();
  draw3();
  draw2($('#cv2'), 'frontal');
  draw2($('#cv2b'), 'lateral');
});
addEventListener('afterprint', () => {
  if (document.body.classList.contains('imp-esp')) { terminarImpresionEspecial(); return; }
  imprimiendo = false;
  recalc();
});

/* mobile nav */
function mview(which) {
  ['left', 'center', 'rightp'].forEach(k => {
    const el = document.getElementById(k);
    el.classList.toggle('mshow', k === which);
  });
  $$('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.m === which));
  setTimeout(recalc, 50);
}
$$('#mtabs button').forEach(b => b.onclick = () => mview(b.dataset.m));

/* resize */
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { _gi = 0; recalc(); }, 120); });

/* Ctrl+Z deshace cambios del proyecto; dentro de un campo de texto sigue siendo el deshacer del navegador */
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
  if (e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=range]):not([type=color]), textarea')) return;
  e.preventDefault();
  deshacer();
});

/* ---------- INIT ---------- */
S = load() || defState();
asegurarHerrajes(S);
if (!S.mods.length) {
  const a = nuevoMod('librero');
  const b = nuevoMod('repbajo');
  S.mods.push(a, b); S.sel = a.id;
}
if (!S.sel && S.mods[0]) S.sel = S.mods[0].id;
renderPresets();
refresh();
setTimeout(() => { draw3(); }, 60);
