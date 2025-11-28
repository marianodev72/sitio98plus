// scripts/import_permisionarios.js
// Uso:
//   JSON: node scripts/import_permisionarios.js /ruta/permisionarios.json
//   CSV : node scripts/import_permisionarios.js /ruta/permisionarios.csv
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { connect } = require('./_utils');

function normalize(p) {
  return {
    matricula: String(p.matricula || p.MATRICULA || '').trim(),
    nombre: String(p.nombre || p.NOMBRE || '').trim(),
    email: String(p.email || p.EMAIL || '').trim().toLowerCase(),
    telefono: String(p.telefono || p.TELEFONO || '').trim(),
    rol: (p.rol || p.ROL || 'PERMISIONARIO').toUpperCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'ACTIVE',
  };
}

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/import_permisionarios.js /ruta/archivo.(json|csv)');
    process.exit(1);
  }

  const abs = path.resolve(file);
  const ext = path.extname(abs).toLowerCase();

  let items = [];
  if (ext === '.json') {
    items = JSON.parse(fs.readFileSync(abs, 'utf-8'));
  } else if (ext === '.csv') {
    const csv = fs.readFileSync(abs, 'utf-8');
    items = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    console.error('Extensión no soportada. Usa .json o .csv');
    process.exit(1);
  }

  const docs = items.map(normalize);

  const { client, db } = await connect();
  try {
    const people = db.collection('personas'); // o 'permisionarios' si lo prefieres
    const ops = docs.map(d => ({
      updateOne: {
        filter: { matricula: d.matricula },
        update: { $set: d, $setOnInsert: { createdAt: d.createdAt } },
        upsert: true
      }
    }));

    const res = await people.bulkWrite(ops, { ordered: false });
    console.log('Upserts/Updates:', {
      upserts: res.upsertedCount,
      modified: res.modifiedCount,
      matched: res.matchedCount
    });
  } finally {
    await client.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
