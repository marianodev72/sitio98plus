// scripts/resetAdminPassword.js
// Reinicia la contraseña del usuario admin.general@example.com
// SOLO PARA DESARROLLO

require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("../models/User");

// OJO: esta URI debe apuntar a la base zn98 que ves en Compass
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/zn98";

async function main() {
  try {
    console.log("[resetAdminPassword] Conectando a:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    const email = "admin.general@example.com";
    const nuevaPassword = "AdminGeneral!2025";

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      console.error(
        "[resetAdminPassword] No se encontró usuario con email:",
        email
      );
      process.exit(1);
    }

    console.log("[resetAdminPassword] Usuario encontrado:", {
      email: user.email,
      role: user.role,
      activo: user.activo,
      bloqueado: user.bloqueado,
    });

    // Aseguramos que sea ADMIN_GENERAL, activo y no bloqueado
    user.role = "ADMIN_GENERAL";
    user.activo = true;
    user.bloqueado = false;

    if (typeof user.setPassword !== "function") {
      throw new Error(
        "El modelo User NO tiene setPassword(). Revisar models/User.js"
      );
    }

    await user.setPassword(nuevaPassword);
    await user.save();

    console.log("──────────────────────────────────────────────");
    console.log(" Contraseña ACTUALIZADA para el usuario:");
    console.log("  Email:      ", email);
    console.log("  Nuevo pass: ", nuevaPassword);
    console.log("  Rol:        ", user.role);
    console.log("  Activo:     ", user.activo);
    console.log("  Bloqueado:  ", user.bloqueado);
    console.log("──────────────────────────────────────────────");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[resetAdminPassword] Error:", err);
    process.exit(1);
  }
}

main();
