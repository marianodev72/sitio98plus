// scripts/import_viviendas.js
// Uso: node scripts/import_viviendas.js /ruta/viviendas.json
const fs = require('fs');
const path = require('path');
const { connect, safeParseInt } = require('./_utils');

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/import_viviendas.js /ruta/viviendas.json');
    process.exit(1);
  }
  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs, 'utf-8');
  const data = JSON.parse(raw);

  const { client, db } = await connect();
  try {
    const viviendas = db.collection('viviendas');
    const docs = data.map((v) => ({
      barrio: v.barrio?.trim(),
      direccion: v.direccion?.trim() || v.casa || v.numero,
      habitaciones: safeParseInt(v.habitaciones, 0),
      estado: v.estado?.trim() || 'DESOCUPADA',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await viviendas.insertMany(docs, { ordered: false });
    console.log(`Viviendas importadas: ${res.insertedCount}`);
  } finally {
    await client.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
