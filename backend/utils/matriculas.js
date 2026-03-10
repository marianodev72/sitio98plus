// backend/utils/matriculas.js
// Validación institucional de matrículas autorizadas (CSV)

const fs = require("fs");
const path = require("path");

// Default del proyecto
const DEFAULT_PATH = path.join(__dirname, "..", "data", "matriculas.csv");

// Permite override por env
const MATRICULAS_PATH = process.env.MATRICULAS_CSV_PATH
  ? String(process.env.MATRICULAS_CSV_PATH)
  : DEFAULT_PATH;

/**
 * Cache en memoria:
 * key: matricula (string)
 * value: { matricula, nombreApellido, dni, grado }
 */
let cache = null;

function safeTrim(v) {
  return String(v || "").trim();
}

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function readFileBestEffort(p) {
  // Intento UTF-8
  try {
    const s = fs.readFileSync(p, "utf8");
    return s;
  } catch (_) {}

  // Fallback Latin-1 (muy común en CSV de Windows)
  try {
    return fs.readFileSync(p, "latin1");
  } catch (_) {}

  return "";
}

function loadCsvIfNeeded() {
  if (cache) return;

  cache = new Map();

  if (!fs.existsSync(MATRICULAS_PATH)) {
    console.warn(
      `⚠️ Archivo de matrículas no encontrado en: ${MATRICULAS_PATH}. Ninguna matrícula será considerada autorizada.`
    );
    return;
  }

  const contenido = readFileBestEffort(MATRICULAS_PATH);
  const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (!lineas.length) return;

  // Heurística: si la primera línea tiene letras y no es sólo números => cabecera
  const primera = lineas[0];
  const tieneCabecera =
    /[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/.test(primera) && !/^\d+$/.test(primera);

  const data = tieneCabecera ? lineas.slice(1) : lineas;

  for (const linea of data) {
    // Tu modelo institucional usa ';'
    const parts = linea.split(";").map(safeTrim);

    const matricula = safeTrim(parts[0]);
    if (!matricula) continue;

    const nombreApellido = safeTrim(parts[1]);
    const dni = safeTrim(parts[2]);
    const grado = safeTrim(parts[3]);

    cache.set(matricula, {
      matricula,
      nombreApellido,
      dni,
      grado,
      _norm: {
        nombreApellido: up(nombreApellido).replace(/\s+/g, " ").trim(),
        dni: safeTrim(dni),
        grado: up(grado),
      },
    });
  }

  console.log(`✅ Matrículas cargadas: ${cache.size}`);
}

function findMatriculaRecord(matricula) {
  loadCsvIfNeeded();
  if (!matricula) return null;

  const key = safeTrim(matricula);
  if (!key) return null;

  const rec = cache.get(key);
  if (!rec) return null;

  return {
    matricula: rec.matricula,
    nombreApellido: rec.nombreApellido,
    dni: rec.dni,
    grado: rec.grado,
  };
}

function isMatriculaAutorizada(matricula) {
  return !!findMatriculaRecord(matricula);
}

module.exports = {
  isMatriculaAutorizada,
  findMatriculaRecord,
};
