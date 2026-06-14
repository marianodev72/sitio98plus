const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const AlojamientoPlaza = require("../../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../../models/AsignacionAlojamiento");
const { validarDisponibilidadPlaza } = require("../alojamientoAsignacionService");
const {
  agregarInterviniente,
  registrarConformidad,
  registrarCambioEstado,
  up,
} = require("./alojamientoDocumentoStateService");
const { sanitizeDatosDocumento } = require("./alojamientoDocumentoSanitizer");

const ESTADOS_ORIGEN_VALIDOS = ["ENVIADO", "EN_REVISION"];

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function publicError(status, code = "NO_DISPONIBLE") {
  const message =
    code === "ANEXO_21_NO_APROBADO"
      ? "La solicitud debe estar aprobada por ADMIN_GENERAL antes de generar ANEXO_22."
      : "No es posible generar el ANEXO_22 en este momento.";

  return {
    ok: false,
    status,
    code,
    message,
  };
}

function nombreUsuario(user = {}) {
  const apellido = String(user.apellido || "").trim();
  const nombre = String(user.nombre || user.nombres || "").trim();
  const completo = [apellido, nombre].filter(Boolean).join(", ");
  return completo || String(user.email || user.username || user._id || "Usuario").trim();
}

function isTitularOInterviniente(documento, user) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;

  if (String(documento.solicitante || "") === userId) return true;
  if (String(documento.alojado || "") === userId) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => String(item?.userId || "") === userId);
}

function tieneConformidadPostulante(documento, user) {
  const userId = String(user?._id || "");
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some(
    (item) => up(item?.tipo) === "POSTULANTE" && String(item?.usuario || "") === userId
  );
}

function tieneConformidadOk(documento, tipo) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some((item) => up(item?.tipo) === tipoUp && item?.ok === true);
}

function tieneAprobacionFormalAnexo21(documento) {
  return (
    up(documento?.estadoInstitucional) === "APROBADO_ADMIN_GENERAL" ||
    up(documento?.datos?.resultadoPostulacion) === "APROBADO"
  );
}

function upsertSignerPostulante(documento, user, fecha) {
  documento.signers = Array.isArray(documento.signers) ? documento.signers : [];

  const userId = String(user?._id || "");
  const index = documento.signers.findIndex(
    (item) => up(item?.tipo) === "POSTULANTE" && String(item?.usuario || "") === userId
  );

  const signer = {
    tipo: "POSTULANTE",
    usuario: user._id,
    nombre: nombreUsuario(user),
    rol: "POSTULANTE",
    fecha,
    fuente: "CONFORMIDAD_POSTULANTE",
  };

  if (index >= 0) documento.signers[index] = signer;
  else documento.signers.push(signer);
}

function upsertSignerAdminGeneral(documento, user, fecha) {
  documento.signers = Array.isArray(documento.signers) ? documento.signers : [];

  const userId = String(user?._id || "");
  const index = documento.signers.findIndex(
    (item) => up(item?.tipo) === "ADMIN_GENERAL" && String(item?.usuario || "") === userId
  );

  const signer = {
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    nombre: nombreUsuario(user),
    rol: "ADMIN_GENERAL",
    fecha,
    fuente: "CIERRE_ADMIN_GENERAL",
  };

  if (index >= 0) documento.signers[index] = signer;
  else documento.signers.push(signer);
}

function buildAsignacionCodigo(anexo21Id, plazaId) {
  const origen = String(anexo21Id || "").slice(-8);
  const plaza = String(plazaId || "").slice(-8);
  return `AN22-${origen}-${plaza}`.toUpperCase();
}

function nombreSolicitante(datos = {}) {
  const apellido = String(datos.apellido || "").trim();
  const nombres = String(datos.nombres || "").trim();
  return [apellido, nombres].filter(Boolean).join(", ");
}

function alojamientoSnapshot(alojamiento = {}) {
  return {
    alojamientoId: alojamiento._id,
    alojamientoCodigo: alojamiento.codigo,
    dependencia: alojamiento.dependencia,
    lugar: alojamiento.lugar,
    sector: alojamiento.sector,
    tipo: alojamiento.tipo,
    numero: alojamiento.numero,
    clase: alojamiento.clase,
    capacidad: alojamiento.capacidad,
    generoPermitido: alojamiento.generoPermitido,
  };
}

function plazaSnapshot(plaza = {}) {
  return {
    plazaId: plaza._id,
    plazaCodigo: plaza.codigo,
    numeroPlaza: plaza.numeroPlaza,
  };
}

function generoDesdeAnexo21(documento) {
  return up(documento?.datos?.genero || documento?.datos?.sexo);
}

