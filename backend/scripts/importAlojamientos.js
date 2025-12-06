// scripts/importAlojamientos.js
// Importa los TIPOS de alojamiento desde data/alojamientos.csv
// Formato esperado: ALOJAMIENTO;TIPO;LUGAR

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const { Alojamiento } = require('../models/Alojamiento');

const CSV_PATH = path.join(__dirname, '..', 'data', 'alojamientos.csv');

function parseCSVSeparadoPorPuntoYComa(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];

  // Primera línea puede tener BOM, la limpiamos
  let headerLine = lines[0].replace('\ufeff', '');
  const header = headerLine.split(';').map((h) => h.trim().toUpperCase());

  const rows = lines.slice(1);

  return rows.map((line) => {
    const cols = line.split(';').map((c) => c.trim());
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] ?? '';
    });
    return obj;
  });
}

async function run() {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB para importación de alojamientos');

    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ No se encontró alojamientos.csv en: ${CSV_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCSVSeparadoPorPuntoYComa(csvContent);

    if (!rows.length) {
      console.error('⚠️ El CSV de alojamientos no contiene filas de datos.');
      process.exit(1);
    }

    console.log(`📦 Filas encontradas en alojamientos.csv: ${rows.length}`);

    const bulkOps = [];

    for (const row of rows) {
      const alojamientoBase = (row['ALOJAMIENTO'] || '').trim();
      const tipo = (row['TIPO'] || '').toString().trim();
      const lugar = (row['LUGAR'] || '').trim();

      if (!alojamientoBase || !tipo || !lugar) {
        console.warn('❗ Fila incompleta en alojamientos.csv, se omite:', row);
        continue;
      }

      const codigoBase = `${alojamientoBase}_${tipo}_${lugar}`;
      const codigo = codigoBase
        .replace(/["']/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();

      const nombre = `${alojamientoBase} ${tipo}`.trim();
      const descripcion = `Tipo de alojamiento ${alojamientoBase} ${tipo} en ${lugar}`;

      bulkOps.push({
        updateOne: {
          filter: { codigo },
          update: {
            $set: {
              codigo,
              nombre,
              descripcion,
              ubicacion: lugar,
            },
          },
          upsert: true,
        },
      });
    }

    if (!bulkOps.length) {
      console.error('⚠️ No se generaron operaciones para alojamientos.');
      process.exit(1);
    }

    console.log(`🧮 Ejecutando importación de ${bulkOps.length} tipos de alojamiento...`);

    const result = await Alojamiento.bulkWrite(bulkOps);
    console.log('✅ Importación de alojamientos completada.');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Error durante la importación de alojamientos:', err);
  } finally {
    console.log('🔌 Cerrando conexión a la base de datos...');
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
