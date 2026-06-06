const TIPOS_PERSONAL = Object.freeze(["OF", "SO"]);
const TIPOS_DESTINO = Object.freeze(["OF", "SO", "MIXTO"]);
const GRUPOS_JERARQUICOS = Object.freeze(["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"]);

function normalizeTipoPersonal(value) {
  const normalized = String(value || "").toUpperCase().trim();
  return TIPOS_PERSONAL.includes(normalized) ? normalized : null;
}

function normalizeTipoDestino(value) {
  const normalized = String(value || "").toUpperCase().trim();
  return TIPOS_DESTINO.includes(normalized) ? normalized : "MIXTO";
}

function normalizeTipoDestinoStrict(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).toUpperCase().trim();
  return TIPOS_DESTINO.includes(normalized) ? normalized : null;
}

function normalizeGrupoJerarquico(value) {
  const normalized = String(value || "").toUpperCase().trim().replace(/[\s/-]+/g, "_");
  return GRUPOS_JERARQUICOS.includes(normalized) ? normalized : "NO_DEFINIDO";
}

function normalizePrecedencia(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

module.exports = {
  TIPOS_PERSONAL,
  TIPOS_DESTINO,
  GRUPOS_JERARQUICOS,
  normalizeTipoPersonal,
  normalizeTipoDestino,
  normalizeTipoDestinoStrict,
  normalizeGrupoJerarquico,
  normalizePrecedencia,
};
