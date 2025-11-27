// scripts/update_admin.js
const { connect } = require('./_utils');

(async () => {
  const NEW_EMAIL = process.env.ADMIN_EMAIL;
  const NEW_USERNAME = process.env.ADMIN_USER;

  if (!NEW_EMAIL && !NEW_USERNAME) {
    console.error('Define ADMIN_EMAIL o ADMIN_USER en .env para actualizar datos del admin');
    process.exit(1);
  }

  const { client, db } = await connect();
  try {
    const users = db.collection('users');
    const set = { updatedAt: new Date() };
    if (NEW_EMAIL) set.email = NEW_EMAIL;
    if (NEW_USERNAME) set.username = NEW_USERNAME;

    const res = await users.updateOne({ role: 'ADMIN' }, { $set: set });
    console.log('Admin actualizado. Modificados:', res.modifiedCount);
  } finally {
    await client.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
