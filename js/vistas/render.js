"use strict";
/* ============================================================
   RENDER REALISTA
   Trazado de rayos sobre las cajas del mueble, con sol, luz
   ambiente, rebote y brillo. Corre en hilos de fondo y se afina
   pasada a pasada, sin librerías ni internet.
   ============================================================ */

/* Código de cada hilo. No puede usar nada de fuera: se convierte en texto para crear el Worker */
function nucleoRender() {
  let E, cajas, nodos, texs, W, H;
  let sem = ((Math.random() * 0xfffffff0) >>> 0) + 1;
  const rnd = () => { sem ^= sem << 13; sem ^= sem >>> 17; sem ^= sem << 5; return (sem >>> 0) / 4294967296; };

  const SOL = (() => { const v = [-0.5, 0.85, 0.75], n = Math.hypot(...v); return v.map(c => c / n); })();
  const SOL_COLOR = [2.1, 1.95, 1.75], ENV = [1.0, 0.98, 0.95];
  const PISO = [0.42, 0.4, 0.38], PARED = [0.78, 0.76, 0.72];
  const AMBIENTE = 1.0, RELLENO = 0.12, EPS = 0.3, VETA_BRILLO = 0.06;

  let hT = 0, hI = -1, hEje = 0, hSg = 0;
  let RS = 0, GS = 0, BS = 0, R = 0, G = 0, B = 0, AR = 0, AG = 0, AB = 0;
  const P = [0, 0, 0], pila = new Int32Array(128);

  function armar(lista) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    lista.forEach(c => { for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], c.a[i]); b[i + 3] = Math.max(b[i + 3], c.z[i]); } });
    const id = nodos.length, nodo = { b, izq: -1, der: -1, lista: null };
    nodos.push(nodo);
    if (lista.length <= 2) { nodo.lista = lista; return id; }
    let eje = 0;
    for (let i = 1; i < 3; i++) if (b[i + 3] - b[i] > b[eje + 3] - b[eje]) eje = i;
    const orden = [...lista].sort((p, q) => (p.a[eje] + p.z[eje]) - (q.a[eje] + q.z[eje]));
    const mitad = orden.length >> 1;
    nodo.izq = armar(orden.slice(0, mitad));
    nodo.der = armar(orden.slice(mitad));
    return id;
  }

  function trazar(ox, oy, oz, dx, dy, dz, cualquiera) {
    hI = -1; hT = 1e12;
    if (dy < 0 && oy > E.piso) { const t = (E.piso - oy) / dy; if (t < hT) { hT = t; hI = -2; hEje = 1; hSg = 1; if (cualquiera) return true; } }
    if (dz < 0 && oz > E.pared) { const t = (E.pared - oz) / dz; if (t < hT) { hT = t; hI = -3; hEje = 2; hSg = 1; if (cualquiera) return true; } }
    const ix = 1 / (dx || 1e-12), iy = 1 / (dy || 1e-12), iz = 1 / (dz || 1e-12);
    let p = 0;
    pila[p++] = 0;
    while (p) {
      const n = nodos[pila[--p]], b = n.b;
      let t1 = (b[0] - ox) * ix, t2 = (b[3] - ox) * ix;
      let tn = t1 < t2 ? t1 : t2, tf = t1 < t2 ? t2 : t1;
      t1 = (b[1] - oy) * iy; t2 = (b[4] - oy) * iy;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      if (t1 > tn) tn = t1; if (t2 < tf) tf = t2;
      t1 = (b[2] - oz) * iz; t2 = (b[5] - oz) * iz;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      if (t1 > tn) tn = t1; if (t2 < tf) tf = t2;
      if (tf < tn || tf < 0 || tn >= hT) continue;
      if (!n.lista) { pila[p++] = n.izq; pila[p++] = n.der; continue; }
      for (const c of n.lista) {
        const a = c.a, z = c.z;
        let u1 = (a[0] - ox) * ix, u2 = (z[0] - ox) * ix, e = 0;
        let cn = u1 < u2 ? u1 : u2, cf = u1 < u2 ? u2 : u1;
        u1 = (a[1] - oy) * iy; u2 = (z[1] - oy) * iy;
        if (u1 > u2) { const s = u1; u1 = u2; u2 = s; }
        if (u1 > cn) { cn = u1; e = 1; } if (u2 < cf) cf = u2;
        u1 = (a[2] - oz) * iz; u2 = (z[2] - oz) * iz;
        if (u1 > u2) { const s = u1; u1 = u2; u2 = s; }
        if (u1 > cn) { cn = u1; e = 2; } if (u2 < cf) cf = u2;
        if (cn <= cf && cn > 1e-4 && cn < hT) {
          hT = cn; hI = c.i; hEje = e;
          hSg = (e === 0 ? dx : e === 1 ? dy : dz) < 0 ? 1 : -1;
          if (cualquiera) return true;
        }
      }
    }
    return hI !== -1;
  }

  /* Color lineal de la caja c en el punto P */
  function albedo(c, eje) {
    if (c.tex >= 0 && eje === c.fijo) {
      const t = texs[c.tex];
      let u = (P[c.ejeL] - c.a[c.ejeL] + c.desp) * c.esc, v = (P[c.ejeA] - c.a[c.ejeA] + c.desp) * c.esc;
      if (c.girar) { const s = u; u = v; v = s; }
      const x = ((u | 0) % t.w + t.w) % t.w, y = ((v | 0) % t.h + t.h) % t.h, k = (y * t.w + x) * 3;
      AR = t.lin[k]; AG = t.lin[k + 1]; AB = t.lin[k + 2];
      return;
    }
    AR = c.color[0]; AG = c.color[1]; AB = c.color[2];
  }

  /* Luz aproximada que llega desde el último impacto de un rayo secundario */
  function radianciaSec(ox, oy, oz, dx, dy, dz) {
    if (hI === -1) { RS = ENV[0]; GS = ENV[1]; BS = ENV[2]; return; }
    if (hI < 0) { const a = hI === -2 ? PISO : PARED; RS = a[0] * 0.85; GS = a[1] * 0.85; BS = a[2] * 0.85; return; }
    P[0] = ox + dx * hT; P[1] = oy + dy * hT; P[2] = oz + dz * hT;
    albedo(cajas[hI], hEje);
    const luz = 0.5 + 0.6 * Math.max(0, hSg * SOL[hEje]);
    RS = AR * luz; GS = AG * luz; BS = AB * luz;
  }

  function muestra(ox, oy, oz, dx, dy, dz) {
    if (!trazar(ox, oy, oz, dx, dy, dz, false)) { R = 0.08; G = 0.08; B = 0.1; return; }
    const i = hI, eje = hEje, sg = hSg, t = hT;
    const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
    let ar, ag, ab;
    if (i < 0) { const a = i === -2 ? PISO : PARED; ar = a[0]; ag = a[1]; ab = a[2]; }
    else { P[0] = px; P[1] = py; P[2] = pz; albedo(cajas[i], eje); ar = AR; ag = AG; ab = AB; }
    const qx = px + (eje === 0 ? sg * EPS : 0), qy = py + (eje === 1 ? sg * EPS : 0), qz = pz + (eje === 2 ? sg * EPS : 0);

    // Brillo de la melamina: reflejo según el ángulo (Fresnel)
    const coseno = Math.abs(eje === 0 ? dx : eje === 1 ? dy : dz);
    if (i >= 0 && rnd() < 0.04 + 0.96 * Math.pow(1 - coseno, 5)) {
      let rx = dx + (rnd() - 0.5) * VETA_BRILLO, ry = dy + (rnd() - 0.5) * VETA_BRILLO, rz = dz + (rnd() - 0.5) * VETA_BRILLO;
      if (eje === 0) rx = sg * Math.abs(dx); else if (eje === 1) ry = sg * Math.abs(dy); else rz = sg * Math.abs(dz);
      const n = Math.hypot(rx, ry, rz);
      rx /= n; ry /= n; rz /= n;
      trazar(qx, qy, qz, rx, ry, rz, false);
      radianciaSec(qx, qy, qz, rx, ry, rz);
      R = RS; G = GS; B = BS;
      return;
    }

    // Sol con penumbra
    let sx = SOL[0] + (rnd() - 0.5) * 0.1, sy = SOL[1] + (rnd() - 0.5) * 0.1, sz = SOL[2] + (rnd() - 0.5) * 0.1;
    const ns = Math.hypot(sx, sy, sz);
    sx /= ns; sy /= ns; sz /= ns;
    let directa = sg * (eje === 0 ? sx : eje === 1 ? sy : sz);
    if (directa < 0) directa = 0;
    else if (trazar(qx, qy, qz, sx, sy, sz, true)) directa = 0;

    // Luz ambiente y rebote en una dirección al azar del hemisferio
    const u = rnd(), fi = 6.283185307 * rnd(), r = Math.sqrt(u), a1 = r * Math.cos(fi), a2 = r * Math.sin(fi), nz = sg * Math.sqrt(1 - u);
    const hx = eje === 0 ? nz : a1, hy = eje === 1 ? nz : (eje === 0 ? a1 : a2), hz = eje === 2 ? nz : a2;
    trazar(qx, qy, qz, hx, hy, hz, false);
    radianciaSec(qx, qy, qz, hx, hy, hz);

    const relleno = RELLENO * coseno;
    R = ar * (SOL_COLOR[0] * directa + AMBIENTE * RS + relleno);
    G = ag * (SOL_COLOR[1] * directa + AMBIENTE * GS + relleno);
    B = ab * (SOL_COLOR[2] * directa + AMBIENTE * BS + relleno);
  }

  function pasada() {
    const c = E.cam, f = 1 / (c.sc * c.F), origen = -(c.F + c.span * 0.1);
    const suma = new Float32Array(W * H * 3);
    // Punto de la cámara en el mundo
    const ey = origen * c.sp, ez1 = origen * c.cp, ex = -ez1 * c.sy, ez = ez1 * c.cy;
    const ox = ex + c.cx0, oy = ey + c.cy0, oz = c.cz0 - ez;
    let k = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const x1 = (x + rnd() - W / 2) * f, y2 = (H / 2 - y - rnd()) * f;
        const wy = y2 * c.cp + c.sp, z1 = -y2 * c.sp + c.cp, wx = x1 * c.cy - z1 * c.sy, wz = x1 * c.sy + z1 * c.cy;
        const n = Math.hypot(wx, wy, wz);
        muestra(ox, oy, oz, wx / n, wy / n, -wz / n);
        suma[k++] = R; suma[k++] = G; suma[k++] = B;
      }
    }
    postMessage(suma.buffer, [suma.buffer]);
  }

  onmessage = ev => {
    if (ev.data !== 'seguir') {
      E = ev.data; cajas = E.cajas; W = E.w; H = E.h; nodos = [];
      texs = E.tex.map(t => {
        const lin = new Float32Array(t.w * t.h * 3);
        for (let i = 0, j = 0; i < t.datos.length; i += 4) for (let c = 0; c < 3; c++) lin[j++] = Math.pow(t.datos[i + c] / 255, 2.2);
        return { w: t.w, h: t.h, lin };
      });
      armar(cajas);
    }
    pasada();
  };
}

