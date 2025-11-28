// scripts/fix_admin_password.js
const { connect, hashPassword } = require('./_utils');

(async () => {
  const NEW_PASS = process.env.ADMIN_PASS;
  if (!NEW_PASS) {
    console.error('Falta ADMIN_PASS en .env para cambiar la contraseña del admin');
    process.exit(1);
  }

  const { client, db } = await connect();
  try {
    const users = db.collection('users');
    const passwordHash = await hashPassword(NEW_PASS);
    const res = await users.updateOne(
      { role: 'ADMIN' },
      { $set: { passwordHash, updatedAt: new Date() } }
    );
    console.log('Contraseña de admin actualizada. Modificados:', res.modifiedCount);
  } finally {
    await client.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
