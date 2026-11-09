"use strict";
/* ============================================================
   ARCHIVO EXCEL (.xlsx)
   Un .xlsx es un ZIP de archivos XML. Se escribe aquí, sin
   librerías, para que la app siga funcionando sin internet.
   ============================================================ */
const _tablaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (const b of bytes) c = _tablaCrc[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ZIP sin compresión. archivos: [{ nombre, texto }] */
function crearZip(archivos) {
  const cod = new TextEncoder(), partes = [], central = [];
  let pos = 0;
  const cabecera = (firma, extra) => {
    const d = new DataView(new ArrayBuffer(extra.reduce((s, [t]) => s + t, 4)));
    d.setUint32(0, firma, true);
    let i = 4;
    extra.forEach(([t, v]) => { if (t === 2) d.setUint16(i, v, true); else d.setUint32(i, v, true); i += t; });
    return new Uint8Array(d.buffer);
  };
  const FECHA = 33; // 1980-01-01, fecha fija del formato cuando no importa
  archivos.forEach(({ nombre, texto }) => {
    const nom = cod.encode(nombre), datos = cod.encode(texto), crc = crc32(datos);
    const comun = [[2, 20], [2, 0], [2, 0], [2, 0], [2, FECHA], [4, crc], [4, datos.length], [4, datos.length], [2, nom.length], [2, 0]];
    const local = cabecera(0x04034b50, comun);
    partes.push(local, nom, datos);
    central.push(cabecera(0x02014b50, [[2, 20], ...comun, [2, 0], [2, 0], [2, 0], [4, 0], [4, pos]]), nom);
    pos += local.length + nom.length + datos.length;
  });
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fin = cabecera(0x06054b50, [[2, 0], [2, 0], [2, archivos.length], [2, archivos.length], [4, tamCentral], [4, pos], [2, 0]]);
  return new Blob([...partes, ...central, fin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const _xml = v => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function hojaXml(filas) {
  const letra = i => String.fromCharCode(65 + i);
  const anchos = (filas[0] || []).map((_, c) => Math.min(60, Math.max(...filas.map(f => String(f[c] == null ? '' : f[c]).length)) + 2));
  const celdas = filas.map((f, r) => `<row r="${r + 1}">${f.map((v, c) => {
    const ref = `${letra(c)}${r + 1}`, est = r === 0 ? ' s="1"' : '';
    return typeof v === 'number' && isFinite(v)
      ? `<c r="${ref}"${est}><v>${v}</v></c>`
      : `<c r="${ref}"${est} t="inlineStr"><is><t xml:space="preserve">${_xml(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${celdas}</sheetData></worksheet>`;
}

/* hojas: [{ nombre, filas }], con la primera fila como encabezado */
function crearXlsx(hojas) {
  const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return crearZip([
    { nombre: '[Content_Types].xml', texto: `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { nombre: '_rels/.rels', texto: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nombre: 'xl/workbook.xml', texto: `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><bookViews><workbookView/></bookViews><sheets>${hojas.map((h, i) => `<sheet name="${_xml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', texto: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${NS}/styles" Target="styles.xml"/></Relationships>` },
    { nombre: 'xl/styles.xml', texto: `${cab}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9EBEF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>` },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, texto: hojaXml(h.filas) }))
  ]);
}
