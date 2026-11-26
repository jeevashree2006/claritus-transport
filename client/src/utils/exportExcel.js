/**
 * Shared Excel export: builds a real .xlsx file in the browser and downloads it.
 * No library - an .xlsx is a zip of a few XML files, written here uncompressed.
 *
 *   downloadExcel('transporters-2026-11-26.xlsx', [
 *     { header: 'Code', value: (t) => t.code },
 *     { header: 'Balance (INR)', value: (t) => t.balance, type: 'money' },
 *   ], rows, { sheetName: 'Transporters' });
 *
 * Column types:
 *   'text' (default) - written as text, never as a formula
 *   'number'         - a real number, so Excel can sum it
 *   'money'          - a number shown as ₹1,23,456.00
 *   'date'           - 'YYYY-MM-DD' or a Date, shown as 28-Nov-2026
 *   'datetime'       - ISO timestamp or a Date, shown in local time as 28-Nov-2026 14:30
 * A cell with no value (null, undefined, '') is left empty.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Style ids in styles.xml (cellXfs order).
const STYLE = { text: 0, header: 1, number: 2, money: 3, date: 4, datetime: 5 };

/* ---------------------------------------------------------------- values */

/** Characters XML 1.0 does not allow (control codes) would corrupt the file. */
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function xmlEscape(value) {
  return String(value)
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Date -> Excel serial number in local time (days since 30 Dec 1899). */
function toSerial(date) {
  const utc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
}

function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value);
  // A bare date is a calendar day, not midnight UTC.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asText(value) {
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Column letter(s) for a 0-based index: 0 -> A, 26 -> AA. */
function columnName(index) {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/** One <c> element, plus the text width used to size the column. */
function cell(ref, value, type) {
  if (value === null || value === undefined || value === '') return { xml: '', width: 0 };

  if (type === 'number' || type === 'money') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) {
      const width = (type === 'money' ? n.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : String(n)).length + 2;
      return { xml: `<c r="${ref}" s="${STYLE[type]}"><v>${n}</v></c>`, width };
    }
  }

  if (type === 'date' || type === 'datetime') {
    const d = parseDate(value);
    if (d) {
      const serial = type === 'date' ? Math.floor(toSerial(d)) : toSerial(d);
      return { xml: `<c r="${ref}" s="${STYLE[type]}"><v>${serial}</v></c>`, width: type === 'date' ? 12 : 18 };
    }
  }

  // Inline strings are always text: a value like "=SUM(A1)" is never run as a formula.
  const text = asText(value);
  return {
    xml: `<c r="${ref}" s="${STYLE.text}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`,
    width: Math.max(...text.split('\n').map((line) => line.length)),
  };
}

/* ----------------------------------------------------------------- sheets */

function sheetXml(columns, rows) {
  const widths = columns.map((c) => c.header.length + 2);
  const lines = [];

  const headerCells = columns.map((c, i) => {
    const ref = `${columnName(i)}1`;
    return `<c r="${ref}" s="${STYLE.header}" t="inlineStr"><is><t>${xmlEscape(c.header)}</t></is></c>`;
  });
  lines.push(`<row r="1">${headerCells.join('')}</row>`);

  rows.forEach((row, r) => {
    const rowNo = r + 2;
    const cells = columns.map((c, i) => {
      const out = cell(`${columnName(i)}${rowNo}`, c.value(row), c.type);
      widths[i] = Math.max(widths[i], out.width);
      return out.xml;
    });
    lines.push(`<row r="${rowNo}">${cells.join('')}</row>`);
  });

  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(w + 1, 8), 60)}" customWidth="1"/>`)
    .join('');
  const lastRef = `${columnName(columns.length - 1)}${rows.length + 1}`;

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Header row stays visible while scrolling.
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${lines.join('')}</sheetData>` +
    `<autoFilter ref="A1:${lastRef}"/>` +
    '</worksheet>'
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="3">' +
  '<numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0.00"/>' +
  '<numFmt numFmtId="165" formatCode="dd\\-mmm\\-yyyy"/>' +
  '<numFmt numFmtId="166" formatCode="dd\\-mmm\\-yyyy hh:mm"/>' +
  '</numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // text
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // header
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // number (General)
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // money
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // date
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // datetime
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

function workbookFiles(sheetName, sheet, filterRange) {
  // Excel sheet names: max 31 characters, none of : \ / ? * [ ]
  const name = xmlEscape(String(sheetName || 'Sheet1').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31));
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
      // Needed by the autoFilter on the sheet.
      `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replace(/'/g, "''")}'!${filterRange}</definedName></definedNames>` +
      '</workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
    'xl/styles.xml': STYLES_XML,
    'xl/worksheets/sheet1.xml': sheet,
  };
}

/* -------------------------------------------------------------------- zip */

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Zip archive with every file stored (no compression) - valid for .xlsx. */
function zip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const parts = [];
  const central = [];
  let offset = 0;

  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local, name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true); // central directory header
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true); // where the local header starts
    central.push(entry, name);

    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((sum, p) => sum + p.byteLength, 0);
  const count = Object.keys(files).length;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory
  end.setUint16(8, count, true);
  end.setUint16(10, count, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end], { type: XLSX_MIME });
}

/* -------------------------------------------------------------- public API */

/** Builds the .xlsx as a Blob (handy for tests). */
export function buildExcel(columns, rows, { sheetName } = {}) {
  const list = rows || [];
  const filterRange = `$A$1:$${columnName(columns.length - 1)}$${list.length + 1}`;
  return zip(workbookFiles(sheetName, sheetXml(columns, list), filterRange));
}

/** Builds the .xlsx and starts the browser download. */
export function downloadExcel(filename, columns, rows, options = {}) {
  const name = /\.xlsx$/i.test(filename) ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(buildExcel(columns, rows, options));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Today as 'YYYY-MM-DD' in local time, for file names. */
export function fileDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
