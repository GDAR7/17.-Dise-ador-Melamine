"use strict";
/* ============================================================
   MUEBLE POR COLUMNAS
   Cada columna es una caja independiente con su propio ancho y
   sus zonas apiladas (puerta, cajón o abierta). Las zonas se
   guardan de arriba hacia abajo, como se ven en el mueble.
   ============================================================ */
function columnasEjemplo() {
  const zona = (nom, alto, tipo, rep = 0) => ({ nom, alto, tipo, rep });
  const altillo = () => zona('Altillo', 350, 'puerta');
  return [
    { nom: 'Cajonería', ancho: 600, zonas: [altillo(), zona('Vajilla', 900, 'puerta', 2), zona('Cubiertos', 150, 'cajon'), zona('Utensilios', 150, 'cajon'), zona('Sartenes', 200, 'cajon'), zona('Ollas medianas', 250, 'cajon'), zona('Ollas grandes', 300, 'cajon')] },
    { nom: 'Despensa', ancho: 600, zonas: [altillo(), zona('Abarrotes', 1150, 'puerta', 4), zona('Pesados', 800, 'puerta', 1)] },
    { nom: 'Microondas', ancho: 600, zonas: [altillo(), zona('Vasos', 800, 'puerta', 2), zona('Nicho', 400, 'abierta'), zona('Tápers', 375, 'cajon'), zona('Bolsas', 375, 'cajon')] }
  ];
}

/* Escritorio con alzada: abajo el escritorio (las zonas van bajo el tablero), arriba la alzada, apoyada sobre el tablero */
function columnasEscritorio() {
  const zona = (nom, alto, tipo, rep = 0) => ({ nom, alto, tipo, rep });
  return [
    // Bajo la repisa queda libre hasta el suelo: sin piso, sin zócalo y sin fondo, con el lateral exterior entero
    { nom: 'Piernas', ancho: 800, compartir: true, sinBase: true, latIzqCompleto: true, zonas: [zona('Espacio de piernas', 552, 'abierta'), zona('Bajo la repisa', 180, 'sinlados')] },
    { nom: 'Cajonera', ancho: 400, zonas: [zona('Cajón 1', 160, 'cajon'), zona('Cajón 2', 160, 'cajon'), zona('Puerta', 352, 'puerta', 1)] }
  ];
}
function columnasAlzada() {
  const zona = (nom, alto, tipo, rep = 0) => ({ nom, alto, tipo, rep });
  return [
    { nom: 'Puerta', ancho: 400, compartir: true, latIzqCompleto: true, zonas: [zona('Puerta', 380, 'puerta', 1), zona('Zona de trabajo', 370, 'semivacio')] },
    { nom: 'Nichos', ancho: 400, compartir: true, zonas: [zona('Nichos', 380, 'abierta', 1), zona('Zona de trabajo', 370, 'semivacio')] },
    { nom: 'Librero', ancho: 400, zonas: [zona('Repisas', 750, 'abierta', 3)] }
  ];
}

const esPorColumnas = m => m.tipo === 'columnas' || m.tipo === 'escalzada';

/* Partes de un mueble por columnas, cada una como un mueble de columnas propio.
   pre: prefijo de sus piezas · dy: altura donde empieza · col0: número de su primera columna */
function partesColumnas(m) {
  if (m.tipo !== 'escalzada') return [{ vm: m, pre: '', dy: 0, col0: 0, nom: '' }];
  const e = (S.mats.find(x => x.id === m.matC) || S.mats[0]).esp;
  // El tablero hace de techo del escritorio, y la alzada no lleva piso porque se apoya en él
  const base = { ...m, alto: +m.alto - e, sinTecho: true };
  const alzada = { ...m, columnas: m.colsAlz || [], alto: +m.altoAlz || 0, prof: +m.profAlz || 0, zocalo: 0, sinPiso: true };
  return [
    { vm: base, pre: '', dy: 0, col0: 0, nom: 'Escritorio' },
    { vm: alzada, pre: 'Alzada · ', dy: +m.alto, col0: base.columnas.length, nom: 'Alzada' }
  ];
}

/* Todas las columnas en el orden de su número (b.col), con su borde izquierdo dentro de su parte */
function columnasMueble(m) {
  return partesColumnas(m).flatMap(parte => {
    let x0 = 0;
    return parte.vm.columnas.map((c, i) => { const r = { c, i, x0, parte }; x0 += +c.ancho || 0; return r; });
  });
}

function piezasPorColumnas(m, add, mc, mf, mb) {
  partesColumnas(m).forEach(p => piezasColumnas(p.vm, (nom, ...resto) => add(p.pre + nom, ...resto), mc, mf, mb));
  if (m.tipo === 'escalzada') add('Tablero', +m.ancho, +m.prof + (+m.voladizo || 0), 1, 1, 2, mc, 'enc');
}

