// backend/scripts/seed_admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Falta MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const col = mongoose.connection.collection('users');

  const username = process.env.ADMIN_USER || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const rawPass = process.env.ADMIN_PASS || '123456';

  const password = await bcrypt.hash(rawPass, 10);

  const existing = await col.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    console.log('ℹ️  Admin ya existe. Actualizando contraseña/role...');
    await col.updateOne(
      { _id: existing._id },
      { $set: { password, role: 'ADMIN', email, username } }
    );
    console.log('✅ Admin actualizado:', existing._id);
  } else {
    const r = await col.insertOne({ username, email, password, role: 'ADMIN', createdAt: new Date() });
    console.log('✅ Admin creado:', r.insertedId);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
