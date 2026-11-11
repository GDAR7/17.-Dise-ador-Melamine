"use strict";
/* ============================================================
   PERFORACIONES
   Medidas habituales de taller. Cada plano tiene el largo de la
   pieza en horizontal: en puertas, x se mide desde el canto
   inferior; en laterales, x es la altura desde el piso e y la
   distancia desde el canto trasero.
   ============================================================ */
const CAZOLETA = { diametro: 35, aCanto: 22.5, aExtremo: 100 };
const PIN = { diametro: 5, aCanto: 37 };

/* Tipo a mostrar: la bisagra elegida en Cerrajería o, si no hay, la que corresponde al montaje */
function modeloBisagra(m, nomPieza, porDefecto) {
  const h = herrajeElegido(m, nomPieza);
  return h && h.por.startsWith('bisagra') ? h.nom.replace(/^Bisagra\s+/i, '') : porDefecto;
}

const bisagraMontaje = m => ({ embutida: 'Embutida', interior: 'Embutida', media: 'Semicodo' }[m.tipoP] || 'Recta');

function alturasBisagra(alto) {
  const { aExtremo } = CAZOLETA;
  return alto > 1600 ? [aExtremo, Math.round(alto / 2), alto - aExtremo] : [aExtremo, alto - aExtremo];
}

function planoPuerta(p, tipo, lado) {
  const xs = alturasBisagra(p.L);
  return {
    titulo: p.nom, L: p.L, A: p.A, cant: p.q,
    herraje: `Bisagra ${tipo.toLowerCase()} × ${xs.length} por puerta`,
    detalle: `Cazoleta Ø${CAZOLETA.diametro} a ${CAZOLETA.aCanto} mm del canto ${lado}, a ${xs.join(', ')} mm del canto inferior.`,
    marcas: xs.map(x => ({ x, y: CAZOLETA.aCanto, r: CAZOLETA.diametro / 2 }))
  };
}

/* alturas: caras inferiores de las repisas. correderas: altura de la línea de cada corredera */
function planoLateral(titulo, H, D, cant, alturas, correderas, retr, profCaja, compartido) {
  const prof = D - retr, redondo = v => Math.round(v);
  const marcas = alturas.flatMap(x => [PIN.aCanto, prof - PIN.aCanto].map(y => ({ x, y, r: PIN.diametro / 2 })));
  const lineas = correderas.map(x => ({ x, y0: D - profCaja, y1: D }));
  const partes = [];
  if (alturas.length) partes.push(`Soportes Ø${PIN.diametro} a ${PIN.aCanto} mm de los cantos delantero y trasero de la repisa, a ${alturas.map(redondo).join(', ')} mm del piso.`);
  if (correderas.length) partes.push(`Línea de corredera a ${correderas.map(redondo).join(', ')} mm del piso, desde el canto delantero.`);
  if (compartido) partes.push('Tablero compartido: desfasa las perforaciones de cada cara y usa tornillos cortos.');
  return {
    titulo, L: H, A: D, cant,
    herraje: [alturas.length && `${alturas.length * 2} soportes por lateral`, correderas.length && `${correderas.length} correderas por lateral`].filter(Boolean).join(' · '),
    detalle: partes.join(' '), marcas, lineas
  };
}

function perforaciones(m) {
  const e = (S.mats.find(x => x.id === m.matC) || S.mats[0]).esp;
  const D = +m.prof, retr = retiroRepisa(m), Z = +m.zocalo || 0, H = +m.alto;
  const todas = piezas(m), profCaja = Math.max(200, D - 60);
  const altoCaja = h => Math.max(80, h - 40);

  if (esPorColumnas(m)) {
    return columnasMueble(m).flatMap(({ c, i: ci, parte }) => {
      // Cada parte tiene su alto y su profundidad: las medidas se toman desde la base de sus laterales
      const vm = parte.vm, H = +vm.alto, D = +vm.prof, profCaja = Math.max(200, D - 60), pre = parte.pre + c.nom;
      const bisagra = bisagraColumna(vm.columnas, ci), zonas = zonasColumna(vm, c, e), planos = [];
      const alturas = [], correderas = [];
      zonas.forEach(({ z, a, b, ib, it }) => {
        const p = z.tipo === 'puerta' && todas.find(x => x.nom === `${pre} · ${z.nom} · Puerta`);
        if (p) planos.push(planoPuerta(p, modeloBisagra(m, p.nom, bisagra.nombre), bisagra.lado));
        if (admiteRepisas(z)) for (let i = 1, n = +z.rep || 0; i <= n; i++) alturas.push(ib + (it - ib) * i / (n + 1) - e / 2);
        if (z.tipo === 'cajon') correderas.push(a + 15 + altoCaja(b - a) / 2);
      });
      if (alturas.length || correderas.length) {
        planos.push(planoLateral(`${pre} · Laterales`, H, D, 2, alturas, correderas, retr, profCaja, compartida(vm.columnas, ci) || compartida(vm.columnas, ci - 1)));
      }
      return planos;
    });
  }

  const planos = [];
  todas.filter(p => p.kind === 'puerta').forEach(puerta => planos.push(planoPuerta(puerta, modeloBisagra(m, puerta.nom, bisagraMontaje(m)), 'de las bisagras')));
  const nr = +m.repisas || 0, nc = +m.cajones || 0, hc = +m.altoCaj || 170;
  // Las repisas de cierre van atornilladas: no llevan soportes
  const moviles = interiorMueble(m, e).repisas.filter(r => !r.cierre);
  const alturas = [...new Set(moviles.map(r => r.y))].sort((a, b) => a - b);
  const retrSoportes = moviles.length ? D - Math.min(...moviles.map(r => r.prof)) : retr;
  const correderas = Array.from({ length: nc }, (_, i) => Z + i * hc + 15 + altoCaja(hc) / 2);
  if (alturas.length || nc) planos.push(planoLateral('Laterales', H, D, 2, alturas, correderas, retrSoportes, profCaja, false));
  return planos;
}
