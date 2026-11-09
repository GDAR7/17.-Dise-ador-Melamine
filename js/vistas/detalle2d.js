"use strict";
/* ============================================================
   CONSTRUCCIÓN: VISTAS 2D ACOTADAS
   Frontal y lateral de la columna (o del mueble) con el elemento
   elegido resaltado. Medidas finales, en mm.
   ============================================================ */
const TABLEROS_HORIZONTALES = ['Piso', 'Techo', 'Entrepaño', 'Repisa', 'Encimera'];

function cajasDetalle(m, el) {
  const B = geo(m).B.filter(b => el.col == null || b.col === el.col);
  const nombres = new Set(el.piezas.map(p => p.nom));
  return B.map(b => ({ ...b, propia: el.tipo !== 'cuerpo' && nombres.has(b.pieza) }));
}

/* Alturas desde el piso de cada cara de los tableros horizontales */
function nivelesDetalle(cajas) {
  const ys = new Set([0]);
  cajas.filter(b => TABLEROS_HORIZONTALES.includes(b.tag)).forEach(b => { ys.add(b.y); ys.add(b.y + b.h); });
  ys.add(Math.max(...cajas.map(b => b.y + b.h)));
  return [...ys].sort((a, b) => a - b);
}

/* Desde el piso hasta el elemento, y su propia altura */
function puntosElemento(cajas) {
  const ys = new Set([0]);
  cajas.filter(b => b.propia && b.tag !== 'Cajón').forEach(b => { ys.add(b.y); ys.add(b.y + b.h); });
  return [...ys].sort((a, b) => a - b);
}

/* Ancho acotado: el de la columna, aunque su lateral compartido sobresalga medio espesor hacia la vecina */
function extensionDetalle(m, el, cajas) {
  if (el.col == null) {
    const x0 = Math.min(...cajas.map(b => b.x));
    return { x0, ancho: Math.max(...cajas.map(b => b.x + b.w)) - x0 };
  }
  return { x0: m.columnas.slice(0, el.col).reduce((s, c) => s + (+c.ancho || 0), 0), ancho: +m.columnas[el.col].ancho || 0 };
}