function geoPorColumnas(m, opts = {}) {
  const B = [];
  let W = 0, D = 0, H = 0;
  partesColumnas(m).forEach(p => {
    const g = geoColumnas(p.vm, opts);
    g.B.forEach(b => B.push({ ...b, y: b.y + p.dy, col: b.col + p.col0, pieza: p.pre + b.pieza }));
    W = Math.max(W, g.W); D = Math.max(D, g.D); H = Math.max(H, p.dy + g.H);
  });
  if (m.tipo === 'escalzada') {
    const mc = S.mats.find(x => x.id === m.matC) || S.mats[0], e = mc.esp, prof = +m.prof + (+m.voladizo || 0);
    B.push({ x: 0, y: +m.alto - e, z: 0, w: +m.ancho, h: e, d: prof, c: mc.color, tag: 'Encimera', pieza: 'Tablero' });
    W = Math.max(W, +m.ancho); D = Math.max(D, prof);
  }
  return { B, W, H, D };
}

/* Tipos de zona sin frente. 'abierta' es el nicho de 4 lados: conserva esa clave para que los archivos guardados sigan valiendo.
   'seminicho' solo tiene los 2 laterales, 'semivacio' (Semi abierta) solo el fondo y 'sinlados' (Abierta) nada. */
const esZonaAbierta = z => ['seminicho', 'semivacio', 'sinlados'].includes(z.tipo);
const admiteRepisas = z => !['cajon', 'semivacio', 'sinlados'].includes(z.tipo);
const CORTAN_LATERAL = ['semivacio', 'sinlados'];
const CORTAN_FONDO = ['sinlados'];

/* Parte el rango [desde, hasta] de un panel vertical: se interrumpe en las zonas de los tipos indicados */
function tramosPanel(m, c, e, desde, hasta, cortan) {
  const tramos = [];
  let y = desde;
  zonasColumna(m, c, e).filter(x => cortan.includes(x.z.tipo)).forEach(({ a, b }) => {
    if (a > y) tramos.push([y, Math.min(a, hasta)]);
    y = Math.max(y, b);
  });
  if (hasta > y) tramos.push([y, hasta]);
  return tramos;
}

/* Una columna "sin piso ni zócalo" deja libre el suelo, como el espacio de las piernas de un escritorio */
const zocaloCol = (m, c) => (c.sinBase ? 0 : +m.zocalo || 0);
const sinPisoCol = (m, c) => !!(m.sinPiso || c.sinBase);

/* Rango vertical del fondo según cómo se monta */
function rangoFondo(m, e, c) {
  const Z = zocaloCol(m, c), H = +m.alto;
  if (m.fondo === 'clavado') return [Z, H];
  return [Z + (sinPisoCol(m, c) ? 0 : e - 6), H - (m.sinTecho ? 0 : e - 6)];
}

/* La columna i comparte su lateral derecho con la siguiente */
const compartida = (cols, i) => !!(cols[i] && cols[i].compartir && cols[i + 1]);

/* Espacio que ocupa el lateral izquierdo y ancho interior: un lateral compartido se reparte a medias entre dos columnas */
function anchoInterior(cols, i, e) {
  const izq = compartida(cols, i - 1) ? e / 2 : e, der = compartida(cols, i) ? e / 2 : e;
  return { izq, Wi: (+cols[i].ancho || 0) - izq - der };
}

function unirTramos(a, b) {
  const unidos = [];
  [...a, ...b].sort((x, y) => x[0] - y[0]).forEach(([y0, y1]) => {
    const ult = unidos[unidos.length - 1];
    if (ult && y0 <= ult[1]) ult[1] = Math.max(ult[1], y1);
    else unidos.push([y0, y1]);
  });
  return unidos;
}

/* Laterales que aporta la columna i: { base: nombre, xs: posiciones desde su borde izquierdo, tramos }.
   El lateral compartido pertenece a la columna de la izquierda y se interrumpe solo donde ninguna de las dos lo necesita. */
function lateralesColumna(m, i, e) {
  const cols = m.columnas, c = cols[i], W = +c.ancho || 0, H = +m.alto;
  const propios = tramosPanel(m, c, e, 0, H, CORTAN_LATERAL);
  const conIzq = !compartida(cols, i - 1);
  // Un lateral exterior puede ir de alto completo aunque una zona abierta lo corte, para que sostenga la columna
  const izq = c.latIzqCompleto ? [[0, H]] : propios;
  if (!compartida(cols, i)) {
    const der = c.latDerCompleto ? [[0, H]] : propios;
    if (!conIzq) return [{ base: 'Lateral', xs: [W - e], tramos: der }];
    if (JSON.stringify(izq) === JSON.stringify(der)) return [{ base: 'Lateral', xs: [0, W - e], tramos: izq }];
    return [{ base: 'Lateral izquierdo', xs: [0], tramos: izq }, { base: 'Lateral derecho', xs: [W - e], tramos: der }];
  }
  const lados = [{ base: 'Lateral compartido', xs: [W - e / 2], tramos: unirTramos(propios, tramosPanel(m, cols[i + 1], e, 0, H, CORTAN_LATERAL)) }];
  if (conIzq) lados.unshift({ base: 'Lateral', xs: [0], tramos: izq });
  return lados;
}

