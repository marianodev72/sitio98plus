require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;

  if (!email) {
    console.log("uso: node scripts/inspectUser.js <email>");
    process.exit(1);
  }
  if (!uri) {
    console.log("Falta MONGO_URI/MONGO_URL");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  console.log("DB URI:", uri);
  console.log("DB NAME:", mongoose.connection.name);

  const col = db.collection("users");
  const u = await col.findOne(
    { email },
    { projection: { email: 1, role: 1, passwordHash: 1, password: 1 } }
  );

  console.log("USER:", u ? {
    email: u.email,
    role: u.role,
    hasPasswordHash: !!u.passwordHash,
    hasPassword: !!u.password,
    passwordHashPrefix: u.passwordHash ? String(u.passwordHash).slice(0,4) : null
  } : null);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
