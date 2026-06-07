const zlib = require("zlib");

const MAX_ENTRIES = 200;
const XML_PREFIX = "(?:[A-Za-z0-9_]+:)?";

function fail(message) {
  const err = new Error(message);
  err.code = "XLSX_INVALIDO";
  throw err;
}

function readUInt16(buffer, offset) {
  if (offset + 2 > buffer.length) fail("XLSX corrupto");
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  if (offset + 4 > buffer.length) fail("XLSX corrupto");
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  fail("XLSX corrupto: directorio ZIP no encontrado");
}

function parseZipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) fail("Archivo XLSX vacio o corrupto");

  const eocd = findEndOfCentralDirectory(buffer);
  const totalEntries = readUInt16(buffer, eocd + 10);
  const centralDirOffset = readUInt32(buffer, eocd + 16);

  if (totalEntries > MAX_ENTRIES) fail("XLSX excede limite de entradas internas");

  const entries = new Map();
  let offset = centralDirOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) fail("XLSX corrupto: cabecera central invalida");

    const method = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const nameStart = offset + 46;
    const name = buffer.toString("utf8", nameStart, nameStart + fileNameLength);

    if (uncompressedSize > 10 * 1024 * 1024) fail(`Entrada XLSX demasiado grande: ${name}`);
    if (readUInt32(buffer, localHeaderOffset) !== 0x04034b50) {
      fail("XLSX corrupto: cabecera local invalida");
    }

    const localNameLength = readUInt16(buffer, localHeaderOffset + 26);
    const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = zlib.inflateRawSync(compressed);
    else fail(`Metodo ZIP no soportado: ${method}`);

    entries.set(name, data.toString("utf8"));
    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeXml(String(value || "").replace(/<[^>]+>/g, ""));
}

function xmlTagRegex(tag, flags = "") {
  return new RegExp(`<${XML_PREFIX}${tag}\\b[\\s\\S]*?<\\/${XML_PREFIX}${tag}>`, flags);
}

function xmlSelfClosingTagRegex(tag) {
  return new RegExp(`<${XML_PREFIX}${tag}\\b[^>]*\\/>`);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const siRegex = xmlTagRegex("si", "g");
  const items = xml.match(siRegex) || [];

  for (const item of items) {
    const parts = [];
    const tRegex = new RegExp(`<${XML_PREFIX}t\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}t>`, "g");
    let match;
    while ((match = tRegex.exec(item))) parts.push(decodeXml(match[1]));
    out.push(parts.join(""));
  }

  return out;
}

function columnFromRef(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i)?.[0] || "";
  let number = 0;
  for (const ch of letters.toUpperCase()) number = number * 26 + (ch.charCodeAt(0) - 64);
  return number - 1;
}

function cellValue(cellXml, sharedStrings) {
  if (xmlTagRegex("f").test(cellXml) || xmlSelfClosingTagRegex("f").test(cellXml)) {
    return { formula: true, value: "" };
  }

  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] || "";

  if (type === "inlineStr") {
    const inline = cellXml.match(xmlTagRegex("is"))?.[0] || "";
    return { formula: false, value: stripTags(inline) };
  }

  const raw = cellXml.match(new RegExp(`<${XML_PREFIX}v>([\\s\\S]*?)<\\/${XML_PREFIX}v>`))?.[1] || "";
  if (type === "s") return { formula: false, value: sharedStrings[Number(raw)] || "" };
  if (type === "str") return { formula: false, value: decodeXml(raw) };
  if (type === "b") return { formula: false, value: raw === "1" ? "TRUE" : "FALSE" };
  return { formula: false, value: decodeXml(raw) };
}

function parseSheetRows(xml, sharedStrings) {
  if (!xml) fail("XLSX sin hoja de calculo");
  const rows = [];
  const rowRegex = xmlTagRegex("row", "g");
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xml))) {
    const cells = [];
    let hasFormula = false;
    const cellRegex = new RegExp(
      `<${XML_PREFIX}c\\b([^>]*)>[\\s\\S]*?<\\/${XML_PREFIX}c>|<${XML_PREFIX}c\\b([^>]*)\\/>`,
      "g"
    );
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[0]))) {
      const attrs = cellMatch[1] || cellMatch[2] || "";
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] || "";
      const index = columnFromRef(ref);
      const parsed = cellValue(cellMatch[0], sharedStrings);
      if (parsed.formula) hasFormula = true;
      if (index >= 0) cells[index] = parsed.value;
    }

    if (cells.some((value) => String(value || "").trim())) {
      rows.push({ cells: cells.map((value) => String(value || "").trim()), hasFormula });
    }
  }

  return rows;
}

function parseXlsxBuffer(buffer) {
  const entries = parseZipEntries(buffer);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml"));
  const sheetName = Array.from(entries.keys()).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (!sheetName) fail("XLSX sin worksheets");
  return parseSheetRows(entries.get(sheetName), sharedStrings);
}

module.exports = {
  parseXlsxBuffer,
};
