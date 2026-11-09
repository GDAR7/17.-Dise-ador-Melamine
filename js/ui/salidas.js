"use strict";
/* ============================================================
   SALIDAS: archivos descargables e impresiones especiales
   ============================================================ */
function nombreArchivo(sugerido, extension) {
  const nombre = prompt('Nombre del archivo:', sugerido);
  if (!nombre || !nombre.trim()) return null;
  return nombre.trim().replace(/[\\/:*?"<>|]/g, '-').replace(new RegExp(`\\.${extension}$`, 'i'), '') + '.' + extension;
}

function descargar(blob, archivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = archivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Imprime solo el HTML indicado, en lugar del documento completo del proyecto */
async function imprimirEspecial(html) {
  const zona = $('#impresion');
  zona.innerHTML = html;
  // Las imágenes deben estar listas o saldrían en blanco en la hoja
  await Promise.all([...zona.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
  document.body.classList.add('imp-esp');
  window.print();
}

function terminarImpresionEspecial() {
  document.body.classList.remove('imp-esp');
  $('#impresion').innerHTML = '';
}

/* ---------- EXCEL ---------- */
const textoLados = p => Object.keys(NOMBRES_LADO).filter(k => p.lados[k]).map(k => NOMBRES_LADO[k]).join(', ') || 'Ninguno';
const tieneVeta = p => { const mat = S.mats.find(x => x.id === p.mat); return mat && mat.veta ? 'Sí' : 'No'; };

function hojasProyecto() {
  const todas = todasPiezas();
  const despiece = [['Mueble', 'Pieza', 'Largo mm', 'Ancho mm', 'Cantidad', 'Cantos largo', 'Cantos ancho', 'Lados con tapacanto', 'Material', 'Espesor mm', 'Veta', 'Tapacanto m']];
  todas.forEach(p => despiece.push([p.mod, p.nom, p.L, p.A, p.q, p.cL, p.cA, textoLados(p), p.matNom, p.esp, tieneVeta(p), +(p.q * (p.cL * p.L + p.cA * p.A) / 1000).toFixed(2)]));

  // Para el servicio de corte: piezas iguales del mismo material en una sola línea
  const grupos = new Map();
  todas.forEach(p => {
    const clave = [p.mat, p.L, p.A, p.cL, p.cA].join('|');
    if (grupos.has(clave)) grupos.get(clave).q += p.q;
    else grupos.set(clave, { ...p });
  });
  const corte = [['Material', 'Espesor mm', 'Largo mm', 'Ancho mm', 'Cantidad', 'Cantos largo', 'Cantos ancho', 'Veta']];
  [...grupos.values()].sort((a, b) => a.matNom.localeCompare(b.matNom) || b.L - a.L || b.A - a.A)
    .forEach(p => corte.push([p.matNom, p.esp, p.L, p.A, p.q, p.cL, p.cA, tieneVeta(p)]));

  const herrajes = [['Herraje', 'Cantidad', 'Precio unitario', 'Parcial']];
  herrajesCalc().filter(h => h.cant > 0).forEach(h => herrajes.push([h.nom, h.cant, h.precio, +(h.cant * h.precio).toFixed(2)]));

  return [{ nombre: 'Despiece', filas: despiece }, { nombre: 'Para corte', filas: corte }, { nombre: 'Herrajes', filas: herrajes }];
}

function exportarExcel() {
  const archivo = nombreArchivo(`${S.mods.length === 1 ? S.mods[0].nom : S.proyecto} - despiece`, 'xlsx');
  if (!archivo) return;
  descargar(crearXlsx(hojasProyecto()), archivo);
  toast(`Guardado como ${archivo}`);
}

/* ---------- ETIQUETAS ---------- */
function svgLados(p) {
  const W = 44, H = 24, m = 2, cls = l => (p.lados[l] ? 'on' : '');
  return `<svg class="etq-lados" viewBox="0 0 ${W} ${H}" width="${W * 1.6}" height="${H * 1.6}" role="img" aria-label="Tapacanto: ${esc(textoLados(p))}">
    <line class="${cls('L2')}" x1="${m}" y1="${m}" x2="${W - m}" y2="${m}"/><line class="${cls('L1')}" x1="${m}" y1="${H - m}" x2="${W - m}" y2="${H - m}"/>
    <line class="${cls('A2')}" x1="${m}" y1="${m}" x2="${m}" y2="${H - m}"/><line class="${cls('A1')}" x1="${W - m}" y1="${m}" x2="${W - m}" y2="${H - m}"/></svg>`;
}

/* Reparte las piezas ya optimizadas: a cada etiqueta le toca una plancha concreta */
function planchasPorPieza() {
  const res = new Map();
  optimizarTodo().forEach(g => g.boards.forEach((b, i) => b.piezas.forEach(p => {
    const clave = `${p.modId}|${p.nom}|${p.L}|${p.A}`;
    if (!res.has(clave)) res.set(clave, []);
    res.get(clave).push(`Plancha ${i + 1}`);
  })));
  return res;
}

function htmlEtiquetas() {
  const planchas = planchasPorPieza();
  const etiquetas = todasPiezas().flatMap(p => {
    const lugares = planchas.get(`${p.modId}|${p.nom}|${p.L}|${p.A}`) || [];
    return Array.from({ length: p.q }, (_, i) => `<div class="etq">
      <div class="etq-sup"><span>${esc(p.mod)}</span><span>${i + 1} de ${p.q}</span></div>
      <div class="etq-nom">${esc(p.nom)}</div>
      <div class="etq-med">${nf(p.L)} × ${nf(p.A)} <small>mm</small></div>
      <div class="etq-inf"><div>${esc(p.matNom)}<br>${lugares[i] ? esc(lugares[i]) : 'Sin plancha'}</div>${svgLados(p)}</div>
    </div>`);
  });
  return `<div class="etq-grid">${etiquetas.join('')}</div>`;
}