/* La bisagra va en el lado libre de la columna; solo con ambos lados compartidos hace falta semicodo */
function bisagraColumna(cols, i) {
  const izq = compartida(cols, i - 1), der = compartida(cols, i);
  if (izq && der) return { clave: 'bisSemi', nombre: 'Semicodo', lado: 'izquierdo' };
  return { clave: 'bis', nombre: 'Recta', lado: izq ? 'derecho' : 'izquierdo' };
}

const nombreTramo = (base, tramos, i) => (tramos.length > 1 ? `${base} tramo ${i + 1}` : base);

/* Zonas de abajo hacia arriba con su tramo [a, b], su interior libre [ib, it] y si llevan entrepaño encima */
function zonasColumna(m, c, e) {
  const H = +m.alto, Z = zocaloCol(m, c);
  const zs = [...c.zonas].reverse().filter(z => (+z.alto || 0) > 0);
  let y = Z;
  return zs.map((z, i) => {
    const a = y, b = Math.min(H, y + +z.alto);
    y = b;
    const sig = zs[i + 1], ant = zs[i - 1];
    // Solo no hay tablero entre cajones seguidos o entre dos zonas abiertas: toda zona cerrada conserva su piso y su techo
    const separa = o => !(o.tipo === 'cajon' && z.tipo === 'cajon') && !(esZonaAbierta(o) && esZonaAbierta(z));
    // Grosor del tablero que entra en esta zona: junto a una zona abierta, va entero dentro de la cerrada
    const entra = o => (!o || !separa(o) || esZonaAbierta(z) ? 0 : esZonaAbierta(o) ? e : e / 2);
    return {
      z, a, b, panel: !!sig && separa(sig), yPanel: b - entra(sig),
      ib: ant ? a + entra(ant) : Z + (sinPisoCol(m, c) ? 0 : e),
      it: sig ? b - entra(sig) : H - (m.sinTecho ? 0 : e)
    };
  });
}

function piezasColumnas(m, add, mc, mf, mb) {
  const e = mc.esp, H = +m.alto, D = +m.prof, retr = retiroRepisa(m);
  (m.columnas || []).forEach((c, ci) => {
    const W = +c.ancho || 0, { Wi } = anchoInterior(m.columnas, ci, e), pre = `${c.nom} · `, Z = zocaloCol(m, c);
    lateralesColumna(m, ci, e).forEach(({ base, xs, tramos }) => {
      tramos.forEach(([y0, y1], i) => add(pre + nombreTramo(base, tramos, i), y1 - y0, D, xs.length, 1, 0, mc, 'lat'));
    });
    if (!m.sinTecho) add(pre + 'Techo', Wi, D, 1, 1, 0, mc, 'horiz');
    if (!sinPisoCol(m, c)) add(pre + 'Piso', Wi, D, 1, 1, 0, mc, 'horiz');
    if (Z > 0) {
      add(pre + 'Zócalo frontal', Wi, Z, 1, 1, 0, mc, 'zoc');
      add(pre + 'Zócalo posterior', Wi, Z, 1, 0, 0, mc, 'zoc');
    }
    if (m.fondo !== 'ninguno') {
      const clavado = m.fondo === 'clavado', fondos = tramosPanel(m, c, e, ...rangoFondo(m, e, c), CORTAN_FONDO);
      fondos.forEach(([y0, y1], i) => add(`${pre}${clavado ? 'Fondo' : 'Fondo (ranurado)'}${fondos.length > 1 ? ` tramo ${i + 1}` : ''}`, clavado ? W : Wi + 12, y1 - y0, 1, 0, 0, mb, 'fondo'));
    }

    const zonas = zonasColumna(m, c, e);
    add(pre + 'Entrepaño', Wi, D, zonas.filter(x => x.panel).length, 1, 0, mc, 'horiz');
    zonas.forEach(({ z, a, b }) => {
      const alto = b - a, nom = pre + z.nom;
      if (admiteRepisas(z)) add(`${nom} · Repisa`, Wi, D - retr, +z.rep || 0, 1, 0, mc, 'rep');
      if (z.tipo === 'puerta') add(`${nom} · Puerta`, alto - 3, W - 3, 1, 2, 2, mf, 'puerta');
      if (z.tipo === 'cajon') {
        const anchoCaja = Wi - 26, altoCaja = Math.max(80, alto - 40), profCaja = Math.max(200, D - 60);
        add(`${nom} · Frente`, alto - 3, W - 3, 1, 2, 2, mf, 'frente');
        add(`${nom} · Lateral cajón`, profCaja, altoCaja, 2, 1, 0, mc, 'caj');
        add(`${nom} · Frontal/Trasera cajón`, anchoCaja - 2 * e, altoCaja, 2, 1, 0, mc, 'caj');
        add(`${nom} · Fondo cajón`, anchoCaja - 2 * e, profCaja - 2 * e, 1, 0, 0, mb, 'caj');
      }
    });
  });
}