const CALIDADES_RENDER = { borrador: { f: 1, n: 24 }, normal: { f: 1.5, n: 80 }, alta: { f: 2, n: 250 } };
let _render = null;

const renderActivo = () => !!_render;

function detenerHilos() {
  if (_render) _render.hilos.forEach(h => h.terminate());
}

function cerrarRender() {
  detenerHilos();
  _render = null;
  $('#renderBox').hidden = true;
}

const hexALineal = hex => [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));

function imagenDeTextura(t) {
  const cv = document.createElement('canvas');
  cv.width = t.img.width; cv.height = t.img.height;
  const c = cv.getContext('2d');
  c.drawImage(t.img, 0, 0);
  return { w: cv.width, h: cv.height, datos: c.getImageData(0, 0, cv.width, cv.height).data };
}

/* Datos que necesita cada hilo, con el mismo encuadre de la Vista 3D */
function datosRender(rw, rh, f, ancho, alto) {
  const mods = V3.all ? modsVisibles() : S.mods.filter(m => m.id === S.sel);
  const esc = armarEscena(mods, null, { puertas: V3.puertas, fondo: V3.fondo });
  if (!esc || !esc.boxes.length) return null;
  const span = Math.max(esc.totW, esc.maxH, esc.maxD) * 1.45 * (1 + esc.k);
  const piso = Math.min(...esc.boxes.map(b => b.y));
  // La cámara nunca baja del piso: desde ahí el mueble se vería flotando
  const pitch = Math.min(V3.pitch, Math.asin(cl((esc.cy0 - piso - 300) / (2.7 * span), -1, 1)));
  const texIds = new Map(), tex = [];
  const cajas = esc.boxes.map((b, i) => {
    let t = -1;
    if (b.tex) {
      if (!texIds.has(b.tex)) { texIds.set(b.tex, tex.length); tex.push(imagenDeTextura(b.tex)); }
      t = texIds.get(b.tex);
    }
    const ejes = b.tex ? ejesTextura(b) : { fijo: -1, ejeL: 0, ejeA: 1 };
    return {
      i, a: [b.x, b.y, b.z], z: [b.x + b.w, b.y + b.h, b.z + b.d],
      color: hexALineal(b.tex ? b.tex.color : b.c), tex: t, ...ejes,
      desp: (i * 347) % 2000, esc: b.tex ? pxPorMm(b.tex, b.mat) : 0, girar: !!(b.mat && b.mat.texGirar)
    };
  });
  return {
    w: rw, h: rh, cajas, tex,
    piso, pared: Math.min(...esc.boxes.map(b => b.z)) - 1,
    cam: {
      cx0: esc.cx0, cy0: esc.cy0, cz0: esc.cz0, span, F: span * 2.6, sc: Math.min(ancho, alto) / span * V3.zoom * f,
      cy: Math.cos(V3.yaw), sy: Math.sin(V3.yaw), cp: Math.cos(pitch), sp: Math.sin(pitch)
    }
  };
}

