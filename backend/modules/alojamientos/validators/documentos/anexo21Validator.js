const { hasPollutionKeys } = require("./alojamientoDocumentoValidator");

const MAX_DEPTH = 6;
const MAX_KEYS = 80;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2000;

function escapeHTML(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeValue(value, depth = 0) {
  if (depth > MAX_DEPTH) return null;

  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim().slice(0, MAX_STRING_LENGTH);
    return escapeHTML(trimmed);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    if (hasPollutionKeys(value)) return null;

    const out = {};
    const keys = Object.keys(value).slice(0, MAX_KEYS);

    for (const key of keys) {
      const cleanKey = String(key || "").trim();
      if (!cleanKey || cleanKey.length > 80) continue;
      const cleanValue = sanitizeValue(value[key], depth + 1);
      if (cleanValue !== undefined) out[cleanKey] = cleanValue;
    }

    return out;
  }

  return null;
}

function parseDatos(input) {
  if (input === undefined || input === null || input === "") return {};

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  return input && typeof input === "object" ? input : null;
}

function validateAnexo21Datos(input) {
  const datos = parseDatos(input);
  const errors = [];

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    errors.push("datos invalidos");
    return { ok: false, errors, value: {} };
  }

  if (hasPollutionKeys(datos)) {
    errors.push("datos contienen claves no permitidas");
    return { ok: false, errors, value: {} };
  }

  const value = sanitizeValue(datos);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("datos invalidos");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? value : {},
  };
}

module.exports = {
  validateAnexo21Datos,
};
