const TIPOS_PERSONAL = Object.freeze(["OF", "SO"]);
const TIPOS_DESTINO = Object.freeze(["OF", "SO", "MIXTO"]);
const GRUPOS_JERARQUICOS = Object.freeze(["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"]);
const GRADOS_VIVIENDA_OF = Object.freeze(["CN", "CF", "CC", "TN", "TF", "TC", "GU"]);
const GRADOS_VIVIENDA_SO = Object.freeze(["SM", "SP", "SI", "SS", "CP", "CI", "CS", "AG"]);

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

function deriveGrupoViviendaFromGradoEscalafon(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[\s.-]+/, "");

  if (!normalized) return null;
  if (normalized.startsWith("MITV") || normalized.startsWith("MSTV")) return "SO";
  if (normalized.startsWith("CIVIL")) return null;

  const code = normalized.slice(0, 2);
  if (GRADOS_VIVIENDA_OF.includes(code)) return "OF";
  if (GRADOS_VIVIENDA_SO.includes(code)) return "SO";
  return null;
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
  deriveGrupoViviendaFromGradoEscalafon,
};
