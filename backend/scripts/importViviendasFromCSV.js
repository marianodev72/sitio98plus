/**
 * Importador de viviendas ZN98 – versión con códigos cortos por barrio
 *
 * CSV esperado (latin1, separado por ';'):
 * BARRIOS;DPTO/CASA;DORM.
 * BARRIO "ALMIRANTE STORNI";101;3
 * BARRIO "CTE. PIEDRABUENA";501;2
 * ...
 *
 * Lógica:
 *  - barrioNombre: texto limpio de la columna BARRIOS (sin "BARRIO ")
 *  - barrioCodigo: AS, AB, PB, LM, IN (según el nombre)
 *  - numero: valor de DPTO/CASA (ej: 501)
 *  - codigo: `${barrioCodigo}-${numero}` → ej: "AS-501"
 *  - dormitorios: número entero tomado de DORM.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// OJO: ruta al modelo tal como está en tu proyecto (vivienda.js en minúsculas)
const Vivienda = require('../models/vivienda');

// Ruta al CSV
const CSV_PATH = path.join(__dirname, '../data/viviendas.csv');

function limpiar(str) {
  if (!str) return '';
  return String(str).trim();
}

// Devuelve el código corto según el nombre del barrio
function getBarrioCodigo(barrioNombre) {
  if (!barrioNombre) return 'OT';

  const upper = barrioNombre.toUpperCase();

  if (upper.includes('STORNI')) return 'AS';        // ALTE STORNI
  if (upper.includes('BROWN')) return 'AB';         // ALTE BROWN
  if (upper.includes('PIEDRABUENA')) return 'PB';   // PIEDRABUENA
  if (upper.includes('MISION')) return 'LM';        // LA MISION
  if (upper.includes('INDIVIDUALES')) return 'IN';  // INDIVIDUALES

  return 'OT'; // Otros
}

async function main() {
  console.log('──────────────────────────────────────');
  console.log(' Importando viviendas desde CSV (ZN98)');
  console.log('──────────────────────────────────────');

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    'mongodb://127.0.0.1:27017/zn98';

  console.log('MONGO_URI =', mongoUri);

  await mongoose.connect(mongoUri);
  console.log('✔ Conectado a MongoDB');
  console.log('Base de datos actual:', mongoose.connection.name);

  // Leemos CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error('❌ No existe el archivo:', CSV_PATH);
    process.exit(1);
  }

  const contenido = fs.readFileSync(CSV_PATH, 'latin1');
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log('✔ Líneas encontradas (incluyendo cabecera):', lineas.length);
  if (lineas.length <= 1) {
    console.error('❌ El CSV no tiene datos (solo cabecera o está vacío).');
    await mongoose.disconnect();
    process.exit(1);
  }

  const header = lineas[0];
  console.log('🔎 Cabecera detectada:', header);

  const antes = await Vivienda.countDocuments();
  console.log('📊 Viviendas ANTES:', antes);

  let procesadas = 0;
  let importadas = 0;
  let ignoradas = 0;

  // Recorremos filas de datos
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;

    const partes = linea.split(';');
    if (partes.length < 3) {
      console.warn(
        `⚠ Fila ${i + 1} ignorada: columnas insuficientes ->`,
        linea
      );
      ignoradas++;
      continue;
    }

    const barrioRaw = limpiar(partes[0]);
    const numeroRaw = limpiar(partes[1]);
    const dormRaw = limpiar(partes[2]);

    if (!barrioRaw || !numeroRaw) {
      console.warn(
        `⚠ Fila ${i + 1} ignorada (barrio o número vacío) ->`,
        linea
      );
      ignoradas++;
      continue;
    }

    // Limpio "BARRIO " del inicio si viene así
    const barrioNombre = barrioRaw.replace(/^BARRIO\s*/i, '').trim();
    const barrioCodigo = getBarrioCodigo(barrioNombre);
    const numero = numeroRaw;

    const dormitoriosNum = (() => {
      const n = parseInt(dormRaw, 10);
      return Number.isNaN(n) ? 0 : n;
    })();

    // Código único por combinación barrio + número
    const codigo = `${barrioCodigo}-${numero}`;

    try {
      await Vivienda.findOneAndUpdate(
        { codigo }, // criterio único
        {
          codigo,
          barrio: barrioNombre,
          numero,
          dormitorios: dormitoriosNum,
          barrioCodigo,
        },
        { upsert: true, new: true }
      );
      procesadas++;
      importadas++;
    } catch (err) {
      if (err.code === 11000) {
        console.warn(
          `⚠ Clave duplicada para código ${codigo} (fila ${i + 1}), se mantiene la existente.`
        );
      } else {
        console.error(
          `❌ Error guardando vivienda en fila ${i + 1} (codigo ${codigo}):`,
          err.message
        );
      }
      ignoradas++;
      continue;
    }
  }

  const despues = await Vivienda.countDocuments();

  console.log('──────────────────────────────────────');
  console.log('✔ Filas procesadas (datos):', procesadas);
  console.log('✔ Viviendas importadas/actualizadas (upsert):', importadas);
  console.log('⚠ Filas ignoradas (errores/barrio o número vacío):', ignoradas);
  console.log('📊 Viviendas DESPUÉS:', despues);
  console.log('Diferencia (después - antes):', despues - antes);
  console.log('──────────────────────────────────────');

  await mongoose.disconnect();
  console.log('✔ Desconectado de MongoDB');
  console.log('Fin del importador de viviendas.');
}

main().catch((err) => {
  console.error('❌ Error en el importador:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