function toResponse(documento) {
  if (!documento) return null;

  const raw = typeof documento.toObject === "function" ? documento.toObject() : documento;
  return {
    _id: raw._id,
    codigo: raw.codigo,
    estado: raw.estado,
    estadoInstitucional: raw.estadoInstitucional || null,
    datos: sanitizeDatosDocumento(raw.datos || {}),
    historialEstados: raw.historialEstados || [],
    intervenciones: raw.intervenciones || [],
    conformidades: raw.conformidades || [],
    signers: raw.signers || [],
    intervinientes: raw.intervinientes || [],
    derivadoDe: raw.derivadoDe || null,
    alojamiento: raw.alojamiento || null,
    plaza: raw.plaza || null,
    asignacion: raw.asignacion || null,
    solicitante: raw.solicitante || null,
    alojado: raw.alojado || null,
    inspector: raw.inspector || null,
    activo: raw.activo,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function findExistingAnexo22(anexo21Id) {
  return AlojamientoDocumento.findOne({
    codigo: "ANEXO_22",
    derivadoDe: anexo21Id,
    activo: { $ne: false },
  });
}

async function cleanupCreacion({ documentoId, asignacionId }) {
  await Promise.allSettled([
    documentoId ? AlojamientoDocumento.deleteOne({ _id: documentoId }) : Promise.resolve(),
    asignacionId ? AsignacionAlojamiento.deleteOne({ _id: asignacionId }) : Promise.resolve(),
  ]);
}

async function generarDesdeAnexo21({ id, plazaId, user }) {
  if (!isAdminGeneral(user)) return publicError(403, "NO_AUTORIZADO");
  if (!isObjectId(id) || !isObjectId(plazaId)) return publicError(400, "PAYLOAD_INVALIDO");

  const origen = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_21",
    activo: { $ne: false },
  });

  if (!origen || !ESTADOS_ORIGEN_VALIDOS.includes(up(origen.estado))) {
    return publicError(404, "ORIGEN_NO_DISPONIBLE");
  }

  const alojadoId = origen.solicitante || origen.alojado;
  if (!alojadoId || !isObjectId(alojadoId)) {
    return publicError(404, "ALOJADO_NO_DISPONIBLE");
  }

  const existente = await findExistingAnexo22(origen._id);
  if (existente) {
    if (String(existente.plaza || "") !== String(plazaId)) {
      return publicError(409, "ANEXO_22_YA_EXISTE");
    }
    return { ok: true, status: 200, documento: toResponse(existente) };
  }

  if (!tieneAprobacionFormalAnexo21(origen)) {
    return publicError(409, "ANEXO_21_NO_APROBADO");
  }

  const disponibilidad = await validarDisponibilidadPlaza({
    plazaId,
    alojadoId,
    generoDocumento: generoDesdeAnexo21(origen),
  });
  if (!disponibilidad?.puedeAsignar) {
    return publicError(404, "PLAZA_NO_DISPONIBLE");
  }

  const plaza = await AlojamientoPlaza.findById(plazaId).populate({
    path: "alojamiento",
    select:
      "codigo dependencia lugar sector tipo numero clase capacidad generoPermitido estado activo",
  });

  if (!plaza || !plaza.alojamiento) {
    return publicError(404, "PLAZA_NO_DISPONIBLE");
  }

  const now = new Date();
  let asignacion = null;
  let documento = null;

  try {
    asignacion = await AsignacionAlojamiento.create({
      codigo: buildAsignacionCodigo(origen._id, plaza._id),
      alojamiento: plaza.alojamiento._id,
      plaza: plaza._id,
      alojado: alojadoId,
      estado: "RESERVADA",
      origen: "ANEXO_22",
      fechaReserva: now,
      observaciones: "Reserva generada desde ANEXO_22.",
      creadoPor: user._id,
      actualizadoPor: user._id,
      auditoria: [
        {
          fecha: now,
          accion: "RESERVA_ANEXO_22",
          actor: user._id,
          estadoNuevo: "RESERVADA",
          observacion: "Reserva generada desde ANEXO_21.",
        },
      ],
    });

    documento = new AlojamientoDocumento({
      codigo: "ANEXO_22",
      derivadoDe: origen._id,
      alojamiento: plaza.alojamiento._id,
      plaza: plaza._id,
      asignacion: asignacion._id,
      solicitante: origen.solicitante || null,
      alojado: alojadoId,
      creadoPor: user._id,
      actualizadoPor: user._id,
      datos: {
        anexo21Id: origen._id,
        tipoSolicitud: origen.datos?.tipoSolicitud || null,
        postulanteNombre: nombreSolicitante(origen.datos),
        genero: generoDesdeAnexo21(origen) || null,
        mr: origen.datos?.mr || null,
        gradoEscalafon: origen.datos?.gradoEscalafon || null,
        destinoActual: origen.datos?.destinoActual || null,
        destinoFuturo: origen.datos?.destinoFuturo || null,
        asignacionId: asignacion._id,
        fechaReserva: now,
        ...alojamientoSnapshot(plaza.alojamiento),
        ...plazaSnapshot(plaza),
      },
    });

    agregarInterviniente(documento, alojadoId, "ALOJADO");
    agregarInterviniente(documento, user._id, "ADMIN_GENERAL");
    registrarCambioEstado(documento, {
      estadoNuevo: "ENVIADO",
      actorId: user._id,
      rolActor: "ADMIN_GENERAL",
      observacion: "ANEXO_22 generado desde ANEXO_21.",
    });

    await documento.save();

    const updatePlaza = await AlojamientoPlaza.updateOne(
      {
        _id: plaza._id,
        activo: { $ne: false },
        estado: "LIBRE",
        alojadoActual: null,
        $or: [{ reservaActual: null }, { "reservaActual.usuario": null }],
      },
      {
        $set: {
          estado: "RESERVADA",
          reservaActual: {
            usuario: alojadoId,
            anexoId: documento._id,
            fechaReserva: now,
            venceEn: null,
          },
        },
        $push: {
          historial: {
            fecha: now,
            accion: "RESERVA_ANEXO_22",
            alojado: alojadoId,
            estadoAnterior: "LIBRE",
            estadoNuevo: "RESERVADA",
            anexoId: documento._id,
            realizadoPor: user._id,
            observacion: "Reserva generada desde ANEXO_22.",
          },
        },
      }
    );

    if (updatePlaza.modifiedCount !== 1) {
      await cleanupCreacion({ documentoId: documento._id, asignacionId: asignacion._id });
      return publicError(409, "PLAZA_NO_DISPONIBLE");
    }

    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch (err) {
    await cleanupCreacion({
      documentoId: documento?._id,
      asignacionId: asignacion?._id,
    });

    if (err?.code === 11000) {
      const duplicado = await findExistingAnexo22(origen._id);
      if (duplicado && String(duplicado.plaza || "") === String(plazaId)) {
        return { ok: true, status: 200, documento: toResponse(duplicado) };
      }
      return publicError(409, "DUPLICADO");
    }

    return publicError(500, "ERROR_INTERNO");
  }
}

async function conformidadPostulante({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_AUTORIZADO");
  if (up(user?.role) !== "POSTULANTE") return publicError(404, "NO_AUTORIZADO");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_22",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (up(documento.estado) !== "ENVIADO") return publicError(404, "ESTADO_NO_DISPONIBLE");
  if (!isTitularOInterviniente(documento, user)) return publicError(404, "NO_AUTORIZADO");
  if (tieneConformidadPostulante(documento, user)) return publicError(409, "CONFORMIDAD_EXISTENTE");

  const fecha = new Date();
  const conformidad = registrarConformidad(documento, {
    tipo: "POSTULANTE",
    usuario: user._id,
    rol: "POSTULANTE",
    ok: true,
    observacion: "",
  });

  if (!conformidad.ok) return publicError(404, "CONFORMIDAD_INVALIDA");

  upsertSignerPostulante(documento, user, fecha);
  documento.estadoInstitucional = "CONFORMADO_POSTULANTE";
  documento.actualizadoPor = user._id;

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "POSTULANTE",
    observacion: "Conformidad POSTULANTE ANEXO_22",
  });

  if (!transition.ok) return publicError(404, transition.error);

  await documento.save();
  return { ok: true, status: 200, documento: toResponse(documento) };
}

