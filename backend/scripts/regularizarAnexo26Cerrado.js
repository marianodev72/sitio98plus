#!/usr/bin/env node

try {
  const path = require("path");
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  require("dotenv").config();
} catch {
  // dotenv puede no estar disponible en algunos entornos.
}

const mongoose = require("mongoose");

const AlojamientoDocumento = require("../modules/alojamientos/models/AlojamientoDocumento");
const AlojamientoNaval = require("../modules/alojamientos/models/AlojamientoNaval");
const AlojamientoPlaza = require("../modules/alojamientos/models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");
const { User } = require("../models/user");

const ACCION = "REGULARIZACION_ANEXO_26";

function parseArgs(argv) {
  const args = { dryRun: true, apply: false };
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--dry-run") {
      args.dryRun = true;
      args.apply = false;
    } else if (item === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (item === "--id") {
      args.id = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Parametro no reconocido: ${item}`);
    }
  }
  return args;
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function sameId(a, b) {
  const aa = idValue(a);
  const bb = idValue(b);
  return Boolean(aa && bb && aa === bb);
}

function validarArgs(args) {
  if (!args.id) throw new Error("Falta --id <ANEXO26_ID>.");
  if (!isObjectId(args.id)) throw new Error("ANEXO26_ID invalido.");
}

function hasAdminGeneralConformidad(documento) {
  if (documento?.datos?.conformidadAdminGeneral) return true;
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some((item) => up(item?.tipo) === "ADMIN_GENERAL" && item?.ok === true);
}

function tieneRegularizacionDocumento(documento) {
  const intervenciones = Array.isArray(documento?.intervenciones) ? documento.intervenciones : [];
  const historial = Array.isArray(documento?.historialEstados) ? documento.historialEstados : [];
  return (
    intervenciones.some((item) => up(item?.tipo) === ACCION) ||
    historial.some((item) => String(item?.observacion || "").includes(ACCION))
  );
}

function tieneRegularizacionAsignacion(asignacion, documentoId) {
  const auditoria = Array.isArray(asignacion?.auditoria) ? asignacion.auditoria : [];
  return auditoria.some(
    (item) => up(item?.accion) === ACCION && String(item?.observacion || "").includes(String(documentoId))
  );
}

function tieneRegularizacionPlaza(plaza, documentoId) {
  const historial = Array.isArray(plaza?.historial) ? plaza.historial : [];
  return historial.some((item) => up(item?.accion) === ACCION && sameId(item?.anexoId, documentoId));
}

function tieneRegularizacionAlojamiento(alojamiento, documentoId) {
  const historial = Array.isArray(alojamiento?.historialOcupacion) ? alojamiento.historialOcupacion : [];
  return historial.some((item) => up(item?.accion) === ACCION && sameId(item?.anexoId, documentoId));
}

async function cargarCaso(id, session = null) {
  const documentoQuery = AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_26",
    activo: { $ne: false },
  });
  if (session) documentoQuery.session(session);
  const documento = await documentoQuery;

  if (!documento) throw new Error("No se encontro ANEXO_26 activo.");

  const alojadoId = idValue(documento.alojado);
  const alojamientoId = idValue(documento.alojamiento);
  const plazaId = idValue(documento.plaza);
  const asignacionId = idValue(documento.asignacion);

  const asignacionQuery = AsignacionAlojamiento.findById(asignacionId);
  const plazaQuery = AlojamientoPlaza.findOne({ _id: plazaId, activo: { $ne: false } });
  const userQuery = User.findById(alojadoId).select("+tokenVersion");
  const alojamientoQuery = AlojamientoNaval.findOne({ _id: alojamientoId, activo: { $ne: false } });
  const otraAsignacionQuery = AsignacionAlojamiento.findOne({
    alojado: alojadoId,
    estado: { $in: ["RESERVADA", "ACTIVA"] },
    _id: { $ne: asignacionId },
  });

  if (session) {
    asignacionQuery.session(session);
    plazaQuery.session(session);
    userQuery.session(session);
    alojamientoQuery.session(session);
    otraAsignacionQuery.session(session);
  }

  const [asignacion, plaza, usuario, alojamiento, otraAsignacionActiva] = await Promise.all([
    asignacionQuery,
    plazaQuery,
    userQuery,
    alojamientoQuery,
    otraAsignacionQuery,
  ]);

  return { documento, asignacion, plaza, usuario, alojamiento, otraAsignacionActiva };
}

function validarCaso({ documento, asignacion, plaza, usuario, alojamiento, otraAsignacionActiva }) {
  const errors = [];
  const documentoId = idValue(documento?._id);
  const alojadoId = idValue(documento?.alojado);
  const alojamientoId = idValue(documento?.alojamiento);
  const plazaId = idValue(documento?.plaza);
  const asignacionId = idValue(documento?.asignacion);

  if (up(documento?.codigo) !== "ANEXO_26") errors.push("Documento no es ANEXO_26.");
  if (up(documento?.estado) !== "CERRADO") errors.push("Documento no esta CERRADO.");
  if (documento?.datos?.conformidadAlojado?.ok !== true) errors.push("Falta conformidadAlojado.ok === true.");
  if (!hasAdminGeneralConformidad(documento)) errors.push("Falta conformidad ADMIN_GENERAL.");
  if ([alojadoId, alojamientoId, plazaId, asignacionId].some((item) => !isObjectId(item))) {
    errors.push("Faltan referencias validas alojado/alojamiento/plaza/asignacion.");
  }

  if (!asignacion) errors.push("Asignacion no encontrada.");
  if (!plaza) errors.push("Plaza no encontrada.");
  if (!usuario) errors.push("Usuario alojado no encontrado.");
  if (!alojamiento) errors.push("Alojamiento no encontrado.");
  if (otraAsignacionActiva) errors.push(`Existe otra asignacion activa/reservada: ${idValue(otraAsignacionActiva._id)}.`);

  if (asignacion) {
    if (!sameId(asignacion.alojado, alojadoId)) errors.push("Asignacion no corresponde al alojado.");
    if (!sameId(asignacion.plaza, plazaId)) errors.push("Asignacion no corresponde a la plaza.");
    if (!sameId(asignacion.alojamiento, alojamientoId)) errors.push("Asignacion no corresponde al alojamiento.");
    if (up(asignacion.estado) !== "ACTIVA") errors.push("Asignacion no esta ACTIVA.");
    if (tieneRegularizacionAsignacion(asignacion, documentoId)) {
      errors.push("Ya existe auditoria REGULARIZACION_ANEXO_26 en asignacion.");
    }
  }

  if (plaza) {
    if (!sameId(plaza.alojamiento, alojamientoId)) errors.push("Plaza no pertenece al alojamiento.");
    if (up(plaza.estado) !== "OCUPADA") errors.push("Plaza no esta OCUPADA.");
    if (!sameId(plaza.alojadoActual, alojadoId)) errors.push("plaza.alojadoActual no corresponde al alojado.");
    if (plaza.reservaActual?.usuario || plaza.reservaActual?.anexoId) errors.push("Plaza tiene reservaActual activa.");
    if (tieneRegularizacionPlaza(plaza, documentoId)) {
      errors.push("Ya existe historial REGULARIZACION_ANEXO_26 en plaza.");
    }
  }

  if (usuario) {
    const role = up(usuario.role);
    const estadoHabitacional = up(usuario.estadoHabitacional);
    if (role !== "ALOJADO" && estadoHabitacional !== "ALOJADO" && estadoHabitacional !== "ALOJADO_ACTIVO") {
      errors.push("Usuario no esta en condicion ALOJADO.");
    }
    if (usuario.alojamientoAsignado && !sameId(usuario.alojamientoAsignado, alojamientoId)) {
      errors.push("Usuario tiene alojamientoAsignado distinto.");
    }
  }

  if (alojamiento && tieneRegularizacionAlojamiento(alojamiento, documentoId)) {
    errors.push("Ya existe historial REGULARIZACION_ANEXO_26 en alojamiento.");
  }

  if (tieneRegularizacionDocumento(documento)) {
    errors.push("Ya existe intervencion/historial REGULARIZACION_ANEXO_26 en documento.");
  }

  return errors;
}

function resumenCaso(caso) {
  const { documento, asignacion, plaza, usuario, alojamiento, otraAsignacionActiva } = caso;
  return {
    documento: {
      _id: idValue(documento?._id),
      codigo: documento?.codigo,
      estado: documento?.estado,
      alojado: idValue(documento?.alojado),
      alojamiento: idValue(documento?.alojamiento),
      plaza: idValue(documento?.plaza),
      asignacion: idValue(documento?.asignacion),
      conformidadAlojadoOk: documento?.datos?.conformidadAlojado?.ok === true,
      conformidadAdminGeneral: hasAdminGeneralConformidad(documento),
    },
    asignacion: asignacion
      ? {
          _id: idValue(asignacion._id),
          estado: asignacion.estado,
          alojado: idValue(asignacion.alojado),
          alojamiento: idValue(asignacion.alojamiento),
          plaza: idValue(asignacion.plaza),
          fechaInicio: asignacion.fechaInicio || null,
          fechaFin: asignacion.fechaFin || null,
        }
      : null,
    plaza: plaza
      ? {
          _id: idValue(plaza._id),
          codigo: plaza.codigo,
          estado: plaza.estado,
          alojamiento: idValue(plaza.alojamiento),
          alojadoActual: idValue(plaza.alojadoActual),
          reservaActual: plaza.reservaActual
            ? {
                usuario: idValue(plaza.reservaActual.usuario),
                anexoId: idValue(plaza.reservaActual.anexoId),
              }
            : null,
        }
      : null,
    usuario: usuario
      ? {
          _id: idValue(usuario._id),
          nombre: [usuario.apellido, usuario.nombre].filter(Boolean).join(", "),
          role: usuario.role,
          estadoHabitacional: usuario.estadoHabitacional,
          alojamientoAsignado: idValue(usuario.alojamientoAsignado),
          tokenVersion: usuario.tokenVersion,
        }
      : null,
    alojamiento: alojamiento
      ? {
          _id: idValue(alojamiento._id),
          codigo: alojamiento.codigo,
          estado: alojamiento.estado,
          ocupacionActual: alojamiento.ocupacionActual || null,
        }
      : null,
    otraAsignacionActiva: otraAsignacionActiva ? idValue(otraAsignacionActiva._id) : null,
  };
}

function accionesPrevistas(caso) {
  return [
    `Asignacion ${idValue(caso.asignacion?._id)}: ACTIVA -> FINALIZADA`,
    "Asignacion.fechaFin -> now",
    `Asignacion.auditoria -> ${ACCION}`,
    `Plaza ${idValue(caso.plaza?._id)}: OCUPADA -> LIBRE`,
    "Plaza.alojadoActual -> null",
    "Plaza.reservaActual -> null",
    `Plaza.historial -> ${ACCION}`,
    `Usuario ${idValue(caso.usuario?._id)}: role -> POSTULANTE`,
    "Usuario.estadoHabitacional -> POSTULANTE",
    "Usuario.alojamientoAsignado -> null",
    "Usuario.tokenVersion ++ si es numerico",
    "AlojamientoNaval.ocupacionActual -> recalculado desde plazas",
    `AlojamientoNaval.historialOcupacion -> ${ACCION}`,
    `AlojamientoDocumento.intervenciones/historialEstados -> ${ACCION}`,
  ];
}

async function recalcularAlojamiento(alojamiento, { documento, plaza, usuario, actorId, now, session }) {
  const plazas = await AlojamientoPlaza.find({
    alojamiento: alojamiento._id,
    activo: { $ne: false },
  })
    .select("estado alojadoActual")
    .session(session)
    .lean();

  const alojados = plazas
    .filter((item) => up(item?.estado) === "OCUPADA" && item?.alojadoActual)
    .map((item) => item.alojadoActual);

  alojamiento.ocupacionActual = {
    ...(alojamiento.ocupacionActual || {}),
    plazasTotales: plazas.length,
    plazasOcupadas: alojados.length,
    plazasReservadas: plazas.filter((item) => up(item?.estado) === "RESERVADA").length,
    alojados,
    actualizadoEn: now,
  };

  alojamiento.historialOcupacion = Array.isArray(alojamiento.historialOcupacion)
    ? alojamiento.historialOcupacion
    : [];
  alojamiento.historialOcupacion.push({
    fecha: now,
    accion: ACCION,
    alojado: usuario._id,
    plaza: plaza._id,
    estadoAnterior: "OCUPADA",
    estadoNuevo: "LIBRE",
    anexoId: documento._id,
    realizadoPor: actorId || null,
    observacion: "Regularizacion puntual de ANEXO_26 cerrado antes de liberar ocupacion.",
  });

  await alojamiento.save({ session });
}

async function aplicarRegularizacion(caso, session) {
  const { documento, asignacion, plaza, usuario, alojamiento } = caso;
  const now = new Date();
  const actorId = documento.actualizadoPor || documento.creadoPor || null;

  asignacion.estado = "FINALIZADA";
  asignacion.fechaFin = now;
  asignacion.actualizadoPor = actorId;
  asignacion.auditoria = Array.isArray(asignacion.auditoria) ? asignacion.auditoria : [];
  asignacion.auditoria.push({
    fecha: now,
    accion: ACCION,
    actor: actorId,
    estadoAnterior: "ACTIVA",
    estadoNuevo: "FINALIZADA",
    observacion: `Regularizacion de asignacion por ANEXO_26 ${documento._id}.`,
  });
  await asignacion.save({ session });

  plaza.estado = "LIBRE";
  plaza.alojadoActual = null;
  plaza.reservaActual = null;
  plaza.historial = Array.isArray(plaza.historial) ? plaza.historial : [];
  plaza.historial.push({
    fecha: now,
    accion: ACCION,
    alojado: usuario._id,
    estadoAnterior: "OCUPADA",
    estadoNuevo: "LIBRE",
    anexoId: documento._id,
    realizadoPor: actorId,
    observacion: "Regularizacion puntual de plaza por ANEXO_26 cerrado.",
  });
  await plaza.save({ session });

  usuario.role = "POSTULANTE";
  usuario.estadoHabitacional = "POSTULANTE";
  usuario.alojamientoAsignado = null;
  if (typeof usuario.tokenVersion === "number") usuario.tokenVersion += 1;
  await usuario.save({ session });

  await recalcularAlojamiento(alojamiento, {
    documento,
    plaza,
    usuario,
    actorId,
    now,
    session,
  });

  documento.intervenciones = Array.isArray(documento.intervenciones) ? documento.intervenciones : [];
  documento.intervenciones.push({
    fecha: now,
    tipo: ACCION,
    actor: actorId,
    rolActor: "ADMIN_GENERAL",
    observacion: "Regularizacion puntual: liberacion de ocupacion omitida al cierre original de ANEXO_26.",
    datos: {
      asignacion: idValue(asignacion._id),
      plaza: idValue(plaza._id),
      alojamiento: idValue(alojamiento._id),
      alojado: idValue(usuario._id),
    },
  });
  documento.historialEstados = Array.isArray(documento.historialEstados) ? documento.historialEstados : [];
  documento.historialEstados.push({
    fecha: now,
    estadoAnterior: "CERRADO",
    estadoNuevo: "CERRADO",
    realizadoPor: actorId,
    rolActor: "ADMIN_GENERAL",
    observacion: `${ACCION}: liberacion de ocupacion regularizada sin reabrir documento.`,
  });
  documento.actualizadoPor = actorId;
  await documento.save({ session });
}

function print(label, payload) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const args = parseArgs(process.argv);
  validarArgs(args);

  const uri = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGO_URI/MONGO_URL/MONGODB_URI.");

  await mongoose.connect(uri);
  console.log(`[regularizar-anexo26] DB: ${mongoose.connection.name}`);
  console.log(`[regularizar-anexo26] Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);

  if (!args.apply) {
    const caso = await cargarCaso(args.id);
    const errores = validarCaso(caso);
    print("Diagnostico", resumenCaso(caso));
    print("Validaciones", { ok: errores.length === 0, errores });
    print("Acciones previstas", accionesPrevistas(caso));
    console.log("\nDRY-RUN: no se modifico ningun dato.");
    if (errores.length) process.exitCode = 2;
    return;
  }

  const session = await AlojamientoDocumento.startSession();
  try {
    let resumen = null;
    await session.withTransaction(async () => {
      const caso = await cargarCaso(args.id, session);
      const errores = validarCaso(caso);
      if (errores.length) throw new Error(`Validacion fallida: ${errores.join(" | ")}`);
      await aplicarRegularizacion(caso, session);
      resumen = resumenCaso(caso);
    });

    console.log("[regularizar-anexo26] APPLY_OK");
    print("Resultado", resumen);
  } finally {
    session.endSession();
  }
}

main()
  .catch((err) => {
    console.error("[regularizar-anexo26] ERROR:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  });