function geoColumnas(m, opts = {}) {
  const mc = S.mats.find(x => x.id === m.matC) || S.mats[0];
  const mf = S.mats.find(x => x.id === m.matF) || mc;
  const mb = S.mats.find(x => x.id === m.matB) || mc;
  const e = mc.esp, ef = mf.esp, eb = mb.esp, cC = mc.color, cF = mf.color, cB = mb.color;
  const H = +m.alto, D = +m.prof, retr = retiroRepisa(m);
  const B = [];
  // pieza: el mismo nombre que le da piezasColumnas, para poder resaltarla desde el despiece
  let col = 0;
  const box = (x, y, z, w, h, d, c, tag, pieza = tag) => B.push({ x, y, z, w, h, d, c, tag, pieza, col });

  let x0 = 0;
  (m.columnas || []).forEach((c, ci) => {
    col = ci;
    const W = +c.ancho || 0, { izq, Wi } = anchoInterior(m.columnas, ci, e), xi = x0 + izq, pre = `${c.nom} · `, Z = zocaloCol(m, c);
    lateralesColumna(m, ci, e).forEach(({ base, xs, tramos }) => {
      tramos.forEach(([y0, y1], i) => xs.forEach(px => box(x0 + px, y0, 0, e, y1 - y0, D, cC, 'Lateral', pre + nombreTramo(base, tramos, i))));
    });
    if (!sinPisoCol(m, c)) box(xi, Z, 0, Wi, e, D, cC, 'Piso', pre + 'Piso');
    if (!m.sinTecho) box(xi, H - e, 0, Wi, e, D, cC, 'Techo', pre + 'Techo');
    if (Z > 0) {
      box(xi, 0, D - e, Wi, Z, e, cC, 'Zócalo', pre + 'Zócalo frontal');
      box(xi, 0, 0, Wi, Z, e, cC, 'Zócalo', pre + 'Zócalo posterior');
    }
    if (opts.fondo !== false && m.fondo !== 'ninguno') {
      const clavado = m.fondo === 'clavado', fondos = tramosPanel(m, c, e, ...rangoFondo(m, e, c), CORTAN_FONDO);
      fondos.forEach(([y0, y1], i) => {
        const nom = `${pre}${clavado ? 'Fondo' : 'Fondo (ranurado)'}${fondos.length > 1 ? ` tramo ${i + 1}` : ''}`;
        if (clavado) box(x0, y0, -eb, W, y1 - y0, eb, cB, 'Fondo', nom);
        else box(xi - 6, y0, 0, Wi + 12, y1 - y0, eb, cB, 'Fondo', nom);
      });
    }
    zonasColumna(m, c, e).forEach(({ z, a, b, ib, it, panel, yPanel }) => {
      const nom = pre + z.nom;
      if (panel) box(xi, yPanel, 0, Wi, e, D, cC, 'Entrepaño', pre + 'Entrepaño');
      if (admiteRepisas(z)) {
        const n = +z.rep || 0;
        for (let i = 1; i <= n; i++) box(xi, ib + (it - ib) * i / (n + 1) - e / 2, 0, Wi, e, D - retr, cC, 'Repisa', `${nom} · Repisa`);
      }
      if (opts.puertas !== false && z.tipo === 'puerta') box(x0 + 1.5, a + 1.5, D, W - 3, b - a - 3, ef, cF, 'Puerta', `${nom} · Puerta`);
      if (opts.puertas !== false && z.tipo === 'cajon') {
        box(x0 + 1.5, a + 1.5, D, W - 3, b - a - 3, ef, cF, 'Frente cajón', `${nom} · Frente`);
        cajaCajon(box, xi + 13, a + 15, D, Wi - 26, Math.max(80, b - a - 40), Math.max(200, D - 60), e, eb, cC, cB,
          { lateral: `${nom} · Lateral cajón`, frontal: `${nom} · Frontal/Trasera cajón`, fondo: `${nom} · Fondo cajón` });
      }
    });
    x0 += W;
  });
  return { B, W: x0, H, D };
}
