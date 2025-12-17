// backend/scripts/resetPostulanteUser.js
//
// Resetea (o crea) un usuario POSTULANTE de prueba en ZN98
// Compatible con:
// - models/user.js (exporta { User })
// - authController.login (valida con user.validarPassword() y passwordHash)

require("dotenv").config();
const mongoose = require("mongoose");

// Import correcto según tu proyecto
const { User } = require("../models/user");

async function main() {
  try {
    // Usuario de prueba
    const email = "postulante@example.com";
    const newPlainPassword = "Zn98_Prueba123"; // cámbiala si querés

    // Tu .env usa MONGO_URI y/o MONGO_URL
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

    if (!mongoUri) {
      console.error("Falta MONGO_URI o MONGO_URL en el archivo .env");
      process.exit(1);
    }

    console.log("Conectando a MongoDB:", mongoUri);
    await mongoose.connect(mongoUri);

    const emailLower = String(email).toLowerCase().trim();

    console.log("Buscando usuario:", emailLower);
    let user = await User.findOne({ email: emailLower });

    if (!user) {
      console.log("No existe. Creando usuario POSTULANTE...");
      user = new User({
        nombre: "Postulante",
        apellido: "Prueba",
        email: emailLower,
        dni: "00000000",
        matricula: "TEST-000",
        telefono: null,
        role: "POSTULANTE",
        estadoHabitacional: "SIN_VIVIENDA",
        activo: true,
        bloqueado: false,
      });
    } else {
      console.log("Existe. Actualizando flags y reseteando contraseña...");
      // no pisamos datos reales si ya existen
      user.nombre = user.nombre || "Postulante";
      user.apellido = user.apellido || "Prueba";
      user.role = user.role || "POSTULANTE";
      user.estadoHabitacional = user.estadoHabitacional || "SIN_VIVIENDA";
      user.activo = true;
      user.bloqueado = false;
    }

    // Set de password usando el método oficial del modelo
    await user.setPassword(newPlainPassword);

    await user.save();

    console.log("Usuario listo:");
    console.log({
      id: user._id,
      email: user.email,
      role: user.role,
      estadoHabitacional: user.estadoHabitacional,
      activo: user.activo,
      bloqueado: user.bloqueado,
    });

    console.log(
      `\nAhora podés iniciar sesión con:\n  email: ${emailLower}\n  clave: ${newPlainPassword}\n`
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error en el script:", err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
