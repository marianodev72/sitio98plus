// backend/scripts/seed_admin.js

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

async function main() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, NODE_ENV } = process.env;

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI no está definido en .env");
    process.exit(1);
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("❌ ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env");
    process.exit(1);
  }

  // Por seguridad, no lo ejecutamos en producción
  if (NODE_ENV === "production") {
    console.error("⚠️ seed_admin NO debe ejecutarse en producción.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB para seeding");

    // ¿Ya existe?
    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      console.log(`ℹ️ Ya existe un usuario admin con el email ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    // Hasheamos contraseña
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: hash,
      role: "ADMIN",
      activo: true,
    });

    console.log("✅ Usuario ADMIN creado:");
    console.log({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creando usuario admin:", err);
    process.exit(1);
  }
}

main();
