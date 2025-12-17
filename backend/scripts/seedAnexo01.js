require("dotenv").config();
const mongoose = require("mongoose");
const { FormTemplate } = require("../models/FormTemplate");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  await FormTemplate.deleteOne({ code: "ANEXO_01" });

  await FormTemplate.create({
    code: "ANEXO_01",
    nombre: "ANEXO 01 - Postulación a Vivienda Fiscal",
    descripcion: "Formulario de postulación a vivienda fiscal",
    version: 1,
    activo: true,

    requiereVivienda: false,

    rolesQuePuedenCrear: ["POSTULANTE"],
    rolesQuePuedenVer: ["POSTULANTE", "ADMIN", "ADMIN_GENERAL"],

    campos: [
      { nombre: "domicilioActual", etiqueta: "Domicilio actual", tipo: "text", requerido: true },
      { nombre: "localidad", etiqueta: "Localidad", tipo: "text", requerido: true },
      { nombre: "provincia", etiqueta: "Provincia", tipo: "text", requerido: true },

      {
        nombre: "situacionHabitacional",
        etiqueta: "Situación habitacional actual",
        tipo: "select",
        requerido: true,
        opciones: [
          { valor: "ALQUILA", etiqueta: "Alquila" },
          { valor: "PRESTADA", etiqueta: "Vivienda prestada" },
          { valor: "FAMILIAR", etiqueta: "Vivienda familiar" },
          { valor: "OTRA", etiqueta: "Otra" },
        ],
      },

      {
        nombre: "grupoFamiliar",
        etiqueta: "Grupo familiar conviviente",
        tipo: "textarea",
        requerido: true,
        ayuda: "Indicar nombre, edad y parentesco",
      },

      {
        nombre: "observaciones",
        etiqueta: "Observaciones",
        tipo: "textarea",
        requerido: false,
      },
    ],
  });

  console.log("✅ ANEXO_01 creado correctamente");
  await mongoose.disconnect();
}

main();
