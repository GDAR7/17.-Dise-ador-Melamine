"use strict";
/* ============================================================
   DETALLE DE CONSTRUCCIÓN
   Agrupa las piezas de un mueble en elementos que se arman por
   separado: cuerpo, repisas, puertas y cajones.
   ============================================================ */
function elementosConstruccion(m) {
  const todas = piezas(m), porNom = new Map(todas.map(p => [p.nom, p]));
  const qty = +m.qty || 1, lista = [];
  const crear = (id, grupo, titulo, tipo, unidades, noms, extra = {}) => {
    const ps = noms.map(n => porNom.get(n)).filter(Boolean);
    if (ps.length) lista.push({ id, grupo, titulo, tipo, cant: unidades * qty, piezas: ps, mod: m, ...extra });
  };

  if (esPorColumnas(m)) {
    columnasMueble(m).forEach(({ c, i, parte }, ci) => {
      const pre = `${parte.pre}${c.nom} · `, deZonas = new Set(), grupo = parte.pre + c.nom;
      const propias = c.zonas.map((z, zi) => {
        const base = pre + z.nom, noms = {
          repisa: `${base} · Repisa`, puerta: `${base} · Puerta`,
          cajon: [`${base} · Frente`, `${base} · Lateral cajón`, `${base} · Frontal/Trasera cajón`, `${base} · Fondo cajón`]
        };
        [noms.repisa, noms.puerta, ...noms.cajon].forEach(n => deZonas.add(n));
        return { z, zi, noms };
      });
      crear(`c${ci}-cuerpo`, grupo, 'Cuerpo', 'cuerpo', 1, todas.filter(p => p.nom.startsWith(pre) && !deZonas.has(p.nom)).map(p => p.nom), { col: ci });
      const bisagra = bisagraColumna(parte.vm.columnas, i);
      propias.forEach(({ z, zi, noms }) => {
        crear(`c${ci}-z${zi}-p`, grupo, `${z.nom} · Puerta`, 'puerta', 1, [noms.puerta], { bisagra: bisagra.nombre, lado: bisagra.lado, col: ci });
        crear(`c${ci}-z${zi}-c`, grupo, `${z.nom} · Cajón`, 'cajon', 1, noms.cajon, { col: ci });
        if (porNom.has(noms.repisa)) crear(`c${ci}-z${zi}-r`, grupo, `${z.nom} · Repisas`, 'repisa', +z.rep || 1, [noms.repisa], { col: ci });
      });
    });
    crear('tablero', 'Tablero', 'Tablero del escritorio', 'cuerpo', 1, ['Tablero']);
    return lista;
  }

  const nc = +m.cajones || 0;
  crear('cuerpo', m.nom, 'Cuerpo', 'cuerpo', 1, ['Lateral', 'Techo', 'Piso', ...gruposDivisiones(m).map(g => g.nomD), 'Zócalo frontal', 'Zócalo posterior', 'Fondo', 'Fondo (ranurado)', 'Encimera']);
  todas.filter(p => p.kind === 'rep').sort((a, b) => a.nom.localeCompare(b.nom)).forEach(p => {
    const titulo = p.nom.replace(/^Repisa entera/, 'Repisas enteras').replace(/^Repisa(?!s)/, 'Repisas');
    crear(p.nom, m.nom, titulo, 'repisa', p.q / qty, [p.nom], { fija: p.nom.endsWith(' de cierre') });
  });
  gruposPuertas(m).forEach(g => crear(g.id, m.nom, g.nom, 'puerta', g.n, [g.nom], { bisagra: bisagraMontaje(m), lado: 'de las bisagras' }));
  crear('cajon', m.nom, 'Cajón', 'cajon', nc, ['Frente de cajón', 'Lateral de cajón', 'Frontal/Trasera cajón', 'Fondo de cajón']);
  return lista;
}

/* Cajas 3D de una sola unidad del elemento */
function filtrarDetalle(boxes, det) {
  const porUnidad = new Map(det.piezas.map(p => [p.nom, Math.max(1, Math.round(p.q / det.cant))]));
  const vistos = new Map();
  return boxes.filter(b => {
    if (!porUnidad.has(b.pieza)) return false;
    const n = (vistos.get(b.pieza) || 0) + 1;
    vistos.set(b.pieza, n);
    return n <= porUnidad.get(b.pieza);
  });
}

/* Herrajes y pasos de armado de un elemento */
function guiaConstruccion(el) {
  const busca = t => el.piezas.find(p => p.nom.includes(t));
  const herrajes = lineasElemento(el).map(textoLinea);
  if (el.tipo === 'cajon') {
    const lat = busca('Lateral'), fro = busca('Frontal');
    return {
      herrajes,
      pasos: [
        `Une el frontal y la trasera (${nf(fro.L)} mm) entre los dos laterales (${nf(lat.L)} mm).`,
        'Coloca el fondo por debajo y clávalo; úsalo para dejar la caja a escuadra, comparando las dos diagonales.',
        `Fija la parte interior de la corredera a cada lateral de la caja. Elige el largo comercial más cercano sin pasar de ${nf(lat.L)} mm.`,
        'Fija la parte exterior de la corredera al lateral del mueble, en la altura indicada en Perforaciones.',
        'Presenta el frente y atorníllalo desde dentro de la caja, dejando unos 3 mm de luz con los frentes vecinos.',
        'Coloca el tirador y regula la corredera.'
      ]
    };
  }
  if (el.tipo === 'puerta') {
    const p = el.piezas[0], n = alturasBisagra(p.L).length;
    return {
      herrajes,
      pasos: [
        `Perfora ${n} cazoletas Ø${CAZOLETA.diametro} a ${CAZOLETA.aCanto} mm del canto ${el.lado}, a ${alturasBisagra(p.L).join(', ')} mm del canto inferior.`,
        'Atornilla las bisagras a la puerta.',
        'Fija las bases de bisagra al lateral del mueble, a la misma altura.',
        'Monta la puerta y regula los tornillos de la bisagra hasta dejar una luz pareja.',
        'Coloca el tirador.'
      ]
    };
  }
  if (el.tipo === 'repisa' && el.fija) {
    return {
      herrajes,
      pasos: [
        'Es una repisa fija: llega hasta el frente y cierra el espacio de la puerta.',
        'Márcala a la altura del plano y atorníllala entre los laterales, igual que un entrepaño.',
        'Pon el tapacanto en el lado que quedará al frente antes de fijarla.'
      ]
    };
  }
  if (el.tipo === 'repisa') {
    return {
      herrajes,
      pasos: [
        'Perfora los soportes en los laterales, en las alturas indicadas en Perforaciones.',
        'Pon el tapacanto en el lado que quedará al frente.',
        'Inserta los soportes y apoya la repisa, comprobando que no se balancee.'
      ]
    };
  }
  return {
    herrajes: clavosFondo(el) ? [...herrajes, `${nf(clavosFondo(el))} × clavos para el fondo`] : herrajes,
    pasos: [
      'Antes de armar, haz en los laterales las perforaciones de soportes y correderas.',
      'Une el piso y el techo entre los laterales, y luego los entrepaños.',
      'Coloca los zócalos, si los lleva.',
      'Coloca el fondo y úsalo para dejar el cuerpo a escuadra, comparando las dos diagonales.',
      'Instala el cuerpo nivelado y fíjalo a la pared o a los muebles vecinos.'
    ]
  };
}
