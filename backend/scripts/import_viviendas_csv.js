// backend/scripts/import_viviendas_csv.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mongoose = require('mongoose');

async function main() {
  const csvPath = path.join(__dirname, '..', 'data', 'viviendas.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ No se encontró', csvPath);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || 'sitio98plus' });
  const col = mongoose.connection.collection('viviendas');

  const docs = rows.map((r) => ({
    barrio: r['BARRIOS'] || null,
    dptoCasa: r['DPTO/CASA'] || null,
    dorm: Number(r['DORM.'] || 0),
    titular: r['TITULAR'] || null,
    ingreso: r['INGRESO'] ? new Date(r['INGRESO']) : null,
    egreso: r['EGRESO'] ? new Date(r['EGRESO']) : null,
    convivientes: Number(r['CANTIDAD CONVIVIENTES'] || 0),
    inspector: 'Inspector',
    importedAt: new Date(),
  }));

  if (!docs.length) {
    console.log('No hay filas para importar.');
    await mongoose.connection.close();
    return;
  }

  const result = await col.insertMany(docs);
  console.log(`✅ Importadas ${result.insertedCount} viviendas`);
  await mongoose.connection.close();
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
