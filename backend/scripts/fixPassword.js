// backend/scripts/fixPasswordHash.js
// Uso:
//   node scripts/fixPasswordHash.js admin.general@zn98.local Admin123!
//   node scripts/fixPasswordHash.js postulante@example.com Zn98_Prueba123

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const pass = String(process.argv[3] || "");

  if (!email || !pass) {
    console.error("Uso: node scripts/fixPasswordHash.js <email> <password>");
    process.exit(1);
  }

  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error("Falta MONGO_URI/MONGO_URL en .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const hash = await bcrypt.hash(pass, 10);

  // ✅ directo a colección (sin depender del modelo ni required)
  const col = mongoose.connection.db.collection("users");

  const before = await col.findOne({ email }, { projection: { email: 1, role: 1, passwordHash: 1, password: 1 } });
  if (!before) {
    console.error("No existe usuario:", email);
    process.exit(1);
  }

  const updated = await col.updateOne(
    { email },
    { $set: { passwordHash: hash }, $unset: { password: "" } }
  );

  const after = await col.findOne({ email }, { projection: { email: 1, role: 1, passwordHash: 1 } });

  console.log("DB:", uri);
  console.log("ANTES:", { email: before.email, role: before.role, hasPasswordHash: !!before.passwordHash, hasPassword: !!before.password });
  console.log("UPDATE:", updated);
  console.log("DESPUES:", { email: after.email, role: after.role, hasPasswordHash: !!after.passwordHash });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
