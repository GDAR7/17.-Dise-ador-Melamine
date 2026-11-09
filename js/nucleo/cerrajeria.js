"use strict";
/* ============================================================
   CERRAJERÍA
   Herrajes y tornillos de cada elemento del mueble. Es la única
   fuente de estos conteos: Costeo, Construcción y la pestaña
   Cerrajería leen de aquí. Los tornillos son una aproximación.
   ============================================================ */
const POR_BISAGRA = { Recta: 'bisagra', Semicodo: 'bisagraSemi', Embutida: 'bisagraEmb' };
const TORNILLOS_POR_DEFECTO = { bisagra: 4, bisagraSemi: 4, bisagraEmb: 4, corredera: 12, tirador: 2 };
const LARGOS_RIEL = [250, 300, 350, 400, 450, 500, 550];
const UNIONES = { horiz: 4, div: 4, zoc: 4, enc: 6 };      // tornillos de unión por tablero
const UNIONES_CAJA_CAJON = 8, FIJACION_FRENTE = 4;

/* Herraje elegido de cada tipo: el marcado, o el primero de la lista */
const herrajeActivo = por => S.herrajes.find(h => h.por === por && h.activo) || S.herrajes.find(h => h.por === por);

const tornillosDe = h => (h.tor == null ? (TORNILLOS_POR_DEFECTO[h.por] || 0) : (+h.tor || 0));

/* Largo comercial más grande que entra en el cajón, o null si no entra ninguno */
function largoRiel(fondoCajon) {
  const validos = LARGOS_RIEL.filter(l => l <= fondoCajon);
  return validos.length ? validos[validos.length - 1] : null;
}

/* Herrajes de UNA unidad del elemento: [{ por, nom, cant, extra }] */
function lineasElemento(el) {
  const lineas = [];
  let tornillosHerraje = 0;
  const agregar = (por, cant, extra = '') => {
    const h = herrajeActivo(por);
    if (!h || cant <= 0) return;
    lineas.push({ por, nom: h.nom, cant, extra });
    tornillosHerraje += cant * tornillosDe(h);
  };
  const pieza = t => el.piezas.find(p => p.nom.includes(t));

  if (el.tipo === 'puerta') {
    agregar(POR_BISAGRA[el.bisagra] || 'bisagra', alturasBisagra(el.piezas[0].L).length);
    agregar('tirador', 1);
  } else if (el.tipo === 'cajon') {
    const largo = largoRiel(pieza('Lateral').L);
    agregar('corredera', 1, largo ? `par de ${largo} mm` : 'cajón muy corto para riel estándar');
    agregar('tirador', 1);
    agregar('tornillo', UNIONES_CAJA_CAJON);
    tornillosHerraje += FIJACION_FRENTE;
  } else if (el.tipo === 'repisa') {
    agregar('soporte', 4);
  } else {
    const uniones = el.piezas.reduce((s, p) => s + (UNIONES[p.kind] || 0) * Math.round(p.q / el.cant), 0);
    agregar('tornillo', uniones);
    if ((+el.mod.zocalo || 0) > 0) agregar('regaton', 4);
  }
  if (tornillosHerraje > 0 && herrajeActivo('tornilloH')) lineas.push({ por: 'tornilloH', nom: herrajeActivo('tornilloH').nom, cant: tornillosHerraje, extra: '' });
  return lineas;
}

/* Clavos o grapas para fijar un fondo clavado, uno cada 15 cm de perímetro */
function clavosFondo(el) {
  return el.piezas.filter(p => p.kind === 'fondo').reduce((s, p) => s + Math.ceil(2 * (p.L + p.A) / 150) * Math.round(p.q / el.cant), 0);
}

const textoLinea = l => `${nf(l.cant)} × ${l.nom}${l.extra ? ` (${l.extra})` : ''}`;

function herrajesCalc() {
  const suma = {};
  S.mods.forEach(m => elementosConstruccion(m).forEach(el => lineasElemento(el).forEach(l => {
    suma[l.por] = (suma[l.por] || 0) + l.cant * el.cant;
  })));
  return S.herrajes.map(h => ({ ...h, cant: herrajeActivo(h.por) === h ? (suma[h.por] || 0) : 0 }));
}
