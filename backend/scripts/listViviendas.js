// scripts/listViviendas.js
// Lista viviendas mostrando ID, código, barrio y estado.

require("dotenv").config();
const mongoose = require("mongoose");
const { Vivienda } = require("../models/Vivienda");

async function main() {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!uri) {
      console.error("ERROR: falta MONGO_URL o MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("\nConectado a MongoDB\n");

    const viviendas = await Vivienda.find().lean();

    if (!viviendas.length) {
      console.log("No hay viviendas en la base.");
      process.exit(0);
    }

    console.log("Viviendas encontradas:\n");

    viviendas.forEach((v) => {
      console.log("----------------------------------");
      console.log(`ID:      ${v._id}`);
      console.log(`Código:  ${v.codigo}`);
      console.log(`Barrio:  ${v.barrio || "-"}`);
      console.log(`Estado:  ${v.estado}`);
    });

    console.log("\n----------------------------------\nFIN\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("ERROR listando viviendas:", err);
    process.exit(1);
  }
}

main();
