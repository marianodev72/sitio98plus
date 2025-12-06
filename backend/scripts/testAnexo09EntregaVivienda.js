// scripts/testAnexo09EntregaVivienda.js
// Simula ANEXO_09: entrega de la vivienda K01 por la permisionaria actual.

require("dotenv").config();
const mongoose = require("mongoose");

const { User } = require("../models/User");
const { Vivienda } = require("../models/Vivienda");
const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission } = require("../models/FormSubmission");
const { actualizarEstadoAnexo } = require("../controllers/formularioController");

// IDs de tu base:
const VIVIENDA_ID_K01 = "69335b8e1faa26f57c60bd4d"; // K01
// Permisionario actual de K01:
const PERMISIONARIO_ACTUAL_ID = "69335b3726c66e18d45fd770"; // florencia nutto
// Beneficiario futuro (ya quedó PERMISIONARIO_EN_ESPERA en el script anterior):
const GONZALEZ_ID = "693354371b284fe258b3119a";

async function main() {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!uri) {
      console.error("ERROR: falta MONGO_URL o MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("\nConectado a MongoDB\n");

    // 1) Buscar inspector (quien actúa en el ANEXO_09)
    const inspector = await User.findOne({ role: "INSPECTOR" });
    if (!inspector) {
      console.error("❌ No se encontró ningún usuario con rol INSPECTOR.");
      process.exit(1);
    }

    // 2) Traer usuarios y vivienda
    const permActual = await User.findById(PERMISIONARIO_ACTUAL_ID);
    const gonzalez = await User.findById(GONZALEZ_ID);
    const vivienda = await Vivienda.findById(VIVIENDA_ID_K01);

    if (!permActual) {
      console.error("❌ No se encontró la permisionaria actual.");
      process.exit(1);
    }
    if (!gonzalez) {
      console.error("❌ No se encontró a GONZALEZ.");
      process.exit(1);
    }
    if (!vivienda) {
      console.error("❌ No se encontró la vivienda K01.");
      process.exit(1);
    }

    console.log("Antes de ANEXO_09:");
    console.log("Permisionaria actual:");
    console.log(`- Email:  ${permActual.email}`);
    console.log(`- Rol:    ${permActual.role}`);
    console.log(`- Estado: ${permActual.estadoHabitacional}`);
    console.log(`- viviendaAsignada: ${permActual.viviendaAsignada}`);
    console.log("");
    console.log("GONZALEZ:");
    console.log(`- Rol:    ${gonzalez.role}`);
    console.log(`- Estado: ${gonzalez.estadoHabitacional}`);
    console.log(`- viviendaAsignada: ${gonzalez.viviendaAsignada}`);
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

    // 3) Plantilla ANEXO_09
    let template = await FormTemplate.findOne({
      code: "ANEXO_09",
      activo: true,
    });

    if (!template) {
      console.log(
        "No existe plantilla activa para ANEXO_09. Se crea una mínima para la prueba..."
      );
      template = new FormTemplate({
        code: "ANEXO_09",
        nombre: "Acta de entrega de vivienda fiscal (TEST)",
        version: 1,
        campos: [],
        activo: true,
      });
      await template.save();
      console.log("✔ Plantilla ANEXO_09 creada.\n");
    }

    // 4) Crear FormSubmission simulando ANEXO_09
    const datos = {
      detalleEntrega: "Entrega de vivienda K01 (prueba script)",
    };

    const anexo09 = new FormSubmission({
      template: template._id,
      codigo: "ANEXO_09",
      usuario: permActual._id, // titular = permisionaria actual
      datos,
      estado: "ENVIADO",
      vivienda: vivienda._id,
      barrio: vivienda.barrio || null,
    });

    await anexo09.save();

    console.log("Anexo ANEXO_09 creado:");
    console.log(`- ID:     ${anexo09._id}`);
    console.log(`- Estado: ${anexo09.estado}\n`);

    // 5) Cerrar ANEXO_09 como INSPECTOR
    const fakeReq = {
      params: { id: anexo09._id.toString() },
      body: {
        estado: "CERRADO",
        observacion: "Entrega de vivienda K01 (prueba script)",
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
        console.log("\nRespuesta actualizarEstadoAnexo (ANEXO_09):");
        console.log(`- HTTP status: ${this.statusCode}`);
        console.log(JSON.stringify(payload, null, 2));
      },
    };

    console.log("Cerrando ANEXO_09...\n");
    await actualizarEstadoAnexo(fakeReq, fakeRes);

    // 6) Volver a leer estado de usuarios y vivienda
    const permDespues = await User.findById(PERMISIONARIO_ACTUAL_ID);
    const gonzDespues = await User.findById(GONZALEZ_ID);
    const vivDespues = await Vivienda.findById(VIVIENDA_ID_K01);

    console.log("\n────────────────────────────────────────────");
    console.log("Resultado después de ANEXO_09 (entrega K01):\n");

    console.log("Permisionaria actual (después):");
    console.log(`- Email:  ${permDespues.email}`);
    console.log(`- Rol:    ${permDespues.role}`);
    console.log(`- Estado: ${permDespues.estadoHabitacional}`);
    console.log(
      `- viviendaAsignada: ${
        permDespues.viviendaAsignada
          ? permDespues.viviendaAsignada.toString()
          : "null"
      }`
    );

    console.log("\nGONZALEZ (después):");
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
    console.error("\n❌ ERROR en testAnexo09EntregaVivienda:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
