"use strict";
/* ============================================================
   NUBE: ingreso con correo y clave (Firebase Authentication) y
   proyectos guardados en la cuenta de cada usuario (Firestore,
   en usuarios/{uid}/proyectos/{id}). Solo se activa si
   FIREBASE_CONFIG tiene datos; si no, la app sigue como siempre.
   ============================================================ */
const FIREBASE_VERSION = '10.12.2';
const LIMITE_DOC = 1000000;          // Firestore admite documentos de hasta 1 MiB
const ESPERA_GUARDADO_MS = 1500;

const NUBE = { activa: false, auth: null, db: null, user: null, listo: false, ultimo: '', timer: null, avisoGrande: false };

function cargarScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error(src));
    document.head.appendChild(s);
  });
}

const coleccionProyectos = () => NUBE.db.collection('usuarios').doc(NUBE.user.uid).collection('proyectos');
const idNuevo = () => NUBE.db.collection('_').doc().id;

/* ---------- Ingreso ---------- */
const MENSAJES_AUTH = {
  'auth/invalid-credential': 'Correo o clave incorrectos.',
  'auth/wrong-password': 'Correo o clave incorrectos.',
  'auth/user-not-found': 'Correo o clave incorrectos.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está desactivada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'auth/missing-password': 'Escribe tu clave.'
};
const mensajeAuth = e => MENSAJES_AUTH[e && e.code] || 'No se pudo ingresar. Inténtalo de nuevo.';

function mostrarLogin(estado) {
  const box = $('#login');
  box.hidden = false;
  box.querySelector('.login-form').hidden = estado === 'cargando';
  box.querySelector('.login-cargando').hidden = estado !== 'cargando';
  if (estado !== 'cargando') setTimeout(() => $('#lgCorreo').focus(), 30);
}

function prepararLogin() {
  const err = $('#lgError');
  $('#lgForm').onsubmit = async e => {
    e.preventDefault();
    err.textContent = '';
    const boton = $('#lgEntrar');
    boton.disabled = true; boton.textContent = 'Ingresando…';
    try { await NUBE.auth.signInWithEmailAndPassword($('#lgCorreo').value.trim(), $('#lgClave').value); }
    catch (x) { err.textContent = mensajeAuth(x); }
    finally { boton.disabled = false; boton.textContent = 'Ingresar'; }
  };
  $('#lgOlvido').onclick = async () => {
    const correo = $('#lgCorreo').value.trim();
    if (!correo) { err.textContent = 'Escribe tu correo y vuelve a pulsar "Olvidé mi clave".'; return; }
    try {
      await NUBE.auth.sendPasswordResetEmail(correo);
      err.textContent = '';
      toast('Si el correo tiene cuenta, recibirás un enlace para cambiar la clave');
    } catch (x) { err.textContent = mensajeAuth(x); }
  };
}

/* ---------- Proyectos ---------- */
function aplicarProyecto(datos, id) {
  S = Object.assign(defState(), datos);
  S.nubeId = id;
  asegurarHerrajes(S);
  S.sel = S.mods.some(m => m.id === S.sel) ? S.sel : (S.mods[0] ? S.mods[0].id : null);
  historial.length = 0;            // deshacer no debe volver al proyecto anterior
  NUBE.ultimo = JSON.stringify(S);
  refresh();
}

async function abrirUltimoProyecto() {
  const snap = await coleccionProyectos().orderBy('actualizado', 'desc').limit(1).get();
  if (snap.empty) {
    // Primera vez: lo que había en este navegador pasa a ser su primer proyecto
    S.nubeId = idNuevo();
    await subirProyecto(true);
    return;
  }
  const doc = snap.docs[0];
  aplicarProyecto(JSON.parse(doc.data().datos), doc.id);
}

async function subirProyecto(forzar = false) {
  if (!NUBE.user || !S) return;
  if (!S.nubeId) S.nubeId = idNuevo();
  const datos = JSON.stringify(S);
  if (!forzar && datos === NUBE.ultimo) return;
  if (datos.length > LIMITE_DOC) {
    if (!NUBE.avisoGrande) toast('El proyecto es muy grande para la nube (por las fotos de textura): usa Guardar para conservarlo');
    NUBE.avisoGrande = true;
    return;
  }
  NUBE.avisoGrande = false;
  estadoNube('Guardando…');
  try {
    await coleccionProyectos().doc(S.nubeId).set({
      nombre: S.proyecto || 'Sin nombre', datos, muebles: S.mods.length,
      actualizado: firebase.firestore.FieldValue.serverTimestamp()
    });
    NUBE.ultimo = datos;
    estadoNube('Guardado en la nube');
  } catch (x) {
    estadoNube('Sin guardar en la nube');
    toast('No se pudo guardar en la nube: revisa tu conexión');
  }
}

/* Lo llama save() en cada cambio: se sube unos segundos después del último */
function nubeCambio() {
  if (!NUBE.listo) return;
  clearTimeout(NUBE.timer);
  NUBE.timer = setTimeout(() => subirProyecto(), ESPERA_GUARDADO_MS);
}

function estadoNube(txt) { const el = $('#nubeEstado'); if (el) el.textContent = txt; }