/* piezaSel: nombre de la pieza marcada en la tabla, que se pinta encima de todo */
function dibujarDetalle2D(cv, m, el, piezaSel = null) {
  const ctx = cv.getContext('2d');
  const dpr = imprimiendo ? IMP.dpr : (window.devicePixelRatio || 1);
  const w = imprimiendo ? IMP.w : cv.clientWidth, h = imprimiendo ? IMP.h : cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!m || !el) return;

  const C = imprimiendo
    ? { panel: '#d9d9d9', fondo: '#f0f0f0', borde: '#555', sel: '#1e9bff', txt: '#000', cota: '#8a5a00', base: '#fff' }
    : { panel: '#454b5c', fondo: '#262b3a', borde: '#7c869c', sel: '#1e9bff', txt: '#c7cdd9', cota: '#f0a843', base: '#12141a' };
  const cajas = cajasDetalle(m, el);
  if (!cajas.length) return;
  const { x0, ancho: anchoT } = extensionDetalle(m, el, cajas), z0 = 0;
  // La profundidad acotada es la del cuerpo: los frentes sobresalen por delante y el fondo clavado por detrás
  const fondoT = Math.max(...cajas.filter(b => !['Puerta', 'Frente cajón'].includes(b.tag)).map(b => b.z + b.d));
  const altoT = Math.max(...cajas.map(b => b.y + b.h));

  const texto = (t, x, y, vertical) => {
    ctx.save();
    ctx.translate(x, y);
    if (vertical) ctx.rotate(-Math.PI / 2);
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(t).width;
    ctx.fillStyle = C.base; ctx.fillRect(-tw / 2 - 2, -6, tw + 4, 12);
    ctx.fillStyle = C.cota; ctx.fillText(t, 0, 0);
    ctx.restore();
  };
  const linea = (x1, y1, x2, y2) => {
    ctx.strokeStyle = C.cota; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };

  const vista = (ox, vw, frontal) => {
    const padX = 54, padY = 30;
    const ancho = frontal ? anchoT : fondoT;
    const sc = Math.min((vw - padX * 2) / ancho, (h - padY * 2 - 8) / altoT);
    const left = ox + (vw - ancho * sc) / 2, bottom = (h + altoT * sc) / 2 + 4;
    const X = v => left + (v - (frontal ? x0 : z0)) * sc;
    const Y = v => bottom - v * sc;
    const right = X((frontal ? x0 : z0) + ancho);

    ctx.fillStyle = C.txt; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(frontal ? 'Frontal' : 'Lateral', ox + vw / 2, 13);

    // Sin las piezas que taparían el interior, salvo que sean el elemento elegido
    const marcada = b => b.pieza === piezaSel;
    const visibles = cajas.filter(b => marcada(b) || b.propia || (!['Puerta', 'Frente cajón', 'Cajón'].includes(b.tag) && (frontal || b.tag !== 'Lateral')));
    visibles.sort((a, b) => (marcada(a) - marcada(b)) || (a.propia - b.propia) || (a.z - b.z)).forEach(b => {
      const px = X(frontal ? b.x : b.z), pw = (frontal ? b.w : b.d) * sc, py = Y(b.y + b.h), ph = b.h * sc;
      ctx.fillStyle = marcada(b) ? COLOR_PIEZA : b.propia ? C.sel : b.tag === 'Fondo' ? C.fondo : C.panel;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = C.borde; ctx.lineWidth = 0.7;
      ctx.strokeRect(px, py, pw, ph);
    });

    // Cadena vertical de alturas por tablero, a la derecha
    const cadena = (cx, puntos) => {
      linea(cx, Y(puntos[0]), cx, Y(puntos[puntos.length - 1]));
      puntos.forEach(p => linea(cx - 4, Y(p), cx + 4, Y(p)));
      puntos.slice(1).forEach((p, i) => {
        const d = p - puntos[i];
        if (d >= 30 && d * sc >= 15) texto(String(Math.round(d)), cx, (Y(p) + Y(puntos[i])) / 2, true);
      });
    };
    cadena(right + 16, nivelesDetalle(cajas));

    // Alto total a la izquierda y, si hay elemento, su posición desde el piso
    const propios = cajas.filter(b => b.propia && b.tag !== 'Cajón');
    if (frontal && propios.length) cadena(left - 16, puntosElemento(cajas));
    const totalX = left - (frontal && propios.length ? 36 : 16);
    linea(totalX, Y(0), totalX, Y(altoT));
    linea(totalX - 4, Y(0), totalX + 4, Y(0)); linea(totalX - 4, Y(altoT), totalX + 4, Y(altoT));
    texto(String(Math.round(altoT)), totalX, (Y(0) + Y(altoT)) / 2, true);

    // Ancho o profundidad total abajo
    const yBase = bottom + 11;
    linea(left, yBase, right, yBase);
    linea(left, yBase - 4, left, yBase + 4); linea(right, yBase - 4, right, yBase + 4);
    texto(String(Math.round(ancho)), (left + right) / 2, yBase, false);

    // Arriba: la medida del elemento, o el espacio interior si es el cuerpo
    const refs = propios.length ? propios : cajas.filter(b => b.tag === 'Piso');
    if (refs.length && (propios.length || frontal)) {
      const ini = Math.min(...refs.map(b => (frontal ? b.x : b.z))), fin = Math.max(...refs.map(b => (frontal ? b.x + b.w : b.z + b.d)));
      if ((fin - ini) * sc >= 26) {
        const yArriba = Y(altoT) - 8;
        linea(X(ini), yArriba, X(fin), yArriba);
        linea(X(ini), yArriba - 4, X(ini), yArriba + 4); linea(X(fin), yArriba - 4, X(fin), yArriba + 4);
        texto(String(Math.round(fin - ini)), (X(ini) + X(fin)) / 2, yArriba, false);
      }
    }
  };
  vista(0, w / 2, true);
  vista(w / 2, w / 2, false);
}
