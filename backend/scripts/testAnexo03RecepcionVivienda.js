// scripts/testAnexo03RecepcionVivienda.js
// Simula ANEXO_03: recepción de la vivienda K01 por GONZALEZ.

require("dotenv").config();
const mongoose = require("mongoose");

const { User } = require("../models/User");
const { Vivienda } = require("../models/Vivienda");
const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission } = require("../models/FormSubmission");
const { actualizarEstadoAnexo } = require("../controllers/formularioController");

// IDs de tu base:
const VIVIENDA_ID_K01 = "69335b8e1faa26f57c60bd4d";    // K01
const GONZALEZ_ID = "693354371b284fe258b3119a";         // postulante@example.com

async function main() {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!uri) {
      console.error("ERROR: falta MONGO_URL o MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("\nConectado a MongoDB\n");

    // 1) Buscar inspector (cierra ANEXO_03)
    const inspector = await User.findOne({ role: "INSPECTOR" });
    if (!inspector) {
      console.error("❌ No se encontró ningún usuario con rol INSPECTOR.");
      process.exit(1);
    }

    // 2) Traer usuario y vivienda
    const gonzalez = await User.findById(GONZALEZ_ID);
    const vivienda = await Vivienda.findById(VIVIENDA_ID_K01);

    if (!gonzalez) {
      console.error("❌ No se encontró a GONZALEZ.");
      process.exit(1);
    }
    if (!vivienda) {
      console.error("❌ No se encontró la vivienda K01.");
      process.exit(1);
    }

    console.log("Antes de ANEXO_03:");
    console.log("GONZALEZ:");
    console.log(`- Rol:    ${gonzalez.role}`);
    console.log(`- Estado: ${gonzalez.estadoHabitacional}`);
    console.log(
      `- viviendaAsignada: ${
        gonzalez.viviendaAsignada
          ? gonzalez.viviendaAsignada.toString()
          : "null"
      }`
    );
    console.log("");
    console.log("K01:");
    console.log(`- Estado: ${vivienda.estado}`);
    console.log(
      `- ocupacionActual: ${
        vivienda.ocupacionActual
          ? JSON.stringify(vivienda.ocupacionActual, null, 2)
          : "null"
      }`
    );
    console.log("");

    // 3) Asegurar plantilla ANEXO_03
    let template = await FormTemplate.findOne({
      code: "ANEXO_03",
      activo: true,
    });

    if (!template) {
      console.log(
        "No existe plantilla activa para ANEXO_03. Se crea una mínima para la prueba..."
      );
      template = new FormTemplate({
        code: "ANEXO_03",
        nombre: "Recepción de vivienda fiscal (TEST)",
        version: 1,
        campos: [],
        activo: true,
      });
      await template.save();
      console.log("✔ Plantilla ANEXO_03 creada.\n");
    }

    // 4) Crear FormSubmission simulando ANEXO_03
    const datos = {
      detalleRecepcion: "Recepción de vivienda K01 por GONZALEZ (prueba script)",
    };

    const anexo03 = new FormSubmission({
      template: template._id,
      codigo: "ANEXO_03",
      usuario: gonzalez._id,       // titular = GONZALEZ
      datos,
      estado: "ENVIADO",
      vivienda: vivienda._id,      // K01
      barrio: vivienda.barrio || null,
    });

    await anexo03.save();

    console.log("Anexo ANEXO_03 creado:");
    console.log(`- ID:     ${anexo03._id}`);
    console.log(`- Estado: ${anexo03.estado}\n`);

    // 5) Cerrar ANEXO_03 como INSPECTOR
    const fakeReq = {
      params: { id: anexo03._id.toString() },
      body: {
        estado: "CERRADO",
        observacion: "Recepción de vivienda K01 (prueba script)",
      },
      user: {
        _id: inspector._id,
        role: "INSPECTOR",
      },
    };

    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        console.log("\nRespuesta actualizarEstadoAnexo (ANEXO_03):");
        console.log(`- HTTP status: ${this.statusCode}`);
        console.log(JSON.stringify(payload, null, 2));
      },
    };

    console.log("Cerrando ANEXO_03...\n");
    await actualizarEstadoAnexo(fakeReq, fakeRes);

    // 6) Volver a leer estado de usuario y vivienda
    const gonzDespues = await User.findById(GONZALEZ_ID);
    const vivDespues = await Vivienda.findById(VIVIENDA_ID_K01);

    console.log("\n────────────────────────────────────────────");
    console.log("Resultado después de ANEXO_03 (recepción K01):\n");

    console.log("GONZALEZ (después):");
    console.log(`- Rol:    ${gonzDespues.role}`);
    console.log(`- Estado: ${gonzDespues.estadoHabitacional}`);
    console.log(
      `- viviendaAsignada: ${
        gonzDespues.viviendaAsignada
          ? gonzDespues.viviendaAsignada.toString()
          : "null"
      }`
    );

    console.log("\nK01 (después):");
    console.log(`- Estado: ${vivDespues.estado}`);
    console.log(
      `- ocupacionActual: ${
        vivDespues.ocupacionActual
          ? JSON.stringify(vivDespues.ocupacionActual, null, 2)
          : "null"
      }`
    );
    console.log("────────────────────────────────────────────\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ ERROR en testAnexo03RecepcionVivienda:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