function pintarRender(r) {
  r.pendiente = false;
  const d = r.imagen.data, s = r.suma, n = r.hechas;
  // Exposición y curva ACES, luego corrección gamma
  const mapa = v => {
    const x = v / n * 0.72;
    return Math.pow(Math.min(1, Math.max(0, x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14))), 1 / 2.2) * 255;
  };
  for (let i = 0, j = 0; i < s.length; i += 3, j += 4) {
    d[j] = mapa(s[i]); d[j + 1] = mapa(s[i + 1]); d[j + 2] = mapa(s[i + 2]); d[j + 3] = 255;
  }
  r.ctx.putImageData(r.imagen, 0, 0);
}

function iniciarRender() {
  detenerHilos();
  _render = null;
  const base = $('#cv3'), caja = $('#renderBox'), cv = $('#cvRender');
  const ancho = base.clientWidth, alto = base.clientHeight;
  caja.hidden = false;
  if (!ancho || !alto) { cerrarRender(); return; }
  const cal = CALIDADES_RENDER[$('#sRender').value];
  const rw = Math.round(ancho * cal.f), rh = Math.round(alto * cal.f);
  const datos = datosRender(rw, rh, cal.f, ancho, alto);
  if (!datos) { cerrarRender(); toast('Selecciona o crea un módulo'); return; }

  cv.width = rw; cv.height = rh;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#101217'; ctx.fillRect(0, 0, rw, rh);
  ctx.drawImage(base, 0, 0, rw, rh);   // vista previa mientras llega la primera pasada

  const r = { hilos: [], suma: new Float64Array(rw * rh * 3), imagen: ctx.createImageData(rw, rh), ctx, hechas: 0, pedidas: 0, total: cal.n, pendiente: false };
  _render = r;
  const estado = $('#renderEstado');
  estado.textContent = 'Calculando la primera pasada…';

  const url = URL.createObjectURL(new Blob([`(${nucleoRender.toString()})()`], { type: 'text/javascript' }));
  const fallo = () => { if (_render === r) { cerrarRender(); toast('Este navegador no pudo calcular el render'); } };
  try {
    const n = Math.min(r.total, cl((navigator.hardwareConcurrency || 4) - 1, 1, 8));
    for (let i = 0; i < n; i++) {
      const hilo = new Worker(url);
      hilo.onerror = fallo;
      hilo.onmessage = ev => {
        if (_render !== r) return;
        const pasada = new Float32Array(ev.data);
        for (let k = 0; k < pasada.length; k++) r.suma[k] += pasada[k];
        r.hechas++;
        if (r.hechas >= r.total) {
          r.hilos.forEach(h => h.terminate());
          pintarRender(r);
          estado.textContent = `Listo · ${rw} × ${rh} px`;
          return;
        }
        estado.textContent = `Afinando… ${r.hechas} de ${r.total}`;
        if (!r.pendiente) { r.pendiente = true; requestAnimationFrame(() => { if (_render === r) pintarRender(r); }); }
        if (r.pedidas < r.total) { r.pedidas++; hilo.postMessage('seguir'); }
      };
      r.hilos.push(hilo);
      r.pedidas++;
      hilo.postMessage(datos);
    }
  } catch (e) {
    fallo();
  } finally {
    URL.revokeObjectURL(url);
  }
}

$('#bRender').onclick = iniciarRender;
$('#bRenderCerrar').onclick = cerrarRender;
$('#sRender').onchange = iniciarRender;
$('#bRenderPng').onclick = () => {
  const m = S.mods.find(x => x.id === S.sel);
  const archivo = nombreArchivo(`${m ? m.nom : S.proyecto} - render`, 'png');
  if (archivo) $('#cvRender').toBlob(b => { descargar(b, archivo); toast(`Guardado como ${archivo}`); }, 'image/png');
};
