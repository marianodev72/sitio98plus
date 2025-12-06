// scripts/listUsers.js
// Lista TODOS los usuarios mostrando email, rol, estadoHabitacional y barrio.

require('dotenv').config();
const mongoose = require('mongoose');

// Ajusta la ruta si tu modelo User está en otra carpeta
const { User } = require('../models/User');

async function main() {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!uri) {
      console.error("ERROR: falta MONGO_URL o MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("\nConectado a MongoDB\n");

    const usuarios = await User.find().lean();

    if (!usuarios.length) {
      console.log("No hay usuarios en la base.");
      process.exit(0);
    }

    console.log("Usuarios encontrados:\n");

    usuarios.forEach((u) => {
      console.log(`----------------------------------`);
      console.log(`ID:     ${u._id}`);
      console.log(`Email:  ${u.email}`);
      console.log(`Nombre: ${u.nombre} ${u.apellido}`);
      console.log(`Rol:    ${u.role}`);
      console.log(`Estado: ${u.estadoHabitacional}`);
      console.log(`Barrio: ${u.barrioAsignado || '-'}`);
    });

    console.log("\n----------------------------------\nFIN\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("ERROR listando usuarios:", err);
    process.exit(1);
  }
}

main();
