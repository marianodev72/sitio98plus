function cleanText(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}

const CONECTORES_INTERMEDIOS = new Set(["de", "del", "la", "las", "los", "y"]);

function capitalizarToken(token) {
  const lower = String(token || "").toLocaleLowerCase("es-AR");
  if (!lower) return "";
  return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
}

function capitalizarCompuesto(word) {
  return String(word || "")
    .split("-")
    .map((part) => capitalizarToken(part))
    .join("-");
}

function normalizarNombrePropio(value) {
  const text = cleanText(value);
  if (!text) return "";

  const words = text.split(" ");
  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("es-AR");
      const esIntermedio = index > 0 && index < words.length - 1;
      if (esIntermedio && CONECTORES_INTERMEDIOS.has(lower)) return lower;
      return capitalizarCompuesto(word);
    })
    .join(" ");
}

function normalizarNombreCompletoVisual(...parts) {
  return parts
    .flat()
    .map((part) => normalizarNombrePropio(part))
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  normalizarNombrePropio,
  normalizarNombreCompletoVisual,
};
