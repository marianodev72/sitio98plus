// fix_db.js
// Script para limpiar índice username_1 y borrar usuario de pruebas

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function run() {
  try {
    // Usamos la misma URI que el servidor
    const uri =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/sitio98plus";

    console.log("Conectando a MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Conectado a MongoDB desde script fix_db.js");

    // 1) Intentar borrar índice username_1 (si existe)
    try {
      await User.collection.dropIndex("username_1");
      console.log("✅ Índice username_1 eliminado.");
    } catch (err) {
      console.log("ℹ️ No se pudo borrar índice username_1 (puede que no exista):");
      console.log("   ", err.message);
    }

    // 2) Borrar usuario de prueba por email
    const emailPrueba = "marianodev72@gmail.com";
    const result = await User.deleteOne({ email: emailPrueba });
    console.log(
      `✅ Usuarios eliminados con email ${emailPrueba}:`,
      result.deletedCount
    );

    console.log("✅ Limpieza terminada. Podés volver a registrar ese usuario.");
  } catch (err) {
    console.error("❌ Error en fix_db.js:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
