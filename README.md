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
```

Los scripts se cargan en el orden indicado en `index.html`, y `app.js` debe ir siempre al final porque es el que arranca la aplicación.

## Publicar en GitHub Pages

En el repositorio, entra a **Settings → Pages**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`.
