#!/usr/bin/env node

try {
  const path = require("path");
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  require("dotenv").config();
} catch {
  // dotenv puede no estar disponible en algunos entornos de ejecucion.
}

const mongoose = require("mongoose");

const AlojamientoDocumento = require("../modules/alojamientos/models/AlojamientoDocumento");
const AlojamientoPlaza = require("../modules/alojamientos/models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");
const { materializarAlojadoDesdeAnexo23 } = require("../modules/alojamientos/services/documentos/anexo23Service");
const { User } = require("../models/user");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--dry-run") args.dryRun = true;
    else if (item === "--apply") args.apply = true;
    else if (item === "--userId") {
      args.userId = argv[i + 1];
      i += 1;
    } else if (item === "--documentoId") {
      args.documentoId = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Parametro no reconocido: ${item}`);
    }
  }
  return args;
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function hasConformidad(documento, tipo) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some((item) => up(item?.tipo) === tipoUp && item?.ok === true);
}

function validarParametros(args) {
  const tieneUser = Boolean(args.userId);
  const tieneDocumento = Boolean(args.documentoId);
  if (tieneUser === tieneDocumento) {
    throw new Error("Debe indicar exactamente uno: --userId <id> o --documentoId <id>.");
  }
  if (args.dryRun === args.apply) {
    throw new Error("Debe indicar exactamente uno: --dry-run o --apply.");
  }
  if (args.userId && !isObjectId(args.userId)) throw new Error("userId invalido.");
  if (args.documentoId && !isObjectId(args.documentoId)) throw new Error("documentoId invalido.");
}

async function buscarDocumento(args, session = null) {
  const base = {
    codigo: "ANEXO_23",
    estado: "CERRADO",
    activo: { $ne: false },
  };
  const query = args.documentoId
    ? AlojamientoDocumento.find({ ...base, _id: args.documentoId })
    : AlojamientoDocumento.find({
        ...base,
        $or: [
          { alojado: args.userId },
          { solicitante: args.userId },
          { "intervinientes.userId": args.userId },
        ],
      }).sort({ updatedAt: -1, createdAt: -1 });

  if (session) query.session(session);
  const documentos = await query;

  if (documentos.length === 0) {
    throw new Error("No se encontro ANEXO_23 CERRADO para regularizar.");
  }
  if (documentos.length > 1) {
    const ids = documentos.map((doc) => idValue(doc._id)).join(", ");
    throw new Error(`Se encontraron multiples ANEXO_23 CERRADO. Use --documentoId. IDs: ${ids}`);
  }

  return documentos[0];
}

async function cargarRelacionado(documento, session = null) {
  const queryUser = User.findById(documento.alojado).select("+tokenVersion");
  const queryPlaza = AlojamientoPlaza.findById(documento.plaza);
  const queryAsignacion = AsignacionAlojamiento.findById(documento.asignacion);
  if (session) {
    queryUser.session(session);
    queryPlaza.session(session);
    queryAsignacion.session(session);
  }
  const [usuario, plaza, asignacion] = await Promise.all([queryUser, queryPlaza, queryAsignacion]);
  return { usuario, plaza, asignacion };
}

function resumenDocumento(documento) {
  return {
    _id: idValue(documento?._id),
    codigo: documento?.codigo,
    estado: documento?.estado,
    estadoInstitucional: documento?.estadoInstitucional || null,
    alojado: idValue(documento?.alojado),
    alojamiento: idValue(documento?.alojamiento),
    plaza: idValue(documento?.plaza),
    asignacion: idValue(documento?.asignacion),
    conformidadAlojado: hasConformidad(documento, "ALOJADO"),
    conformidadAdminGeneral: hasConformidad(documento, "ADMIN_GENERAL"),
  };
}

function resumenUsuario(usuario) {
  return usuario
    ? {
        _id: idValue(usuario._id),
        nombre: [usuario.apellido, usuario.nombre].filter(Boolean).join(", "),
        role: usuario.role,
        estadoHabitacional: usuario.estadoHabitacional,
        alojamientoAsignado: idValue(usuario.alojamientoAsignado),
        tokenVersion: usuario.tokenVersion,
      }
    : null;
}

function resumenPlaza(plaza) {
  return plaza
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
              fechaReserva: plaza.reservaActual.fechaReserva || null,
            }
          : null,
      }
    : null;
}

function resumenAsignacion(asignacion) {
  return asignacion
    ? {
        _id: idValue(asignacion._id),
        codigo: asignacion.codigo,
        estado: asignacion.estado,
        alojamiento: idValue(asignacion.alojamiento),
        plaza: idValue(asignacion.plaza),
        alojado: idValue(asignacion.alojado),
        fechaReserva: asignacion.fechaReserva || null,
        fechaInicio: asignacion.fechaInicio || null,
      }
    : null;
}

function accionesPrevistas({ documento, usuario, plaza, asignacion }) {
  const role = up(usuario?.role);
  const acciones = [];
  const yaMaterializado =
    role === "ALOJADO" &&
    up(usuario?.estadoHabitacional) === "ALOJADO_ACTIVO" &&
    idValue(usuario?.alojamientoAsignado) === idValue(documento.alojamiento) &&
    up(plaza?.estado) === "OCUPADA" &&
    idValue(plaza?.alojadoActual) === idValue(documento.alojado) &&
    !plaza?.reservaActual?.usuario &&
    up(asignacion?.estado) === "ACTIVA" &&
    Boolean(asignacion?.fechaInicio);

  if (yaMaterializado) {
    return ["SIN CAMBIOS: el ANEXO_23 ya se encuentra materializado."];
  }

  if (role === "POSTULANTE") acciones.push("Usuario.role: POSTULANTE -> ALOJADO");
  else if (role === "ALOJADO") acciones.push("Usuario.role: ALOJADO sin cambios");
  else acciones.push(`BLOQUEO: rol no migrable (${usuario?.role || "sin usuario"})`);

  acciones.push("Usuario.estadoHabitacional -> ALOJADO_ACTIVO");
  acciones.push(`Usuario.alojamientoAsignado -> ${idValue(documento.alojamiento)}`);
  acciones.push("Usuario.tokenVersion ++");
  acciones.push(`Plaza.estado: ${plaza?.estado || "-"} -> OCUPADA`);
  acciones.push(`Plaza.alojadoActual -> ${idValue(documento.alojado)}`);
  acciones.push("Plaza.reservaActual -> null");
  acciones.push(`Asignacion.estado: ${asignacion?.estado || "-"} -> ACTIVA`);
  acciones.push("Asignacion.fechaInicio: completar si esta vacia");
  return acciones;
}

function printPayload(label, payload) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const args = parseArgs(process.argv);
  validarParametros(args);

  const uri = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGO_URI/MONGO_URL/MONGODB_URI.");

  await mongoose.connect(uri);
  console.log(`[regularizar-anexo23] DB: ${mongoose.connection.name}`);

  if (args.dryRun) {
    const documento = await buscarDocumento(args);
    const relacionado = await cargarRelacionado(documento);
    printPayload("Documento", resumenDocumento(documento));
    printPayload("Usuario actual", resumenUsuario(relacionado.usuario));
    printPayload("Plaza actual", resumenPlaza(relacionado.plaza));
    printPayload("Asignacion actual", resumenAsignacion(relacionado.asignacion));
    printPayload("Acciones previstas", accionesPrevistas({ documento, ...relacionado }));
    console.log("\nDRY-RUN: no se modifico ningun dato.");
    return;
  }

  const session = await AlojamientoDocumento.startSession();
  try {
    let documentoId = null;
    let adminId = null;

    await session.withTransaction(async () => {
      const documento = await buscarDocumento(args, session);
      const admin = await User.findOne({
        role: "ADMIN_GENERAL",
        activo: { $ne: false },
        bloqueado: { $ne: true },
        archivado: { $ne: true },
      }).session(session);

      if (!admin) throw new Error("No se encontro ADMIN_GENERAL activo para registrar auditoria.");

      await materializarAlojadoDesdeAnexo23(documento, admin, {
        session,
        modoRegularizacion: true,
      });

      documentoId = idValue(documento._id);
      adminId = idValue(admin._id);
    });

    console.log("[regularizar-anexo23] APPLY_OK");
    console.log(JSON.stringify({ documentoId, auditoriaAdminGeneral: adminId }, null, 2));
  } finally {
    session.endSession();
  }
}

main()
  .catch((err) => {
    console.error("[regularizar-anexo23] ERROR:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
  });
