const crypto = require("crypto");
const { parse } = require("csv-parse/sync");

const {
  CLASES_ALOJAMIENTO,
  CAPACIDAD_POR_CLASE,
  GENERO_PERMITIDO,
  CSV_HEADERS,
} = require("../constants/alojamientoConstants");

function cleanCell(value) {
  return String(value ?? "").trim();
}

function up(value) {
  return cleanCell(value).toUpperCase();
}

function parseActivo(value) {
  const normalized = up(value);
  if (normalized === "SI") return true;
  if (normalized === "NO") return false;
  return null;
}

function hashRow(row) {
  const canonical = CSV_HEADERS.map((h) => `${h}=${row[h] ?? ""}`).join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function validateHeaders(headers) {
  const normalized = headers.map(cleanCell);
  const missing = CSV_HEADERS.filter((h) => !normalized.includes(h));
  const unexpected = normalized.filter((h) => h && !CSV_HEADERS.includes(h));

  if (missing.length || unexpected.length) {
    return {
      ok: false,
      error: `Cabeceras CSV invalidas. Faltan: ${missing.join(", ") || "-"}; inesperadas: ${
        unexpected.join(", ") || "-"
      }`,
    };
  }

  return { ok: true };
}

function normalizeCodigo(value) {
  return up(value).replace(/\s+/g, "");
}

function normalizeRow(raw, lineNumber) {
  const codigo = normalizeCodigo(raw.codigo);
  const dependencia = cleanCell(raw.dependencia);
  const lugar = cleanCell(raw.lugar);
  const sector = cleanCell(raw.sector);
  const tipo = cleanCell(raw.tipo);
  const numero = cleanCell(raw.numero);
  const clase = up(raw.clase);
  const generoPermitido = up(raw.generoPermitido);
  const localidad = cleanCell(raw.localidad);
  const provincia = cleanCell(raw.provincia);
  const observaciones = cleanCell(raw.observaciones);
  const activo = parseActivo(raw.activo);
  const capacidad = Number(cleanCell(raw.capacidad));

  return {
    lineNumber,
    codigo,
    dependencia,
    lugar,
    sector,
    tipo,
    numero,
    clase,
    capacidad,
    generoPermitido,
    localidad,
    provincia,
    observaciones,
    activo,
  };
}

function validateNormalizedRow(row, seenCodes) {
  const errors = [];

  for (const field of ["codigo", "dependencia", "lugar", "tipo", "numero"]) {
    if (!row[field]) errors.push(`${field} es obligatorio`);
  }

  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(row.codigo)) {
    errors.push("codigo tiene formato invalido");
  }

  if (!CLASES_ALOJAMIENTO.includes(row.clase)) {
    errors.push("clase invalida");
  }

  if (!Number.isInteger(row.capacidad) || row.capacidad < 1) {
    errors.push("capacidad debe ser un entero mayor a 0");
  } else if (row.clase !== "CUSO" && CAPACIDAD_POR_CLASE[row.clase] !== row.capacidad) {
    errors.push(`capacidad no coincide con clase ${row.clase}`);
  }

  if (!GENERO_PERMITIDO.includes(row.generoPermitido)) {
    errors.push("generoPermitido invalido");
  }

  if (row.activo === null) {
    errors.push("activo debe ser SI o NO");
  }

  if (seenCodes.has(row.codigo)) {
    errors.push("codigo duplicado en CSV");
  }

  seenCodes.add(row.codigo);

  return errors;
}

function parseAndValidateAlojamientosCsv(csvContent) {
  const raw = String(csvContent || "").replace(/^\uFEFF/, "");
  if (!raw.trim()) {
    return { rows: [], errors: [{ lineNumber: 0, errors: ["CSV vacio"] }] };
  }

  let records;
  try {
    records = parse(raw, {
      columns: (headers) => {
        const result = validateHeaders(headers);
        if (!result.ok) throw new Error(result.error);
        return headers.map(cleanCell);
      },
      skip_empty_lines: true,
      trim: false,
      relax_column_count: false,
    });
  } catch (err) {
    return {
      rows: [],
      errors: [{ lineNumber: 0, errors: [err.message || "CSV invalido"] }],
    };
  }

  const seenCodes = new Set();
  const rows = [];
  const errors = [];

  records.forEach((record, index) => {
    const lineNumber = index + 2;
    const row = normalizeRow(record, lineNumber);
    const rowErrors = validateNormalizedRow(row, seenCodes);

    if (rowErrors.length) {
      errors.push({ lineNumber, codigo: row.codigo, errors: rowErrors });
      return;
    }

    rows.push({ ...row, hashFila: hashRow(row) });
  });

  return { rows, errors };
}

module.exports = {
  parseAndValidateAlojamientosCsv,
};