/* ---------- Ventana "Mis proyectos" ---------- */
async function abrirDialogoProyectos() {
  const dlg = $('#nubeDlg'), lista = $('#nubeLista');
  dlg.hidden = false;
  lista.innerHTML = '<div class="nube-vacio">Cargando…</div>';
  await subirProyecto();
  try {
    const snap = await coleccionProyectos().orderBy('actualizado', 'desc').get();
    const fecha = ts => (ts ? ts.toDate().toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '');
    lista.innerHTML = snap.empty ? '<div class="nube-vacio">Aún no tienes proyectos guardados.</div>' : snap.docs.map(d => {
      const p = d.data(), actual = d.id === S.nubeId;
      return `<div class="nube-fila${actual ? ' on' : ''}">
        <div class="nm"><b>${esc(p.nombre)}</b><span>${p.muebles || 0} mueble(s) · ${fecha(p.actualizado)}</span></div>
        ${actual ? '<span class="pill">Abierto</span>' : `<button class="btn" data-nabrir="${d.id}">Abrir</button>`}
        <button class="btn" data-nborrar="${d.id}" title="Borrar proyecto" aria-label="Borrar ${esc(p.nombre)}">×</button>
      </div>`;
    }).join('');
    lista.querySelectorAll('[data-nabrir]').forEach(b => b.onclick = async () => {
      const doc = await coleccionProyectos().doc(b.dataset.nabrir).get();
      if (!doc.exists) { toast('Ese proyecto ya no existe'); return; }
      aplicarProyecto(JSON.parse(doc.data().datos), doc.id);
      dlg.hidden = true; toast(`Abierto: ${S.proyecto}`);
    });
    lista.querySelectorAll('[data-nborrar]').forEach(b => b.onclick = async () => {
      const id = b.dataset.nborrar, nombre = b.closest('.nube-fila').querySelector('b').textContent;
      if (!confirm(`¿Borrar el proyecto "${nombre}" de la nube? No se puede deshacer.`)) return;
      await coleccionProyectos().doc(id).delete();
      if (id === S.nubeId) {
        // El abierto sigue en pantalla: solo vuelve a la nube, como proyecto nuevo, si se sigue editando
        S.nubeId = idNuevo();
        NUBE.ultimo = JSON.stringify(S);
      }
      abrirDialogoProyectos();
    });
  } catch (x) {
    lista.innerHTML = '<div class="nube-vacio">No se pudo leer la lista. Revisa tu conexión.</div>';
  }
}

function prepararBarra() {
  $('#bNube').onclick = abrirDialogoProyectos;
  $('#nubeCerrar').onclick = () => { $('#nubeDlg').hidden = true; };
  $('#nubeDlg').onclick = e => { if (e.target.id === 'nubeDlg') $('#nubeDlg').hidden = true; };
  $('#nubeNuevo').onclick = async () => {
    await subirProyecto();
    const nombre = prompt('Nombre del proyecto nuevo:', 'Proyecto nuevo');
    if (nombre === null) return;
    const st = defState();
    st.proyecto = nombre.trim() || 'Proyecto nuevo';
    st.sel = null;
    aplicarProyecto(st, idNuevo());
    await subirProyecto(true);
    $('#nubeDlg').hidden = true; toast('Proyecto nuevo creado');
  };
  $('#bSalir').onclick = async () => {
    await subirProyecto();
    await NUBE.auth.signOut();
  };
}

/* Al salir no queda nada del usuario en este navegador: el siguiente que ingrese no lo ve */
function limpiarSesionLocal() {
  NUBE.listo = false;
  clearTimeout(NUBE.timer);
  try { localStorage.removeItem('melamina.v1'); } catch (e) { }
  S = defState(); asegurarHerrajes(S); S.sel = null;
  historial.length = 0;
  NUBE.ultimo = '';
  refresh();
}

async function iniciarNube() {
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG) return;
  NUBE.activa = true;
  document.body.classList.add('con-nube');
  mostrarLogin('cargando');
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
    await cargarScript(base + 'firebase-app-compat.js');
    await Promise.all([cargarScript(base + 'firebase-auth-compat.js'), cargarScript(base + 'firebase-firestore-compat.js')]);
  } catch (x) {
    $('#login .login-cargando').textContent = 'No se pudo conectar. Revisa tu internet y recarga la página.';
    return;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  NUBE.auth = firebase.auth();
  NUBE.auth.languageCode = 'es';
  NUBE.db = firebase.firestore();
  prepararLogin();
  prepararBarra();

  NUBE.auth.onAuthStateChanged(async user => {
    if (!user) {
      if (NUBE.user) limpiarSesionLocal();
      NUBE.user = null;
      $('#nubeBar').hidden = true;
      mostrarLogin('form');
      return;
    }
    NUBE.user = user;
    mostrarLogin('cargando');
    try {
      await abrirUltimoProyecto();
      NUBE.listo = true;
      $('#nubeUsuario').textContent = user.email;
      $('#nubeBar').hidden = false;
      $('#login').hidden = true;
      $('#lgClave').value = '';
      estadoNube('Guardado en la nube');
    } catch (x) {
      $('#login .login-cargando').textContent = 'No se pudieron leer tus proyectos. Revisa tu conexión y recarga la página.';
    }
  });
}

/* Un archivo abierto desde el equipo es un proyecto aparte: no reemplaza al que estaba en la nube */
function nubeArchivoAbierto() {
  if (NUBE.db) S.nubeId = idNuevo();
}

iniciarNube();
