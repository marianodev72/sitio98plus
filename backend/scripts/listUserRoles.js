// scripts/listUserRoles.js
// Lista todos los roles actuales en la colección de usuarios con sus cantidades.

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Ajusta la ruta si tu models/User.js está en otra carpeta
const { User } = require('../models/User');

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      console.error('ERROR: No se encontró MONGO_URI ni DATABASE_URL en .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');

    const agg = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('Roles encontrados en la colección de usuarios:\n');
    agg.forEach((r) => {
      console.log(`- ${r._id || '(sin role)'}: ${r.count} usuarios`);
    });

    await mongoose.disconnect();
    console.log('\nListo.');
    process.exit(0);
  } catch (err) {
    console.error('Error listando roles:', err);
    process.exit(1);
  }
}

main();
