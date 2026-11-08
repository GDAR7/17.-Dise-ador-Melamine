"use strict";
/* ============================================================
   DISEÑADOR DE MELAMINA
   Despiece · Optimización de corte · Vista 2D/3D · Costeo
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const nf = (n, d = 0) => (isFinite(n) ? n : 0).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
let imprimiendo = false; // los dibujos usan colores y tamaño para papel mientras es true

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200);
}
