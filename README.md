# Diseñador de Melamina

Aplicación web para diseñar muebles de melamina: genera el despiece, optimiza el corte de las planchas, muestra vistas 2D y 3D y calcula el costo.

## Cómo usarla

Abre `index.html` con doble clic. No necesita instalación ni servidor.

El trabajo se conserva en el navegador. **Guardar** descarga un archivo `.json` con el proyecto, **Abrir** lo recupera reemplazando el proyecto actual y **Agregar archivo** suma sus muebles al proyecto abierto, para calcular juntos las planchas de varios muebles.

## Estructura

```
index.html              Estructura de la página
css/estilos.css         Estilos
js/
  utilidades.js         Funciones de ayuda
  nucleo/
    estado.js           Datos del proyecto y guardado
    despiece.js         Piezas, herrajes y tapacanto
    columnas.js         Muebles por columnas y zonas
    perforaciones.js    Posición de bisagras, correderas y soportes
    construccion.js     Elementos del mueble y pasos de armado
    cerrajeria.js       Herrajes y tornillos por elemento
    excel.js            Creación de archivos .xlsx
    corte.js            Optimización de planchas
  vistas/
    textura.js          Imágenes de melamina
    vista3d.js          Vista 3D
    render.js           Render realista por trazado de rayos
    vista2d.js          Plano 2D con cotas
    detalle2d.js        Vistas acotadas de cada elemento
  ui/
    lista-modulos.js    Lista de módulos y plantillas
    parametros.js       Panel de parámetros
    columnas.js         Editor de columnas y zonas
    tabla-despiece.js   Pestaña Despiece
    planchas.js         Pestaña Planchas
    costeo.js           Pestaña Costeo
    perforaciones.js    Pestaña Perforaciones
    cerrajeria.js       Pestaña Cerrajería y catálogo
    salidas.js          Descargas, Excel, etiquetas e impresiones especiales
    construccion.js     Pestaña Construcción y manual imprimible
  app.js                Pestañas, botones e inicio
  firebase-config.js    Datos del proyecto de Firebase (null = sin usuarios)
  nube.js               Ingreso con correo y clave, y proyectos en la nube
```

Los scripts se cargan en el orden indicado en `index.html`, y `app.js` arranca la aplicación. Después solo van `firebase-config.js` y `nube.js`, que agregan el ingreso con usuario cuando hay configuración.

## Publicar en GitHub Pages

En el repositorio, entra a **Settings → Pages**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`.

## Publicar con usuario y clave (Firebase)

Con `js/firebase-config.js` en `null` la app no pide usuario y guarda solo en el navegador. Para activar las cuentas:

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto.
2. **Authentication → Sign-in method:** activa **Correo electrónico/contraseña**.
3. **Authentication → Configuración → Acciones de usuario:** desactiva **Habilitar creación (registro)**, para que solo entren las cuentas que tú crees.
4. **Authentication → Usuarios → Agregar usuario:** crea una cuenta por persona del equipo.
5. **Firestore Database → Crear base de datos** (modo producción).
6. **Configuración del proyecto → Tus apps → Web (</>)**: registra la app y copia el objeto de configuración en `js/firebase-config.js`.
7. Publica la página y las reglas de `firestore.rules`:

```
npx firebase-tools login
npx firebase-tools deploy --project id-del-proyecto
```

La app queda en `https://id-del-proyecto.web.app`. Cada usuario solo puede leer y escribir sus propios proyectos (`usuarios/{uid}/proyectos`). Un proyecto con fotos de textura muy grandes (más de 1 MB) no se sube a la nube: hay que usar **Guardar**.
