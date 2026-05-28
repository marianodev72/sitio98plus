const mongoose = require("mongoose");

const Anexo15Reintegro = require("../models/Anexo15Reintegro");
const Vivienda = require("../models/vivienda");
const { User } = require("../models/user");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");
const {
  ANEXO15_TRANSICIONES,
} = require("../constants/anexo15Constants");
const {
  sanitizeAnexo15Datos,
  sanitizeObservacion,
  trimText,
} = require("../validators/anexo15Validator");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function deny(status = 404, code = "NO_DISPONIBLE") {
  return { ok: false, status, code };
}

function nombreUsuario(user) {
  if (!user) return "";
  return [user.apellido, user.nombre || user.nombres].filter(Boolean).join(" ").trim() ||
    String(user.email || "").trim();
}

function actorSnapshot(user, rol = "") {
  return {
    nombre: nombreUsuario(user) || "Usuario",
    rol: up(rol || user?.role),
  };
}

function isSolicitanteRole(user) {
  return ["PERMISIONARIO", "ALOJADO"].includes(up(user?.role));
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function isInspectorTerritorial(user) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return role === "INSPECTOR" || (role === "PERMISIONARIO" && permisos.includes("INSPECTOR"));
}

function barrioInspector(user) {
  return String(user?.barrioAsignado || "").trim();
}

function canInspect(user, doc) {
  if (!isInspectorTerritorial(user)) return false;
  const barrio = barrioInspector(user);
  if (!barrio) return false;
  return up(doc?.datos?.viviendaSnapshot?.barrio) === up(barrio);
}

function canTransition(current, next) {
  return (ANEXO15_TRANSICIONES[up(current)] || []).includes(up(next));
}

function pushInterviniente(doc, user, rol) {
  const userId = String(user?._id || user?.id || "");
  if (!userId || !isObjectId(userId)) return;
  doc.intervinientes = Array.isArray(doc.intervinientes) ? doc.intervinientes : [];
  const rolUp = up(rol);
  const exists = doc.intervinientes.some(
    (item) => String(item.userId || "") === userId && up(item.rol) === rolUp
  );
  if (!exists) {
    doc.intervinientes.push({ userId, rol: rolUp, nombre: nombreUsuario(user) });
  }
}

function changeState(doc, estadoNuevo, user, observacion = "", rol = "") {
  const estadoAnterior = up(doc.estado || "BORRADOR");
  const next = up(estadoNuevo);
  if (!canTransition(estadoAnterior, next)) return false;
  doc.estado = next;
  doc.estadoInstitucional = next;
  doc.historialEstados.push({
    estadoAnterior,
    estadoNuevo: next,
    observacion,
    realizadoPor: user?._id || user?.id || null,
    actorSnapshot: actorSnapshot(user, rol),
  });
  return true;
}

function publicAdjunto(adjunto) {
  return {
    id: adjunto.id,
    campo: adjunto.campo,
    nombreOriginal: adjunto.nombreOriginal,
    mime: adjunto.mime,
    size: adjunto.size,
    sha256: adjunto.sha256,
    fechaSubida: adjunto.fechaSubida,
    subidoPor: adjunto.subidoPorSnapshot || null,
  };
}

