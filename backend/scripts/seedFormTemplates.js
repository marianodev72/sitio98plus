// backend/scripts/seedFormTemplates.js
// Seed de plantillas de formularios / ANEXOS – Sistema ZN98 / SITIO98+

require("dotenv").config();
const mongoose = require("mongoose");
const { FormTemplate } = require("../models/FormTemplate");

// 🔗 Plantilla institucional específica del ANEXO 07
const { anexo07Template } = require("../templates/anexo07Template");

function getMongoUri() {
  return (
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    null
  );
}

async function upsertTemplate(payload) {
  const { code, version = 1 } = payload;

  const updated = await FormTemplate.findOneAndUpdate(
    { code, version },
    { $set: payload },
    { upsert: true, new: true }
  );

  return updated;
}

async function main() {
  const uri = getMongoUri();
  if (!uri) {
    console.error("Falta MONGO_URI (o MONGO_URL / MONGODB_URI) en .env");
    process.exit(1);
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(uri);

  const templates = [
    {
      code: "ANEXO_01",
      nombre: "ANEXO 01 - Postulación a vivienda fiscal",
      descripcion: "Inicia una postulación (panel limitado del postulante).",
      version: 1,
      activo: true,
      requiereVivienda: false,
      requiereAlojamiento: false,
      rolesQuePuedenCrear: ["POSTULANTE"],
      rolesQuePuedenVer: ["POSTULANTE", "ADMIN", "ADMIN_GENERAL"],
      campos: [
        {
          nombre: "motivo",
          etiqueta: "Motivo / observación inicial",
          tipo: "textarea",
          requerido: false,
          ayuda: "Campo opcional para dejar un texto inicial.",
        },
      ],
    },

    {
      code: "ANEXO_02",
      nombre: "ANEXO 02 - Asignación de vivienda fiscal",
      descripcion:
        "ADMIN_GENERAL crea, POSTULANTE da conformidad, ADMIN_GENERAL cierra (reserva sin ocupación).",
      version: 1,
      activo: true,
      requiereVivienda: false, // vivienda va en datos.viviendaId
      requiereAlojamiento: false,
      rolesQuePuedenCrear: ["ADMIN_GENERAL"],
      rolesQuePuedenVer: ["ADMIN_GENERAL", "ADMIN", "POSTULANTE", "PERMISIONARIO"],
      campos: [
        {
          nombre: "viviendaId",
          etiqueta: "Vivienda (ID)",
          tipo: "text",
          requerido: true,
          ayuda: "ObjectId de la vivienda a asignar.",
        },
        {
          nombre: "fechaAsignacion",
          etiqueta: "Fecha de asignación",
          tipo: "date",
          requerido: false,
        },
        {
          nombre: "observaciones",
          etiqueta: "Observaciones internas",
          tipo: "textarea",
          requerido: false,
        },
      ],
    },

    {
      code: "ANEXO_03",
      nombre: "ANEXO 03 - Recepción de vivienda fiscal",
      descripcion:
        "ADMIN_GENERAL crea, INSPECTOR conforma, PERMISIONARIO conforma, ADMIN_GENERAL cierra (ocupa vivienda).",
      version: 1,
      activo: true,
      requiereVivienda: true, // usa viviendaAsignada del titular
      requiereAlojamiento: false,
      rolesQuePuedenCrear: ["ADMIN_GENERAL"],
      rolesQuePuedenVer: ["ADMIN_GENERAL", "ADMIN", "INSPECTOR", "PERMISIONARIO"],
      campos: [
        {
          nombre: "fechaOcupacion",
          etiqueta: "Fecha de ocupación",
          tipo: "date",
          requerido: false,
        },
        {
          nombre: "observaciones",
          etiqueta: "Observaciones internas",
          tipo: "textarea",
          requerido: false,
        },
      ],
    },

    // 🟦 ANEXO 07 – usamos la plantilla institucional centralizada
    //    definida en backend/templates/anexo07Template.js
    anexo07Template,
  ];

  console.log("Upsert de plantillas...");
  for (const t of templates) {
    const saved = await upsertTemplate(t);
    console.log("OK:", saved.code, "v", saved.version, "activo:", saved.activo);
  }

  await mongoose.disconnect();
  console.log("Listo. Plantillas creadas/actualizadas.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
