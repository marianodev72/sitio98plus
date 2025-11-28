// utils/matriculas.js
// Carga y validación de matrículas desde DATA/matriculas.csv

const fs = require("fs");
const path = require("path");

// mapa: matricula => { dni, nombre }
const matriculasIndex = new Map();

/**
 * Cargar archivo CSV de matrículas.
 * Formato esperado:
 *   DNI;MATRICULAS;NOMBRE Y APELLIDO
 *   16948799;111353;ALLIEVI CARLOS MARIA
 */
function cargarMatriculas() {
  try {
    const filePath = path.join(__dirname, "..", "DATA", "matriculas.csv");

    if (!fs.existsSync(filePath)) {
      console.warn("⚠️  No se encontró DATA/matriculas.csv");
      return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const lineas = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lineas.length < 2) {
      console.warn("⚠️  DATA/matriculas.csv no tiene datos suficientes");
      return;
    }

    // Primera línea: cabeceras
    const header = lineas[0].split(";").map((h) => h.trim().toUpperCase());
    const idxDni = header.indexOf("DNI");
    const idxMat = header.indexOf("MATRICULAS");
    const idxNombre = header.indexOf("NOMBRE Y APELLIDO");

    if (idxDni === -1 || idxMat === -1 || idxNombre === -1) {
      console.warn(
        "⚠️  Cabeceras inesperadas en matriculas.csv. Esperado: DNI;MATRICULAS;NOMBRE Y APELLIDO"
      );
      return;
    }

    // Limpiamos el índice por si recargamos
    matriculasIndex.clear();

    for (let i = 1; i < lineas.length; i++) {
      const cols = lineas[i].split(";");
      if (cols.length < header.length) continue;

      const dni = (cols[idxDni] || "").trim();
      const mat = (cols[idxMat] || "").trim();
      const nombre = (cols[idxNombre] || "").trim();

      if (!mat) continue;

      matriculasIndex.set(mat, {
        dni,
        nombre,
      });
    }

    console.log(
      `📥 Matriculas cargadas: ${matriculasIndex.size} registros desde DATA/matriculas.csv`
    );
  } catch (err) {
    console.error("❌ Error cargando matriculas.csv:", err);
  }
}

/**
 * Verifica si una matrícula es válida.
 * Opcionalmente también compara el DNI.
 *
 * @param {Object} params
 * @param {string|number} params.matricula
 * @param {string|number} [params.dni]
 * @returns {boolean}
 */
function matriculaValida({ matricula, dni }) {
  if (!matricula) return false;

  const clave = String(matricula).trim();
  const registro = matriculasIndex.get(clave);
  if (!registro) {
    return false;
  }

  if (dni) {
    const dniIngresado = String(dni).trim();
    const dniArchivo = String(registro.dni || "").trim();
    if (dniArchivo && dniArchivo !== dniIngresado) {
      return false;
    }
  }

  return true;
}

/**
 * Versión simplificada: solo chequea si la matrícula existe en el CSV.
 * Se usa en algunos flujos antiguos (/users/register-init).
 */
function isMatriculaPermitida(matricula) {
  return matriculaValida({ matricula });
}

// Cargamos automáticamente al importar este módulo
cargarMatriculas();

module.exports = {
  cargarMatriculas,
  matriculaValida,
  isMatriculaPermitida,
};