function toPublic(doc) {
  const raw = doc?.toObject ? doc.toObject() : doc;
  if (!raw) return null;
  return {
    token: raw.publicToken,
    codigo: "ANEXO_15",
    estado: raw.estado,
    estadoInstitucional: raw.estadoInstitucional || raw.estado,
    solicitanteRol: raw.solicitanteRol,
    datos: raw.datos || {},
    adjuntos: Array.isArray(raw.adjuntos) ? raw.adjuntos.map(publicAdjunto) : [],
    historialEstados: (raw.historialEstados || []).map((item) => ({
      fecha: item.fecha,
      estadoAnterior: item.estadoAnterior,
      estadoNuevo: item.estadoNuevo,
      observacion: item.observacion,
      actor: item.actorSnapshot || null,
    })),
    intervenciones: (raw.intervenciones || []).map((item) => ({
      fecha: item.fecha,
      tipo: item.tipo,
      observacion: item.observacion,
      resultado: item.resultado,
      actor: item.actorSnapshot || null,
    })),
    intervinientes: (raw.intervinientes || []).map((item) => ({
      rol: item.rol,
      nombre: item.nombre,
    })),
    signers: (raw.signers || []).map((item) => ({
      tipo: item.tipo,
      nombre: item.nombre,
      rol: item.rol,
      fecha: item.fecha,
      fuente: item.fuente,
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    canEditar: ["BORRADOR", "DEVUELTO_A_SOLICITANTE"].includes(up(raw.estado)),
    canEnviar: ["BORRADOR", "DEVUELTO_A_SOLICITANTE"].includes(up(raw.estado)),
    canAnular: ["BORRADOR", "DEVUELTO_A_SOLICITANTE"].includes(up(raw.estado)),
    canPdf: up(raw.estado) !== "BORRADOR",
  };
}

function viviendaSnapshot(vivienda) {
  if (!vivienda) return null;
  return {
    codigo: String(vivienda.codigo || "").trim(),
    barrio: String(vivienda.barrio || "").trim(),
    dormitorios: vivienda.dormitorios ?? null,
    estado: String(vivienda.estado || "").trim(),
  };
}

function alojamientoSnapshot(asignacion) {
  const alojamiento = asignacion?.alojamiento || null;
  const plaza = asignacion?.plaza || null;
  if (!alojamiento && !plaza) return null;
  return {
    codigo: String(alojamiento?.codigo || "").trim(),
    lugar: String(alojamiento?.lugar || "").trim(),
    dependencia: String(alojamiento?.dependencia || "").trim(),
    sector: String(alojamiento?.sector || "").trim(),
    tipo: String(alojamiento?.tipo || "").trim(),
    clase: String(alojamiento?.clase || "").trim(),
    plaza: plaza?.numeroPlaza ?? null,
  };
}

async function buildSnapshots(reqUser) {
  const user = await User.findById(reqUser._id)
    .select("nombre apellido email dni matricula telefono role viviendaAsignada alojamientoAsignado barrioAsignado")
    .lean();
  if (!user) return null;

  const solicitanteSnapshot = {
    nombre: nombreUsuario(user),
    rol: up(reqUser.role),
    dni: String(user.dni || "").trim(),
    matricula: String(user.matricula || "").trim(),
    telefono: String(user.telefono || "").trim(),
    email: String(user.email || "").trim(),
  };

  if (up(reqUser.role) === "PERMISIONARIO") {
    const viviendaId = reqUser.viviendaAsignada || user.viviendaAsignada;
    const vivienda = viviendaId ? await Vivienda.findById(viviendaId).lean() : null;
    if (!vivienda) return null;
    return {
      user,
      viviendaId,
      asignacionId: null,
      datosBase: {
        solicitanteSnapshot,
        viviendaSnapshot: viviendaSnapshot(vivienda),
        alojamientoSnapshot: null,
      },
    };
  }

  const asignacion = await AsignacionAlojamiento.findOne({
    alojado: reqUser._id,
    estado: "ACTIVA",
  })
    .populate({ path: "alojamiento", select: "codigo lugar dependencia sector tipo clase" })
    .populate({ path: "plaza", select: "numeroPlaza" })
    .lean();

  if (!asignacion) return null;
  const alojamiento = asignacion.alojamiento || {};
  return {
    user,
    viviendaId: null,
    asignacionId: asignacion._id,
    datosBase: {
      solicitanteSnapshot,
      viviendaSnapshot: {
        codigo: String(alojamiento.codigo || "").trim(),
        barrio: String(alojamiento.lugar || "").trim(),
        estado: "ALOJAMIENTO_NAVAL",
      },
      alojamientoSnapshot: alojamientoSnapshot(asignacion),
    },
  };
}

async function crear({ user, datos }) {
  if (!isSolicitanteRole(user)) return deny();
  const sanitized = sanitizeAnexo15Datos(datos);
  if (!sanitized.ok) return deny(400, sanitized.code);
  const snapshots = await buildSnapshots(user);
  if (!snapshots) return deny(404, "VIVIENDA_NO_DISPONIBLE");

  const doc = new Anexo15Reintegro({
    solicitante: user._id,
    solicitanteRol: up(user.role),
    vivienda: snapshots.viviendaId,
    asignacionAlojamiento: snapshots.asignacionId,
    datos: { ...snapshots.datosBase, solicitud: sanitized.value },
    creadoPor: user._id,
    actualizadoPor: user._id,
  });
  pushInterviniente(doc, snapshots.user, up(user.role));
  doc.historialEstados.push({
    estadoNuevo: "BORRADOR",
    observacion: "Creacion de solicitud ANEXO_15.",
    realizadoPor: user._id,
    actorSnapshot: actorSnapshot(snapshots.user, user.role),
  });
  doc.intervenciones.push({
    tipo: "CREACION",
    resultado: "BORRADOR",
    observacion: "Solicitud creada.",
    actor: user._id,
    actorSnapshot: actorSnapshot(snapshots.user, user.role),
  });
  await doc.save();
  return { ok: true, status: 201, documento: toPublic(doc) };
}

async function loadByToken(token, includePrivate = false) {
  const q = Anexo15Reintegro.findOne({ publicToken: token, activo: { $ne: false } });
  if (includePrivate) q.select("+adjuntos.path +adjuntos.storageKey");
  return q;
}

function canView(user, doc) {
  if (!user || !doc) return false;
  if (isAdminGeneral(user)) return true;
  if (canInspect(user, doc)) return true;
  return String(doc.solicitante || "") === String(user._id || user.id || "");
}

async function obtener({ token, user }) {
  const doc = await loadByToken(token);
  if (!doc || !canView(user, doc)) return deny();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function listarMis({ user }) {
  if (!isSolicitanteRole(user)) return deny();
  const docs = await Anexo15Reintegro.find({
    solicitante: user._id,
    activo: { $ne: false },
  }).sort({ updatedAt: -1 }).limit(100);
  return { ok: true, status: 200, documentos: docs.map(toPublic) };
}

async function listarInspector({ user }) {
  if (!isInspectorTerritorial(user) || !barrioInspector(user)) return deny();
  const docs = await Anexo15Reintegro.find({
    "datos.viviendaSnapshot.barrio": barrioInspector(user),
    estado: { $in: ["ENVIADO", "DEVUELTO_A_INSPECTOR"] },
    activo: { $ne: false },
  }).sort({ updatedAt: -1 }).limit(200);
  return { ok: true, status: 200, documentos: docs.map(toPublic) };
}

async function listarAdmin({ user }) {
  if (!isAdminGeneral(user)) return deny();
  const docs = await Anexo15Reintegro.find({
    estado: { $in: ["APROBADO_INSPECTOR", "APROBADO_ADMIN_GENERAL", "FINALIZADO", "RECHAZADO"] },
    activo: { $ne: false },
  }).sort({ updatedAt: -1 }).limit(300);
  return { ok: true, status: 200, documentos: docs.map(toPublic) };
}

async function actualizar({ token, user, datos }) {
  const doc = await loadByToken(token);
  if (!doc || String(doc.solicitante) !== String(user._id)) return deny();
  if (!["BORRADOR", "DEVUELTO_A_SOLICITANTE"].includes(up(doc.estado))) return deny(409, "ESTADO_INVALIDO");
  const sanitized = sanitizeAnexo15Datos(datos);
  if (!sanitized.ok) return deny(400, sanitized.code);
  doc.datos = { ...(doc.datos || {}), solicitud: sanitized.value };
  doc.actualizadoPor = user._id;
  doc.intervenciones.push({
    tipo: "ACTUALIZACION",
    resultado: up(doc.estado),
    observacion: "Actualizacion de solicitud.",
    actor: user._id,
    actorSnapshot: actorSnapshot(await User.findById(user._id).select("nombre apellido role").lean(), user.role),
  });
  doc.markModified("datos");
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function enviar({ token, user }) {
  const doc = await loadByToken(token);
  if (!doc || String(doc.solicitante) !== String(user._id)) return deny();
  const sanitized = sanitizeAnexo15Datos(doc.datos?.solicitud || {}, { requireContent: true });
  if (!sanitized.ok) return deny(400, sanitized.code);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "ENVIADO", dbUser, "Envio de solicitud ANEXO_15.", user.role)) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  doc.datos = { ...(doc.datos || {}), solicitud: sanitized.value };
  doc.signers.push({ tipo: up(user.role), nombre: nombreUsuario(dbUser), rol: up(user.role), fuente: "ENVIO_SOLICITANTE" });
  doc.intervenciones.push({
    tipo: "ENVIO",
    resultado: "ENVIADO",
    observacion: "Solicitud enviada.",
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, user.role),
  });
  doc.actualizadoPor = user._id;
  doc.markModified("datos");
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function anular({ token, user }) {
  const doc = await loadByToken(token);
  if (!doc || String(doc.solicitante) !== String(user._id)) return deny();
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "ANULADO", dbUser, "Anulacion por solicitante.", user.role)) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  doc.actualizadoPor = user._id;
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function inspectorDevolver({ token, user, payload }) {
  const doc = await loadByToken(token);
  if (!doc || !canInspect(user, doc)) return deny();
  const obs = sanitizeObservacion(payload);
  if (!obs.ok) return deny(400, obs.code);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "DEVUELTO_A_SOLICITANTE", dbUser, obs.observacion, "INSPECTOR")) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  pushInterviniente(doc, dbUser, "INSPECTOR");
  doc.intervenciones.push({
    tipo: "DEVOLUCION_SOLICITANTE",
    resultado: "DEVUELTO_A_SOLICITANTE",
    observacion: obs.observacion,
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, "INSPECTOR"),
  });
  doc.actualizadoPor = user._id;
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function inspectorAprobar({ token, user, payload }) {
  const doc = await loadByToken(token);
  if (!doc || !canInspect(user, doc)) return deny();
  const observacion = trimText(payload?.observacion || payload?.datos?.observacion || "", 1600);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "APROBADO_INSPECTOR", dbUser, observacion || "Aprobacion inspector.", "INSPECTOR")) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  pushInterviniente(doc, dbUser, "INSPECTOR");
  doc.signers.push({ tipo: "INSPECTOR", nombre: nombreUsuario(dbUser), rol: "INSPECTOR", fuente: "APROBACION_INSPECTOR" });
  doc.intervenciones.push({
    tipo: "APROBACION_INSPECTOR",
    resultado: "APROBADO_INSPECTOR",
    observacion,
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, "INSPECTOR"),
  });
  doc.actualizadoPor = user._id;
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function adminDevolver({ token, user, payload }) {
  if (!isAdminGeneral(user)) return deny();
  const doc = await loadByToken(token);
  if (!doc) return deny();
  const obs = sanitizeObservacion(payload);
  if (!obs.ok) return deny(400, obs.code);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "DEVUELTO_A_INSPECTOR", dbUser, obs.observacion, "ADMIN_GENERAL")) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  pushInterviniente(doc, dbUser, "ADMIN_GENERAL");
  doc.intervenciones.push({
    tipo: "DEVOLUCION_INSPECTOR",
    resultado: "DEVUELTO_A_INSPECTOR",
    observacion: obs.observacion,
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, "ADMIN_GENERAL"),
  });
  doc.actualizadoPor = user._id;
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function adminAprobar({ token, user, payload }) {
  if (!isAdminGeneral(user)) return deny();
  const doc = await loadByToken(token);
  if (!doc) return deny();
  const observacion = trimText(payload?.observacion || payload?.datos?.observacion || "", 1600);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  if (!changeState(doc, "APROBADO_ADMIN_GENERAL", dbUser, observacion || "Aprobacion ADMIN_GENERAL.", "ADMIN_GENERAL")) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  if (!changeState(doc, "FINALIZADO", dbUser, "Finalizacion de ANEXO_15.", "ADMIN_GENERAL")) {
    return deny(409, "TRANSICION_INVALIDA");
  }
  pushInterviniente(doc, dbUser, "ADMIN_GENERAL");
  doc.signers.push({ tipo: "ADMIN_GENERAL", nombre: nombreUsuario(dbUser), rol: "ADMIN_GENERAL", fuente: "FINALIZACION_ADMIN_GENERAL" });
  doc.intervenciones.push({
    tipo: "FINALIZACION",
    resultado: "FINALIZADO",
    observacion,
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, "ADMIN_GENERAL"),
  });
  doc.actualizadoPor = user._id;
  await doc.save();
  return { ok: true, status: 200, documento: toPublic(doc) };
}

module.exports = {
  up,
  deny,
  toPublic,
  canView,
  canInspect,
  loadByToken,
  crear,
  obtener,
  listarMis,
  listarInspector,
  listarAdmin,
  actualizar,
  enviar,
  anular,
  inspectorDevolver,
  inspectorAprobar,
  adminDevolver,
  adminAprobar,
  actorSnapshot,
  nombreUsuario,
};