async function cerrarAnexo22({ id, user }) {
  if (!isAdminGeneral(user)) return publicError(403, "NO_AUTORIZADO");
  if (!isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_22",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (up(documento.estado) === "CERRADO") return publicError(409, "CIERRE_EXISTENTE");
  if (up(documento.estado) !== "EN_REVISION") return publicError(404, "ESTADO_NO_DISPONIBLE");
  if (!tieneConformidadOk(documento, "POSTULANTE")) {
    return publicError(404, "CONFORMIDAD_POSTULANTE_REQUERIDA");
  }
  if (tieneConformidadOk(documento, "ADMIN_GENERAL")) {
    return publicError(409, "CIERRE_EXISTENTE");
  }

  const fecha = new Date();
  const conformidad = registrarConformidad(documento, {
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    rol: "ADMIN_GENERAL",
    ok: true,
    observacion: "",
  });

  if (!conformidad.ok) return publicError(404, "CONFORMIDAD_INVALIDA");

  upsertSignerAdminGeneral(documento, user, fecha);
  documento.estadoInstitucional = "CERRADO_ADMIN_GENERAL";
  documento.actualizadoPor = user._id;

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "CERRADO",
    actorId: user._id,
    rolActor: "ADMIN_GENERAL",
    observacion: "Cierre ADMIN_GENERAL ANEXO_22",
  });

  if (!transition.ok) return publicError(404, transition.error);

  await documento.save();
  return { ok: true, status: 200, documento: toResponse(documento) };
}

module.exports = {
  generarDesdeAnexo21,
  conformidadPostulante,
  cerrarAnexo22,
};
