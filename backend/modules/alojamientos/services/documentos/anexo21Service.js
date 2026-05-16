const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const { agregarInterviniente, registrarCambioEstado, up } = require("./alojamientoDocumentoStateService");
const { validateAnexo21Datos } = require("../../validators/documentos/anexo21Validator");

const CODIGO = "ANEXO_21";
const ESTADOS_BLOQUEANTES = ["BORRADOR", "ENVIADO", "EN_REVISION"];
const CAMPOS_OFICIALES_ANEXO_21 = new Set([
  "lugar",
  "fechaLugar",
  "autoridadAsignacion",
  "zonaNaval",
  "organismoAdministrador",
  "mr",
  "afiliadoIOSFA",
  "gradoEscalafon",
  "apellido",
  "nombres",
  "destinoActual",
  "destinoFuturo",
  "telefonoActual",
  "telefonoFuturo",
  "fechaUltimoAscenso",
  "aniosServicioRecibo",
  "aceptaCondicionesReglamento",
  "agregaFidofac",
  "tieneProblemasSocioeconomicos",
  "oficioProblemasSocioeconomicos",
  "declaradoIneptoDGPN",
  "agregaIndiceTitularidad",
  "representantes",
  "aceptaDecisionRepresentante",
  "autorizaDescuentoHaberes",
  "autorizaAdministracionExpensas",
  "fechaEstimadaTrasladoZona",
  "agregados",
]);

function isPostulante(user) {
  return up(user?.role) === "POSTULANTE";
}

function isOwner(documento, user) {
  return String(documento?.solicitante || "") === String(user?._id || "");
}

function toResponse(documento) {
  const doc = documento?.toObject ? documento.toObject() : documento;
  return {
    _id: doc._id,
    codigo: doc.codigo,
    estado: doc.estado,
    estadoInstitucional: doc.estadoInstitucional || null,
    datos: doc.datos && typeof doc.datos === "object" ? doc.datos : {},
    historialEstados: Array.isArray(doc.historialEstados) ? doc.historialEstados : [],
    intervinientes: Array.isArray(doc.intervinientes) ? doc.intervinientes : [],
    solicitante: doc.solicitante || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function mergePreservandoLegacy(actual, oficiales) {
  const base = actual && typeof actual === "object" && !Array.isArray(actual) ? { ...actual } : {};

  for (const key of CAMPOS_OFICIALES_ANEXO_21) {
    delete base[key];
  }

  return {
    ...base,
    ...oficiales,
  };
}

async function findSolicitudActiva(solicitanteId) {
  return AlojamientoDocumento.findOne({
    codigo: CODIGO,
    solicitante: solicitanteId,
    activo: { $ne: false },
    estado: { $in: ESTADOS_BLOQUEANTES },
  }).sort({ updatedAt: -1, createdAt: -1 });
}

async function crearBorrador({ user, datos }) {
  if (!isPostulante(user)) {
    return { ok: false, status: 404, code: "NO_AUTORIZADO" };
  }

  const validated = validateAnexo21Datos(datos, { requireComplete: false, rejectUnknown: true });
  if (!validated.ok) {
    return { ok: false, status: 400, code: "DATOS_INVALIDOS" };
  }

  const existente = await findSolicitudActiva(user._id);
  if (existente) {
    return { ok: false, status: 409, code: "SOLICITUD_ACTIVA_EXISTENTE" };
  }

  const documento = new AlojamientoDocumento({
    codigo: CODIGO,
    estado: "BORRADOR",
    datos: validated.value,
    solicitante: user._id,
    creadoPor: user._id,
    actualizadoPor: user._id,
  });

  agregarInterviniente(documento, user._id, "POSTULANTE");
  documento.cambiarEstado("BORRADOR", user._id, "Creacion de solicitud ANEXO_21", "POSTULANTE");

  await documento.save();
  return { ok: true, status: 201, documento: toResponse(documento) };
}

async function actualizarBorrador({ id, user, datos }) {
  if (!isPostulante(user)) {
    return { ok: false, status: 404, code: "NO_AUTORIZADO" };
  }

  const validated = validateAnexo21Datos(datos, { requireComplete: false, rejectUnknown: true });
  if (!validated.ok) {
    return { ok: false, status: 400, code: "DATOS_INVALIDOS" };
  }

  const documento = await AlojamientoDocumento.findById(id);
  if (!documento || documento.activo === false || documento.codigo !== CODIGO) {
    return { ok: false, status: 404, code: "NO_DISPONIBLE" };
  }
  if (!isOwner(documento, user) || up(documento.estado) !== "BORRADOR") {
    return { ok: false, status: 404, code: "NO_DISPONIBLE" };
  }

  documento.datos = mergePreservandoLegacy(documento.datos, validated.value);
  documento.actualizadoPor = user._id;
  documento.markModified("datos");
  await documento.save();

  return { ok: true, status: 200, documento: toResponse(documento) };
}

async function enviarBorrador({ id, user }) {
  if (!isPostulante(user)) {
    return { ok: false, status: 404, code: "NO_AUTORIZADO" };
  }

  const documento = await AlojamientoDocumento.findById(id);
  if (!documento || documento.activo === false || documento.codigo !== CODIGO) {
    return { ok: false, status: 404, code: "NO_DISPONIBLE" };
  }
  if (!isOwner(documento, user) || up(documento.estado) !== "BORRADOR") {
    return { ok: false, status: 404, code: "NO_DISPONIBLE" };
  }

  const validated = validateAnexo21Datos(documento.datos, {
    requireComplete: true,
    rejectUnknown: false,
  });
  if (!validated.ok) {
    return { ok: false, status: 400, code: "DATOS_INVALIDOS" };
  }

  documento.datos = mergePreservandoLegacy(documento.datos, validated.value);
  documento.markModified("datos");

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "ENVIADO",
    actorId: user._id,
    rolActor: "POSTULANTE",
    observacion: "Envio de solicitud ANEXO_21",
  });

  if (!transition.ok) {
    return { ok: false, status: 404, code: transition.error };
  }

  documento.actualizadoPor = user._id;
  await documento.save();

  return { ok: true, status: 200, documento: toResponse(documento) };
}

module.exports = {
  crearBorrador,
  actualizarBorrador,
  enviarBorrador,
};
