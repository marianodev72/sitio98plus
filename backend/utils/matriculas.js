// utils/matriculas.js
// Utilidad para validar matrículas autorizadas en el sistema ZN98

const fs = require('fs');
const path = require('path');

const MATRICULAS_PATH = path.join(__dirname, '..', 'data', 'matriculas.csv');

// Usamos un Set en memoria para búsqueda rápida
let matriculasAutorizadas = null;

function cargarMatriculas() {
  if (matriculasAutorizadas) return; // ya cargadas

  matriculasAutorizadas = new Set();

  if (!fs.existsSync(MATRICULAS_PATH)) {
    console.warn(
      `⚠️ Archivo de matrículas no encontrado en: ${MATRICULAS_PATH}. ` +
        'Ninguna matrícula será considerada autorizada.'
    );
    return;
  }

  const contenido = fs.readFileSync(MATRICULAS_PATH, 'utf8');
  const lineas = contenido.split(/\r?\n/).filter((l) => l.trim() !== '');

  if (!lineas.length) return;

  // Detectamos si la primera línea es cabecera (contiene letras)
  const primera = lineas[0];
  const resto =
    /[a-zA-Z]/.test(primera) && !/^\d+$/.test(primera)
      ? lineas.slice(1)
      : lineas;

  for (const linea of resto) {
    // Si es CSV con comas, tomamos el primer campo
    const [mat] = linea.split(',');
    const valor = (mat || '').trim();
    if (valor) {
      matriculasAutorizadas.add(valor);
    }
  }

  console.log(
    `✅ Matrículas autorizadas cargadas: ${matriculasAutorizadas.size}`
  );
}

function isMatriculaAutorizada(matricula) {
  if (!matriculasAutorizadas) {
    cargarMatriculas();
  }
  if (!matricula) return false;
  return matriculasAutorizadas.has(matricula.trim());
}

module.exports = {
  isMatriculaAutorizada,
};
