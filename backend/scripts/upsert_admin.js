// scripts/upsert_admin.js
const { connect, hashPassword } = require('./_utils');

(async () => {
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASS = process.env.ADMIN_PASS; // si no viene, no se cambia

  const { client, db } = await connect();
  try {
    const users = db.collection('users');
    const update = {
      $set: {
        username: ADMIN_USER,
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    };

    if (ADMIN_PASS) {
      update.$set.passwordHash = await hashPassword(ADMIN_PASS);
    }

    const res = await users.updateOne(
      { role: 'ADMIN' },
      update,
      { upsert: true }
    );

    if (res.upsertedCount) console.log('Admin creado:', res.upsertedId);
    else console.log('Admin actualizado:', res.matchedCount);
  } finally {
    await client.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
