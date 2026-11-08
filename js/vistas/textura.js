"use strict";
/* ============================================================
   TEXTURAS DE MELAMINA
   La imagen se guarda en el material ya reducida y con su lado
   mayor en horizontal, que es el sentido de la veta y del largo
   de la plancha.
   ============================================================ */
const TEX_MAX_LADO = 800, TEX_CALIDAD = 0.78;
const _texturas = new Map();
const _ctxAux = document.createElement('canvas').getContext('2d');

/* Convierte un archivo de imagen en la textura que se guarda en el material */
function prepararTextura(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('imagen no válida')); };
    img.onload = () => {
      const girar = img.height > img.width;
      const escala = Math.min(1, TEX_MAX_LADO / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      const cv = document.createElement('canvas');
      cv.width = girar ? h : w; cv.height = girar ? w : h;
      const c = cv.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
      if (girar) { c.translate(cv.width, 0); c.rotate(Math.PI / 2); }
      c.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolver(cv.toDataURL('image/jpeg', TEX_CALIDAD));
    };
    img.src = url;
  });
}

function colorMedio(img) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 8;
  const c = cv.getContext('2d');
  c.drawImage(img, 0, 0, 8, 8);
  const d = c.getImageData(0, 0, 8, 8).data, s = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; }
  return '#' + s.map(v => Math.round(v / 64).toString(16).padStart(2, '0')).join('');
}

/* Textura lista para pintar, o null. Al terminar de cargar una imagen se vuelve a dibujar todo. */
function texturaDe(mat) {
  if (!mat || typeof mat.textura !== 'string' || !mat.textura.startsWith('data:image/')) return null;
  let t = _texturas.get(mat.textura);
  if (!t) {
    const img = new Image();
    t = { img, listo: false };
    _texturas.set(mat.textura, t);
    img.onload = () => {
      t.patron = _ctxAux.createPattern(img, 'repeat');
      t.color = colorMedio(img);
      t.listo = true;
      recalc();
    };
    img.src = mat.textura;
  }
  return t.listo ? t : null;
}

/* Píxeles de la imagen por cada milímetro real */
const pxPorMm = (t, mat) => t.img.width / (+mat.texAncho || +mat.fw || 2500);

/* Rellena el trazado actual con la textura, dada la matriz imagen → pantalla */
function rellenarTextura(ctx, t, a, b, c, d, e, f) {
  t.patron.setTransform(new DOMMatrix([a, b, c, d, e, f]));
  ctx.fillStyle = t.patron;
  ctx.fill();
}

/* Triángulo con textura: p son puntos de pantalla y q sus coordenadas en la imagen */
function trianguloTextura(ctx, t, p0, p1, p2, q0, q1, q2) {
  const det = q0[0] * (q1[1] - q2[1]) + q1[0] * (q2[1] - q0[1]) + q2[0] * (q0[1] - q1[1]);
  if (!det) return;
  const res = (v0, v1, v2) => [
    (v0 * (q1[1] - q2[1]) + v1 * (q2[1] - q0[1]) + v2 * (q0[1] - q1[1])) / det,
    (v0 * (q2[0] - q1[0]) + v1 * (q0[0] - q2[0]) + v2 * (q1[0] - q0[0])) / det,
    (v0 * (q1[0] * q2[1] - q2[0] * q1[1]) + v1 * (q2[0] * q0[1] - q0[0] * q2[1]) + v2 * (q0[0] * q1[1] - q1[0] * q0[1])) / det
  ];
  const [a, c, e] = res(p0[0], p1[0], p2[0]), [b, d, f] = res(p0[1], p1[1], p2[1]);
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
  ctx.closePath();
  rellenarTextura(ctx, t, a, b, c, d, e, f);
}
