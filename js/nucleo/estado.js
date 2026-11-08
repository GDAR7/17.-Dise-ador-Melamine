"use strict";
/* ---------- ESTADO ---------- */
const TIPOS = {
  librero:   { ic: '▤', nom: 'Librero' },
  repbajo:   { ic: '▭', nom: 'Repostero bajo' },
  repalto:   { ic: '▬', nom: 'Repostero alto' },
  closet:    { ic: '◫', nom: 'Clóset' },
  comoda:    { ic: '▥', nom: 'Cómoda / cajonera' },
  escritorio:{ ic: '⌐', nom: 'Escritorio' },
  generico:  { ic: '□', nom: 'Módulo genérico' },
  columnas:  { ic: '▥', nom: 'Repostero por columnas' }
};

let S = null;

function defState() {
  const m18 = { id: uid(), nom: 'Melamina Blanca 18 mm', esp: 18, color: '#e8e4dc', precio: 135, fw: 2500, fh: 1830 };
  const m15 = { id: uid(), nom: 'Melamina Roble 15 mm', esp: 15, color: '#c49a6a', precio: 128, fw: 2500, fh: 1830 };
  const m03 = { id: uid(), nom: 'Fondo HDF 3 mm', esp: 3, color: '#b8a98f', precio: 42, fw: 2440, fh: 1220 };
  return {
    proyecto: 'Mi proyecto de melamina',
    cfg: { kerf: 4, rotar: true, moneda: 'S/', tcPrecio: 1.80, merma: 5 },
    mats: [m18, m15, m03],
    herrajes: [
      { id: uid(), nom: 'Bisagra cazoleta 35 mm', precio: 4.5, por: 'bisagra' },
      { id: uid(), nom: 'Corredera telescópica 45 cm', precio: 18, por: 'corredera' },
      { id: uid(), nom: 'Tirador / jaladera', precio: 6, por: 'tirador' },
      { id: uid(), nom: 'Tornillo + tarugo (juego)', precio: 0.35, por: 'tornillo' },
      { id: uid(), nom: 'Soporte de repisa', precio: 0.6, por: 'soporte' },
      { id: uid(), nom: 'Regatón / nivelador', precio: 1.2, por: 'regaton' }
    ],
    mods: [],
    sel: null
  };
}

function nuevoMod(tipo = 'librero', over = {}) {
  const m18 = S.mats.find(m => m.esp >= 15) || S.mats[0];
  const m03 = S.mats.find(m => m.esp <= 6) || S.mats[0];
  const base = {
    id: uid(), nom: TIPOS[tipo].nom, tipo, qty: 1,
    ancho: 800, alto: 2000, prof: 300,
    matC: m18.id, matF: m18.id, matB: m03.id,
    repisas: 4, divs: 0, divHasta: 0,
    fondo: 'ranurado', zocalo: 0,
    puertas: 0, tipoP: 'superpuesta', puertaDesde: 0, puertaHasta: 0,
    cajones: 0, altoCaj: 180,
    encimera: false, retr: 20
  };
  return Object.assign(base, PRESETS[tipo] || {}, over, { id: uid(), tipo });
}

const PRESETS = {
  librero:    { nom: 'Librero', ancho: 800, alto: 2000, prof: 300, repisas: 4, fondo: 'ranurado', zocalo: 0, puertas: 0, cajones: 0 },
  repbajo:    { nom: 'Repostero bajo', ancho: 900, alto: 850, prof: 580, repisas: 1, fondo: 'clavado', zocalo: 100, puertas: 2, cajones: 0, encimera: true },
  repalto:    { nom: 'Repostero alto', ancho: 900, alto: 700, prof: 320, repisas: 1, fondo: 'clavado', zocalo: 0, puertas: 2, cajones: 0 },
  closet:     { nom: 'Clóset', ancho: 1200, alto: 2200, prof: 550, repisas: 3, divs: 1, fondo: 'clavado', zocalo: 80, puertas: 2, cajones: 0 },
  comoda:     { nom: 'Cómoda', ancho: 700, alto: 800, prof: 450, repisas: 0, fondo: 'clavado', zocalo: 60, puertas: 0, cajones: 4, altoCaj: 170 },
  escritorio: { nom: 'Escritorio', ancho: 1200, alto: 750, prof: 600, repisas: 0, fondo: 'ninguno', zocalo: 0, puertas: 0, cajones: 2, altoCaj: 160, encimera: true },
  generico:   { nom: 'Módulo', ancho: 600, alto: 700, prof: 400, repisas: 2, fondo: 'clavado', zocalo: 0, puertas: 0, cajones: 0 },
  // El getter entrega una copia nueva, para que cada mueble tenga sus propias columnas
  columnas:   { nom: 'Repostero por columnas', ancho: 1800, alto: 2400, prof: 580, repisas: 0, divs: 0, fondo: 'clavado', zocalo: 100, puertas: 0, cajones: 0, encimera: false, get columnas() { return columnasEjemplo(); } }
};

/* ---------- PERSISTENCIA ---------- */
function save() {
  try { localStorage.setItem('melamina.v1', JSON.stringify(S)); } catch (e) { }
}
function load() {
  try {
    const r = localStorage.getItem('melamina.v1');
    if (r) { const p = JSON.parse(r); if (p && p.mods) return p; }
  } catch (e) { }
  return null;
}
