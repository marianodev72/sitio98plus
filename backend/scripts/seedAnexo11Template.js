// backend/scripts/seedAnexo11Template.js
// Semilla / actualización del FormTemplate de ANEXO_11

require("dotenv").config();
const mongoose = require("mongoose");

// Importa el modelo igual que lo hace tu backend
const { FormTemplate } = require("../models/FormTemplate");

async function main() {
  // Usa exactamente la misma URI que tu server.js
  const uri =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/sitio98plus"; // opcional: ajustá el nombre de la base si hace falta

  console.log("[ANEXO_11] Conectando a MongoDB:", uri);
  await mongoose.connect(uri, {});

  const filter = { code: "ANEXO_11", version: 1 };

  const update = {
    $set: {
      nombre: "Pedido de trabajo / mantenimiento",
      descripcion:
        "Registro institucional de reparaciones, mejoras y mantenimiento de vivienda fiscal (ANEXO 11).",
      activo: true,

      // Roles que pueden CREAR ANEXO_11
      // (el control fino de quién puede iniciarlo lo hace la lógica de negocio)
      rolesQuePuedenCrear: [
        "PERMISIONARIO",
        "PERMISIONARIO_EN_ESPERA",
        "INSPECTOR",
        "JEFE_DE_BARRIO",
        "ADMIN",
        "ADMIN_GENERAL",
      ],

      // Roles que pueden VER ANEXO_11
      rolesQuePuedenVer: [
        "PERMISIONARIO",
        "PERMISIONARIO_EN_ESPERA",
        "INSPECTOR",
        "JEFE_DE_BARRIO",
        "ADMIN",
        "ADMIN_GENERAL",
      ],

      // Para Jefe de Barrio puede ser ESPACIO COMUN, por eso no lo forzamos acá
      requiereVivienda: false,
      requiereAlojamiento: false,
    },

    // Si no existía, inicializamos campos como array vacío
    $setOnInsert: {
      campos: [],
    },
  };

  const options = { upsert: true };

  console.log("[ANEXO_11] Ejecutando upsert de FormTemplate…");
  const res = await FormTemplate.updateOne(filter, update, options);
  console.log("[ANEXO_11] Resultado updateOne:", res);

  const doc = await FormTemplate.findOne(filter).lean();
  console.log("[ANEXO_11] Documento final de plantilla:");
  console.log(JSON.stringify(doc, null, 2));

  await mongoose.disconnect();
  console.log("[ANEXO_11] Conexión cerrada. Listo.");
}

main().catch((err) => {
  console.error("[ANEXO_11] Error al sembrar template:", err);
  process.exit(1);
});
