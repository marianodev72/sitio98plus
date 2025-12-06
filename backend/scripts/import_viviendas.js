// scripts/importViviendas.js
// Importa el stock oficial de viviendas desde data/viviendas.csv
// SOLO usa: BARRIOS, DPTO/CASA, DORM.

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { Vivienda } = require('../models/Vivienda');
const connectDB = require('../config/db'); // ajustá si tu db.js exporta distinto

const CSV_PATH = path.join(__dirname, '..', 'data', 'viviendas.csv');

// Función simple para parsear CSV (asume que no hay comas dentro de los campos)
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] ?? '';
    });
    return obj;
  });
}

async function run() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();

    console.log(`📄 Leyendo CSV desde: ${CSV_PATH}`);
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCSV(csvContent);

    if (!rows.length) {
      console.error('⚠️ El CSV no contiene filas de datos.');
      process.exit(1);
    }

    console.log(`📦 Filas encontradas en CSV: ${rows.length}`);

    const bulkOps = [];

    for (const row of rows) {
      const barrioRaw = row['BARRIOS'] || '';
      const numeroCasaRaw = row['DPTO/CASA'] || '';
      const dormitoriosRaw = row['DORM.'] || '';

      const barrio = barrioRaw.trim();
      const numeroCasa = numeroCasaRaw.toString().trim();
      const cantidadHabitaciones =
        parseInt(dormitoriosRaw || '0', 10) || 0;

      if (!barrio || !numeroCasa || !cantidadHabitaciones) {
        console.warn('❗ Fila incompleta, se omite:', row);
        continue;
      }

      const codigoBase = `${barrio}_${numeroCasa}`;
      const codigo = codigoBase
        .replace(/["']/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();

      const direccion = `${barrio} - CASA ${numeroCasa}`;

      bulkOps.push({
        updateOne: {
          filter: { codigo },
          update: {
            $set: {
              codigo,
              barrio,
              numeroCasa,
              direccion,
              cantidadHabitaciones,
              // Estado, cantidadHabitantes y demás se gestionarán luego desde los paneles
            },
          },
          upsert: true,
        },
      });
    }

    if (!bulkOps.length) {
      console.error('⚠️ No se generaron operaciones de importación.');
      process.exit(1);
    }

    console.log(`🧮 Ejecutando importación de ${bulkOps.length} viviendas...`);

    const result = await Vivienda.bulkWrite(bulkOps);
    console.log('✅ Importación completada.');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Error durante la importación de viviendas:', err);
  } finally {
    console.log('🔌 Cerrando conexión a la base de datos...');
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
