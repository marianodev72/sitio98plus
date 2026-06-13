const TIPOS_PERSONAL = Object.freeze(["OF", "SO"]);
const TIPOS_DESTINO = Object.freeze(["OF", "SO", "MIXTO"]);
const GRUPOS_JERARQUICOS = Object.freeze(["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"]);
const GRADOS_VIVIENDA_OF = Object.freeze(["CN", "CF", "CC", "TN", "TF", "TC", "GU"]);
const GRADOS_VIVIENDA_SO = Object.freeze(["SM", "SP", "SI", "SS", "CP", "CI", "CS", "AG"]);
const GRADOS_TEXTO_VIVIENDA_OF = Object.freeze([
  "CONTRALMIRANTE",
  "CAPITAN DE NAVIO",
  "CAPITAN DE FRAGATA",
  "CAPITAN DE CORBETA",
  "TENIENTE DE NAVIO",
  "TENIENTE DE FRAGATA",
  "TENIENTE DE CORBETA",
  "GUARDIAMARINA",
  "OFICIAL",
  "OF",
]);
const GRADOS_TEXTO_VIVIENDA_SO = Object.freeze([
  "SUBOFICIAL MAYOR",
  "SUBOFICIAL PRINCIPAL",
  "SUBOFICIAL PRIMERO",
  "SUBOFICIAL SEGUNDO",
  "CABO PRINCIPAL",
  "CABO PRIMERO",
  "CABO SEGUNDO",
  "MARINERO PRIMERO",
  "MARINERO",
  "AGENTE",
  "SO",
]);

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

function normalizeInstitucionalText(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[\s.-]+/, "")
    .replace(/[.]+/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function startsWithKnownGrade(value, patterns) {
  return patterns.some((pattern) => value === pattern || value.startsWith(`${pattern} `));
}

function deriveGrupoViviendaFromGradoEscalafon(value) {
  if (value === undefined || value === null) return null;
  const normalized = normalizeInstitucionalText(value);

  if (!normalized) return null;
  if (normalized.startsWith("MITV") || normalized.startsWith("MSTV")) return "SO";
  if (normalized.startsWith("CIVIL")) return null;
  if (startsWithKnownGrade(normalized, GRADOS_TEXTO_VIVIENDA_OF)) return "OF";
  if (startsWithKnownGrade(normalized, GRADOS_TEXTO_VIVIENDA_SO)) return "SO";

  const code = normalized.slice(0, 2);
  if (GRADOS_VIVIENDA_OF.includes(code)) return "OF";
  if (GRADOS_VIVIENDA_SO.includes(code)) return "SO";
  return null;
}

function deriveGrupoViviendaFromGrupoJerarquico(value) {
  const grupo = normalizeGrupoJerarquico(value);
  if (grupo === "OF") return "OF";
  if (grupo === "SB_CP" || grupo === "CB" || grupo === "TR") return "SO";
  return null;
}

function deriveGrupoViviendaFromUserLike(user) {
  return deriveGrupoViviendaFromGrupoJerarquico(user?.grupoJerarquico) || normalizeTipoPersonal(user?.tipoPersonal);
}

function isTipoDestinoCompatibleConGrupoVivienda(grupoPersona, tipoDestino) {
  const grupo = normalizeTipoPersonal(grupoPersona);
  const destino = normalizeTipoDestinoStrict(tipoDestino);

  if (!grupo || !destino) return false;
  if (destino === "MIXTO") return true;
  return grupo === destino;
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
  deriveGrupoViviendaFromGrupoJerarquico,
  deriveGrupoViviendaFromUserLike,
  isTipoDestinoCompatibleConGrupoVivienda,
};
