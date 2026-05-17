const mongoose = require("mongoose");

const { User } = require("../../../models/user");
const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");

const ESTADOS_ASIGNACION_BLOQUEANTES = ["RESERVADA", "ACTIVA"];
const ESTADOS_ALOJAMIENTO_NO_ASIGNABLES = ["MANTENIMIENTO", "FUERA_SERVICIO", "INHABILITADO", "BAJA"];
const ROLES_NO_ELEGIBLES = ["ADMIN_GENERAL", "ADMIN"];

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function publicReason(code, message) {
  return { code, message };
}

function extractGeneroUsuario(user) {
  const candidates = [
    user?.generoDocumento,
    user?.genero,
    user?.sexo,
    user?.meta?.generoDocumento,
    user?.meta?.genero,
    user?.meta?.sexo,
    user?.meta?.generoDeclarado,
    user?.meta?.sexoDeclarado,
  ];

  return up(candidates.find((value) => up(value)) || "");
}

function validarCompatibilidadGenero(alojamiento, usuario) {
  const permitido = up(alojamiento?.generoPermitido);
  if (permitido === "SIN_RESTRICCION") return null;
  if (permitido === "NO_ESPECIFICADO") {
    return publicReason(
      "GENERO_NO_ESPECIFICADO",
      "El alojamiento no tiene restriccion operativa de genero definida"
    );
  }

  const generoUsuario = extractGeneroUsuario(usuario);
  if (!generoUsuario) {
    return publicReason(
      "GENERO_USUARIO_NO_DISPONIBLE",
      "No hay dato de genero suficiente para validar compatibilidad"
    );
  }

  if (generoUsuario !== permitido) {
    return publicReason("GENERO_INCOMPATIBLE", "El usuario no es compatible con la restriccion operativa");
  }

  return null;
}

function validarUsuarioElegible(usuario) {
  if (!usuario) return publicReason("USUARIO_NO_DISPONIBLE", "Usuario no disponible");
  if (usuario.activo === false || usuario.bloqueado === true || usuario.archivado === true) {
    return publicReason("USUARIO_NO_ELEGIBLE", "Usuario no elegible");
  }
  if (ROLES_NO_ELEGIBLES.includes(up(usuario.role))) {
    return publicReason("ROL_NO_ELEGIBLE", "Rol no elegible para alojamiento");
  }
  return null;
}

async function validarDisponibilidadPlaza({ plazaId, alojadoId, generoDocumento }) {
  const reasons = [];

  if (!isObjectId(plazaId)) {
    reasons.push(publicReason("PLAZA_INVALIDA", "Plaza no disponible"));
  }
  if (!isObjectId(alojadoId)) {
    reasons.push(publicReason("USUARIO_INVALIDO", "Usuario no disponible"));
  }
  if (reasons.length) {
    return { ok: false, puedeAsignar: false, reasons };
  }

  const [plaza, usuario, asignacionPlaza, asignacionUsuario] = await Promise.all([
    AlojamientoPlaza.findById(plazaId).lean(),
    User.findById(alojadoId)
      .select("_id role estadoHabitacional activo bloqueado archivado alojamientoAsignado genero sexo meta")
      .lean(),
    AsignacionAlojamiento.findOne({
      plaza: plazaId,
      estado: { $in: ESTADOS_ASIGNACION_BLOQUEANTES },
    })
      .select("_id estado")
      .lean(),
    AsignacionAlojamiento.findOne({
      alojado: alojadoId,
      estado: { $in: ESTADOS_ASIGNACION_BLOQUEANTES },
    })
      .select("_id estado")
      .lean(),
  ]);

  if (!plaza) {
    reasons.push(publicReason("PLAZA_NO_DISPONIBLE", "Plaza no disponible"));
  }
  if (!usuario) {
    reasons.push(publicReason("USUARIO_NO_DISPONIBLE", "Usuario no disponible"));
  }

  if (plaza) {
    if (plaza.activo === false) reasons.push(publicReason("PLAZA_INACTIVA", "Plaza no disponible"));
    if (up(plaza.estado) !== "LIBRE") reasons.push(publicReason("PLAZA_NO_LIBRE", "Plaza no libre"));
    if (plaza.alojadoActual) reasons.push(publicReason("PLAZA_CON_ALOJADO", "Plaza no libre"));
    if (plaza.reservaActual?.usuario) reasons.push(publicReason("PLAZA_RESERVADA", "Plaza no libre"));
    if (asignacionPlaza) reasons.push(publicReason("PLAZA_CON_ASIGNACION", "Plaza no libre"));
  }

  const usuarioParaCompatibilidad = usuario
    ? {
        ...usuario,
        generoDocumento: up(generoDocumento),
      }
    : usuario;

  const usuarioReason = validarUsuarioElegible(usuario);
  if (usuarioReason) reasons.push(usuarioReason);
  if (asignacionUsuario) {
    reasons.push(publicReason("USUARIO_CON_ASIGNACION", "Usuario con asignacion vigente"));
  }

  let alojamiento = null;
  if (plaza?.alojamiento) {
    alojamiento = await AlojamientoNaval.findById(plaza.alojamiento).lean();
    if (!alojamiento) {
      reasons.push(publicReason("ALOJAMIENTO_NO_DISPONIBLE", "Alojamiento no disponible"));
    } else {
      if (alojamiento.activo === false) {
        reasons.push(publicReason("ALOJAMIENTO_INACTIVO", "Alojamiento no disponible"));
      }
      if (ESTADOS_ALOJAMIENTO_NO_ASIGNABLES.includes(up(alojamiento.estado))) {
        reasons.push(publicReason("ALOJAMIENTO_ESTADO_NO_ASIGNABLE", "Alojamiento no asignable"));
      }

      const generoReason = validarCompatibilidadGenero(alojamiento, usuarioParaCompatibilidad);
      if (generoReason) reasons.push(generoReason);
    }
  }

  return {
    ok: reasons.length === 0,
    puedeAsignar: reasons.length === 0,
    reasons,
    contexto: {
      plaza: plaza ? { id: String(plaza._id), codigo: plaza.codigo, estado: plaza.estado } : null,
      alojamiento: alojamiento
        ? {
            id: String(alojamiento._id),
            codigo: alojamiento.codigo,
            estado: alojamiento.estado,
            generoPermitido: alojamiento.generoPermitido,
          }
        : null,
      usuario: usuario ? { id: String(usuario._id), role: usuario.role, estadoHabitacional: usuario.estadoHabitacional } : null,
    },
  };
}

async function dryRunAsignacion({ plazaId, alojadoId, origen = "MANUAL_ADMIN" }) {
  const result = await validarDisponibilidadPlaza({ plazaId, alojadoId });

  return {
    ok: true,
    dryRun: true,
    puedeAsignar: result.puedeAsignar,
    origen: up(origen) || "MANUAL_ADMIN",
    reasons: result.reasons,
    contexto: result.contexto,
  };
}

module.exports = {
  validarDisponibilidadPlaza,
  dryRunAsignacion,
};
