// backend/scripts/resetPostulanteUser.js

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Ajusta la ruta si tu modelo está en otra carpeta
const User = require("../models/user");

async function main() {
  try {
    const email = "postulante@example.com";

    // ⚠️ Elige una contraseña nueva y segura
    const newPlainPassword = "Zn98_Prueba123"; // cámbiala si quieres

    if (!process.env.MONGODB_URI) {
      console.error("Falta MONGODB_URI en el archivo .env");
      process.exit(1);
    }

    console.log("Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Generando hash para la nueva contraseña...");
    const hash = await bcrypt.hash(newPlainPassword, 10);

    console.log("Actualizando / creando usuario:", email);
    const user = await User.findOneAndUpdate(
      { email },
      {
        email,
        password: hash,
        role: "POSTULANTE",
        activo: true,
      },
      {
        upsert: true, // crea si no existe
        new: true,    // devuelve el documento actualizado
      }
    );

    console.log("Usuario listo:");
    console.log({
      id: user._id,
      email: user.email,
      role: user.role,
      activo: user.activo,
    });

    console.log(
      `\nAhora podés iniciar sesión con:\n  email: ${email}\n  clave: ${newPlainPassword}\n`
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error en el script:", err);
    process.exit(1);
  }
}

main();
