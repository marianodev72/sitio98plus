const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const TEXT_FIELDS = Object.freeze([
  "observaciones",
  "novedades",
  "descripcionMejoras",
  "detalleComprobantes",
  "lugarFirma",
  "fechaFirma",
]);

function escapeHTML(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertSafeKeys(value) {
  if (!value || typeof value !== "object") return true;
  if (Array.isArray(value)) {
    value.forEach(assertSafeKeys);
    return true;
  }
  if (!isPlainObject(value)) throw new Error("OBJETO_INVALIDO");
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error("CLAVE_INVALIDA");
    assertSafeKeys(value[key]);
  }
  return true;
}

function trimText(value, max = 4000) {
  return escapeHTML(String(value ?? "").trim().slice(0, max));
}

function sanitizeAnexo15Datos(payload = {}, { requireContent = false } = {}) {
  const source = payload?.datos && isPlainObject(payload.datos) ? payload.datos : payload;
  if (!isPlainObject(source)) return { ok: false, code: "DATOS_INVALIDOS" };

  try {
    assertSafeKeys(source);
  } catch {
    return { ok: false, code: "DATOS_INVALIDOS" };
  }

  const unknown = Object.keys(source).filter((key) => !TEXT_FIELDS.includes(key));
  if (unknown.length) return { ok: false, code: "CAMPOS_INVALIDOS" };

  const value = {
    observaciones: trimText(source.observaciones, 4000),
    novedades: trimText(source.novedades, 4000),
    descripcionMejoras: trimText(source.descripcionMejoras, 4000),
    detalleComprobantes: trimText(source.detalleComprobantes, 4000),
    lugarFirma: trimText(source.lugarFirma, 180),
    fechaFirma: trimText(source.fechaFirma, 40),
  };

  if (
    requireContent &&
    !value.observaciones &&
    !value.novedades &&
    !value.descripcionMejoras &&
    !value.detalleComprobantes
  ) {
    return { ok: false, code: "SOLICITUD_INCOMPLETA" };
  }

  return { ok: true, value };
}

function sanitizeObservacion(payload = {}, max = 1600) {
  const raw = payload?.observacion ?? payload?.datos?.observacion ?? "";
  const observacion = trimText(raw, max);
  if (!observacion) return { ok: false, code: "OBSERVACION_REQUERIDA" };
  return { ok: true, observacion };
}

module.exports = {
  sanitizeAnexo15Datos,
  sanitizeObservacion,
  trimText,
  escapeHTML,
};
