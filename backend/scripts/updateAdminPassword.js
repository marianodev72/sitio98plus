// scripts/updateAdminPassword.js
// Script para actualizar la contraseña del usuario ADMIN_GENERAL
// SOLO PARA DESARROLLO

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Importar el modelo User
const { User } = require("../models/User");

// Usa la misma URI que usa tu backend.
// Si ya tenés MONGODB_URI en .env, se usará automáticamente.
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/zn98"; // ajustá el nombre de la base si hace falta

async function main() {
  try {
    console.log("[updateAdminPassword] Conectando a:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    // ESTE email debe coincidir con el que ves en Compass
    const email = "admin.general@example.com";
    const nuevaPassword = "AdminGeneral!2025";

    // Traemos al usuario incluyendo el passwordHash
    let user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      console.error(
        "[updateAdminPassword] No se encontró usuario con email:",
        email
      );
      process.exit(1);
    }

    console.log("[updateAdminPassword] Usuario encontrado:", {
      email: user.email,
      role: user.role,
      activo: user.activo,
      bloqueado: user.bloqueado,
    });

    // Aseguramos que sea ADMIN_GENERAL, activo y no bloqueado
    user.role = "ADMIN_GENERAL";
    user.activo = true;
    user.bloqueado = false;

    // Usamos el método del modelo para setear la contraseña
    if (typeof user.setPassword === "function") {
      await user.setPassword(nuevaPassword);
    } else {
      throw new Error(
        "El modelo User no tiene el método setPassword(password). Revisa models/User.js"
      );
    }

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
    console.error("[updateAdminPassword] Error:", err);
    process.exit(1);
  }
}

main();
