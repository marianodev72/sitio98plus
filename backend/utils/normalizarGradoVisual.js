function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compact(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z]/g, "");
}

const BASE_CODES = new Set([
  "CN",
  "CF",
  "CC",
  "TN",
  "TF",
  "TC",
  "GU",
  "SM",
  "SP",
  "SI",
  "SS",
  "CP",
  "CI",
  "CS",
  "MI",
  "MS",
]);

const BASE_PATTERNS = [
  [/\bCAPITAN\s+DE\s+NAVIO\b|\bCAPITAN\s+NAVIO\b/, "CN"],
  [/\bCAPITAN\s+DE\s+FRAGATA\b|\bCAPITAN\s+FRAGATA\b/, "CF"],
  [/\bCAPITAN\s+DE\s+CORBETA\b|\bCAPITAN\s+CORBETA\b/, "CC"],
  [/\bTENIENTE\s+DE\s+NAVIO\b|\bTENIENTE\s+NAVIO\b/, "TN"],
  [/\bTENIENTE\s+DE\s+FRAGATA\b|\bTENIENTE\s+FRAGATA\b/, "TF"],
  [/\bTENIENTE\s+DE\s+CORBETA\b|\bTENIENTE\s+CORBETA\b/, "TC"],
  [/\bGUARDIAMARINA\b/, "GU"],
  [/\bSUBOFICIAL\s+MAYOR\b/, "SM"],
  [/\bSUBOFICIAL\s+PRIMERO\b/, "SI"],
  [/\bSUBOFICIAL\s+PRINCIPAL\b/, "SP"],
  [/\bSUBOFICIAL\s+SEGUNDO\b/, "SS"],
  [/\bCABO\s+PRINCIPAL\b/, "CP"],
  [/\bCABO\s+PRIMERO\b/, "CI"],
  [/\bCABO\s+SEGUNDO\b/, "CS"],
  [/\bMARINERO\s+SEGUNDO\b/, "MS"],
  [/\bMARINERO\s+PRIMERO\b|\bMARINERO\b/, "MI"],
];

const SPECIALTY_PATTERNS = [
  [/\bCUERPO\s+COMANDO\b|\bCOMANDO\b/, "CD"],
  [/\bMAQUINISTA\b|\bMAQUINAS?\b|\bMAQUIN\w*\b/, "MQ"],
  [/\bMW\b/, "MW"],
  [/\bSH\b/, "SH"],
  [/\bAA\b/, "AA"],
  [/\bMN\b/, "MN"],
  [/\bOP\b/, "OP"],
  [/\bCO\b/, "CO"],
];

function normalizeText(value) {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function detectBaseFromText(text) {
  for (const [pattern, code] of BASE_PATTERNS) {
    if (pattern.test(text)) return code;
  }
  return "";
}

function detectSpecialtyFromText(text) {
  for (const [pattern, code] of SPECIALTY_PATTERNS) {
    if (pattern.test(text)) return code;
  }
  return "";
}

function normalizarGradoVisual(value) {
  const text = normalizeText(value);
  if (!text) return "";

  const code = compact(value);
  for (const base of BASE_CODES) {
    if (code.startsWith(base)) {
      return code.length >= 4 ? code.slice(0, 4) : base;
    }
  }

  const base = detectBaseFromText(text);
  if (!base) return code.length <= 4 ? code : "";

  const specialty = detectSpecialtyFromText(text);
  return specialty ? `${base}${specialty}` : base;
}

module.exports = { normalizarGradoVisual };