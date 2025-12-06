// scripts/seedViviendaK01.js
// Crea una vivienda K01 y la asigna como OCUPADA al permisionario (ej: PEREZ)

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const { User } = require("../models/User");
const { Vivienda } = require("../models/Vivienda");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function preguntar(pregunta) {
  return new Promise((resolve) => rl.question(pregunta, resolve));
}

async function main() {
  try {
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("ERROR: No se encontró MONGO_URL ni MONGO_URI en .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Conectado a MongoDB\n");

    console.log("===== SEED VIVIENDA K01 =====\n");

    const emailPermisionario = await preguntar(
      "Email del PERMISIONARIO actual (ej: el de PEREZ): "
    );
    const codigoVivienda = await preguntar(
      "Código de vivienda (ej: K01): "
    );
    const barrio = await preguntar(
      "Barrio (ej: BARRIO STORNI): "
    );
    const fechaDesocPrevistaStr = await preguntar(
      "Fecha de desocupación prevista (YYYY-MM-DD, ej: 2025-01-31): "
    );

    if (!emailPermisionario || !codigoVivienda || !barrio || !fechaDesocPrevistaStr) {
      console.error("\n❌ ERROR: Todos los campos son obligatorios.");
      process.exit(1);
    }

    const fechaDesocPrevista = new Date(fechaDesocPrevistaStr);
    if (isNaN(fechaDesocPrevista.getTime())) {
      console.error("\n❌ ERROR: Fecha de desocupación prevista inválida.");
      process.exit(1);
    }

    const usuario = await User.findOne({ email: emailPermisionario });
    if (!usuario) {
      console.error(`\n❌ No se encontró usuario con email: ${emailPermisionario}`);
      process.exit(1);
    }

    if (usuario.role !== "PERMISIONARIO") {
      console.warn(
        `\n⚠️ Advertencia: El usuario no tiene rol PERMISIONARIO (tiene: ${usuario.role}). Se seguirá igual, pero revisa si es correcto.`
      );
    }

    // Buscar si ya existe la vivienda con ese código
    let vivienda = await Vivienda.findOne({ codigo: codigoVivienda });

    const ahora = new Date();

    if (!vivienda) {
      console.log("\nNo existe la vivienda, se creará una nueva...");

      vivienda = new Vivienda({
        codigo: codigoVivienda,
        barrio,
        estado: "OCUPADA",
        ocupacionActual: {
          permisionario: usuario._id,
          fechaAsignacion: ahora,
          fechaDesocupacionPrevista: fechaDesocPrevista,
          recordatorio90Enviado: false,
        },
        historialOcupacion: [
          {
            permisionario: usuario._id,
            fechaIngreso: ahora,
            fechaEgreso: null,
            motivo: "SEED_INICIAL",
          },
        ],
      });

      await vivienda.save();
      console.log("\n✔ Vivienda creada y asignada como OCUPADA.");
    } else {
      console.log("\nYa existe una vivienda con ese código. Se actualizará a OCUPADA...");

      vivienda.barrio = barrio;
      vivienda.estado = "OCUPADA";
      vivienda.ocupacionActual = {
        permisionario: usuario._id,
        fechaAsignacion: ahora,
        fechaDesocupacionPrevista: fechaDesocPrevista,
        recordatorio90Enviado: false,
      };

      vivienda.historialOcupacion = vivienda.historialOcupacion || [];
      vivienda.historialOcupacion.push({
        permisionario: usuario._id,
        fechaIngreso: ahora,
        fechaEgreso: null,
        motivo: "SEED_REASIGNACION",
      });

      await vivienda.save();
      console.log("\n✔ Vivienda actualizada como OCUPADA por este permisionario.");
    }

    // Actualizar usuario como PERMISIONARIO_ACTIVO con viviendaAsignada
    const estadoAnterior = usuario.estadoHabitacional;

    usuario.viviendaAsignada = vivienda._id;
    usuario.estadoHabitacional = "PERMISIONARIO_ACTIVO";

    if (typeof usuario.registrarCambio === "function") {
      usuario.registrarCambio({
        realizadoPor: null,
        tipo: "CAMBIO_ESTADO_HABITACIONAL",
        campo: "estadoHabitacional",
        valorAnterior: estadoAnterior,
        valorNuevo: usuario.estadoHabitacional,
        motivo: "Seed inicial vivienda ocupada",
        anexoCodigo: null,
        anexoId: null,
      });
    }

    await usuario.save();

    console.log("\n==========================================");
    console.log("✔ Escenario base creado correctamente:");
    console.log(`  Vivienda: ${vivienda.codigo}`);
    console.log(`  Barrio:   ${vivienda.barrio}`);
    console.log("  Estado vivienda:", vivienda.estado);
    console.log("  Ocupada por:", usuario.email);
    console.log("  Fecha desoc. prevista:", fechaDesocPrevista.toISOString().slice(0, 10));
    console.log("==========================================\n");

    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ ERROR en seedViviendaK01:", err);
    rl.close();
    process.exit(1);
  }
}

main();
