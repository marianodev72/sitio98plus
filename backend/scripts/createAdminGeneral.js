// scripts/createAdminGeneral.js
// Script de utilidad para crear/actualizar un usuario ADMIN_GENERAL
// SOLO PARA DESARROLLO – ELIMINAR O PROTEGER EN PRODUCCIÓN

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Cargar el modelo User
const { User } = require("../models/User");

// URL de Mongo (ajusta si usás otra variable)
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/sitio98plus";

async function main() {
  try {
    console.log("[createAdminGeneral] Conectando a Mongo:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    const email = "admin.general@example.com";
    const passwordPlano = "AdminGeneral!2025"; // puedes cambiarla si querés
    const matricula = "999998";

    let user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      console.log("[createAdminGeneral] No existe, creando nuevo usuario...");
      user = new User({
        nombre: "ADMIN",
        apellido: "GENERAL",
        email,
        dni: "00000001",
        matricula,
        role: "ADMIN_GENERAL",
        activo: true,
        bloqueado: false,
      });
    } else {
      console.log("[createAdminGeneral] Usuario existente encontrado, actualizando datos...");
      user.role = "ADMIN_GENERAL";
      user.activo = true;
      user.bloqueado = false;
    }

    // IMPORTANTE: usar el método del modelo para setear contraseña
    if (typeof user.setPassword === "function") {
      await user.setPassword(passwordPlano);
    } else {
      throw new Error(
        "El modelo User no tiene método setPassword(password). Revisa models/User.js"
      );
    }

    await user.save();

    console.log("──────────────────────────────────────────────");
    console.log(" Usuario ADMIN_GENERAL creado/actualizado:");
    console.log("  Email:      ", email);
    console.log("  Matrícula:  ", matricula);
    console.log("  Rol:        ", user.role);
    console.log("  Contraseña: ", passwordPlano);
    console.log("──────────────────────────────────────────────");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[createAdminGeneral] Error:", err);
    process.exit(1);
  }
}

main();
