// scripts/testAnexo02AsignacionFutura.js
// Prueba de ASIGNACIÓN FUTURA con ANEXO_02 usando la misma lógica del controlador.
//
// Escenario:
// - Vivienda K01 (ID conocida) está OCUPADA por una permisionaria actual.
// - Postulante GONZALEZ (ID conocido) será el beneficiario futuro.
// - Un ADMIN_GENERAL "cierra" el ANEXO_02 y se aplica la lógica de PERMISIONARIO_EN_ESPERA.

require("dotenv").config();
const mongoose = require("mongoose");

const { User } = require("../models/User");
const { Vivienda } = require("../models/Vivienda");
const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission } = require("../models/FormSubmission");
const {
  actualizarEstadoAnexo,
} = require("../controllers/formularioController");

// ⚠️ IDs concretos de tu base:
const USUARIO_TITULAR_ID = "693354371b284fe258b3119a"; // GONZALEZ (postulante@example.com)
const VIVIENDA_ID_K01 = "69335b8e1faa26f57c60bd4d";    // Vivienda K01

function sumarDias(fecha, dias) {
  const f = new Date(fecha.getTime());
  f.setDate(f.getDate() + dias);
  return f;
}

async function main() {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!uri) {
      console.error("ERROR: falta MONGO_URL o MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("\nConectado a MongoDB\n");

    // 1) Buscar ADMIN_GENERAL
    const admin = await User.findOne({ role: "ADMIN_GENERAL" });
    if (!admin) {
      console.error("❌ No se encontró ningún ADMIN_GENERAL en la base.");
      process.exit(1);
    }

    // 2) Buscar usuario titular (GONZALEZ)
    const usuarioTitular = await User.findById(USUARIO_TITULAR_ID);
    if (!usuarioTitular) {
      console.error("❌ No se encontró el usuario titular (GONZALEZ).");
      process.exit(1);
    }

    console.log("Usuario titular (GONZALEZ) antes de la prueba:");
    console.log(`- Email:  ${usuarioTitular.email}`);
    console.log(`- Rol:    ${usuarioTitular.role}`);
    console.log(`- Estado: ${usuarioTitular.estadoHabitacional}`);
    console.log("");

    // 3) Buscar la vivienda K01
    const vivienda = await Vivienda.findById(VIVIENDA_ID_K01);
    if (!vivienda) {
      console.error("❌ No se encontró la vivienda K01.");
      process.exit(1);
    }

    console.log("Vivienda K01 antes de la prueba:");
    console.log(`- Código: ${vivienda.codigo}`);
    console.log(`- Estado: ${vivienda.estado}`);
    console.log(
      `- ocupacionActual.fechaDesocupacionPrevista: ${
        vivienda.ocupacionActual &&
        vivienda.ocupacionActual.fechaDesocupacionPrevista
          ? vivienda.ocupacionActual.fechaDesocupacionPrevista.toISOString().slice(0, 10)
          : "SIN FECHA"
      }`
    );
    console.log("");

    // 4) Calcular fechas correctas para la prueba
    let fechaDesoc = new Date();
    if (
      vivienda.ocupacionActual &&
      vivienda.ocupacionActual.fechaDesocupacionPrevista
    ) {
      fechaDesoc = new Date(
        vivienda.ocupacionActual.fechaDesocupacionPrevista
      );
    }

    const fechaIng = sumarDias(fechaDesoc, 1); // ingreso 1 día después

    const FECHA_DESOCUPACION_PREVISTA = fechaDesoc.toISOString().slice(0, 10);
    const FECHA_INGRESO_PREVISTA = fechaIng.toISOString().slice(0, 10);

    console.log("Fechas que usará el ANEXO_02:");
    console.log(`- fechaDesocupacionPrevista: ${FECHA_DESOCUPACION_PREVISTA}`);
    console.log(`- fechaIngresoPrevista:      ${FECHA_INGRESO_PREVISTA}`);
    console.log("");

    // 5) Asegurar que existe un FormTemplate para ANEXO_02
    let template = await FormTemplate.findOne({
      code: "ANEXO_02",
      activo: true,
    });

    if (!template) {
      console.log(
        "No existe plantilla activa para ANEXO_02. Se creará una mínima para la prueba..."
      );
      template = new FormTemplate({
        code: "ANEXO_02",
        nombre: "Asignación de vivienda fiscal (TEST)",
        version: 1,
        campos: [],
        activo: true,
      });
      await template.save();
      console.log("✔ Plantilla ANEXO_02 creada.");
      console.log("");
    }

    // 6) Crear un FormSubmission que simule el ANEXO_02
    const datos = {
      viviendaId: VIVIENDA_ID_K01,
      fechaDesocupacionPrevista: FECHA_DESOCUPACION_PREVISTA,
      fechaIngresoPrevista: FECHA_INGRESO_PREVISTA,
    };

    const anexo = new FormSubmission({
      template: template._id,
      codigo: "ANEXO_02",
      usuario: usuarioTitular._id, // titular = GONZALEZ
      datos,
      estado: "ENVIADO",
      vivienda: null,
      barrio: null,
    });

    await anexo.save();

    console.log("Anexo ANEXO_02 creado para GONZALEZ:");
    console.log(`- ID:     ${anexo._id}`);
    console.log(`- Estado: ${anexo.estado}`);
    console.log("");

    // 7) Simular el cierre del ANEXO_02 por el ADMIN_GENERAL
    const fakeReq = {
      params: { id: anexo._id.toString() },
      body: {
        estado: "CERRADO",
        observacion: "Prueba de asignación futura desde script",
      },
      user: {
        _id: admin._id,
        role: "ADMIN_GENERAL",
      },
    };

    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        console.log("\nRespuesta del controlador actualizarEstadoAnexo:");
        console.log(`- HTTP status: ${this.statusCode}`);
        console.log(JSON.stringify(payload, null, 2));
      },
    };

    console.log("Cerrando ANEXO_02 (simulación ADMIN_GENERAL)...\n");
    await actualizarEstadoAnexo(fakeReq, fakeRes);

    // 8) Volver a leer usuario y vivienda para ver los cambios
    const usuarioDespues = await User.findById(USUARIO_TITULAR_ID);
    const viviendaDespues = await Vivienda.findById(VIVIENDA_ID_K01);

    console.log("\n────────────────────────────────────────────");
    console.log("Resultado después de cerrar ANEXO_02:");
    console.log("\nUsuario GONZALEZ:");
    console.log(`- Email:  ${usuarioDespues.email}`);
    console.log(`- Rol:    ${usuarioDespues.role}`);
    console.log(`- Estado: ${usuarioDespues.estadoHabitacional}`);
    console.log(
      `- Vivienda asignada: ${
        usuarioDespues.viviendaAsignada
          ? usuarioDespues.viviendaAsignada.toString()
          : "null"
      }`
    );

    console.log("\nVivienda K01:");
    console.log(`- Código: ${viviendaDespues.codigo}`);
    console.log(`- Estado: ${viviendaDespues.estado}`);
    console.log(
      `- Ocupación actual: ${
        viviendaDespues.ocupacionActual
          ? JSON.stringify(viviendaDespues.ocupacionActual, null, 2)
          : "null"
      }`
    );
    console.log("────────────────────────────────────────────\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ ERROR en testAnexo02AsignacionFutura:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
