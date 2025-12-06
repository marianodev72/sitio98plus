// scripts/crearUsuario.js
// Crear cualquier usuario de cualquier rol — Sistema ZN98

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const path = require("path");

// Ajusta esta ruta si tu modelo User está en otra carpeta
const { User } = require("../models/User");

// Roles permitidos
const ROLES = [
  "ADMIN_GENERAL",
  "ADMIN",
  "INSPECTOR",
  "JEFE_DE_BARRIO",
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO"
];

// Terminal interactiva
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function preguntar(pregunta) {
  return new Promise((resolve) => rl.question(pregunta, resolve));
}

async function main() {
  try {
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("ERROR: No se encontró MONGO_URL ni MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Conectado a MongoDB\n");

    console.log("===== CREACIÓN DE USUARIO ZN98 =====\n");

    const nombre = await preguntar("Nombre: ");
    const apellido = await preguntar("Apellido: ");
    const email = await preguntar("Email: ");
    const dni = await preguntar("DNI: ");
    const matricula = await preguntar("Matrícula: ");
    const telefono = await preguntar("Teléfono: ");

    console.log("\nRoles válidos:", ROLES.join(", "));
    let role = await preguntar("Rol del usuario: ");
    role = role.toUpperCase();

    if (!ROLES.includes(role)) {
      console.error("\n❌ ERROR: Rol inválido.");
      process.exit(1);
    }

    let barrioAsignado = null;
    if (role === "INSPECTOR" || role === "JEFE_DE_BARRIO") {
      barrioAsignado = await preguntar("Barrio asignado (obligatorio): ");
      if (!barrioAsignado) {
        console.error("\n❌ ERROR: El rol requiere un barrioAsignado.");
        process.exit(1);
      }
    }

    const password = await preguntar("Contraseña (texto plano): ");

    console.log("\nCreando usuario...");
    
    const existe = await User.findOne({ email });
    if (existe) {
      console.error("\n❌ ERROR: Ya existe un usuario con ese email.");
      process.exit(1);
    }

    const user = new User({
      nombre,
      apellido,
      email,
      dni,
      matricula,
      telefono,
      role,
      barrioAsignado: barrioAsignado || null,
      estadoHabitacional: "SIN_VIVIENDA",
      activo: true,
      bloqueado: false
    });

    if (typeof user.setPassword === "function") {
      await user.setPassword(password);
    } else {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(password, 10);
      user.passwordHash = hash;
    }

    await user.save();

    console.log("\n==========================================");
    console.log("✔ Usuario creado correctamente");
    console.log("Email:", email);
    console.log("Rol:", role);
    if (barrioAsignado) console.log("Barrio:", barrioAsignado);
    console.log("==========================================\n");

    rl.close();
    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("\n❌ ERROR durante la creación del usuario:", err);
    rl.close();
    process.exit(1);
  }
}

main();
