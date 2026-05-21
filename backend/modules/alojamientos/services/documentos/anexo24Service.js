const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const {
  agregarInterviniente,
  registrarCambioEstado,
  registrarConformidad,
  up,
} = require("./alojamientoDocumentoStateService");
const { sanitizeDatosDocumento } = require("./alojamientoDocumentoSanitizer");
const {
  puedeVerDocumento,
  isInspectorAlojamientos,
} = require("./alojamientoDocumentoVisibilityService");

const EDITABLE_TOP_LEVEL = new Set([
  "novedadesTexto",
  "observacionesInspector",
  "lugarFirma",
  "fechaFirma",
]);

function publicError(status, code = "NO_DISPONIBLE", message = "No es posible generar el ANEXO_24 en este momento.") {
  return { ok: false, status, code, message };
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id;
  return value;
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function canOperateAnexo24(user) {
  return isInspectorAlojamientos(user);
}

function stringValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function trimText(value, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function nombreDesdeUsuario(user) {
  if (!user || typeof user !== "object") return "";
  return stringValue([user.apellido, user.nombre || user.nombres].filter(Boolean).join(", "));
}

function snapshotAlojamiento(origen) {
  const datos = origen?.datos || {};
  const snapshot =
    datos.alojamientoSnapshot && typeof datos.alojamientoSnapshot === "object"
      ? datos.alojamientoSnapshot
      : {};
  const alojamiento = origen?.alojamiento && typeof origen.alojamiento === "object" ? origen.alojamiento : {};

  return {
    alojamientoCodigo: stringValue(snapshot.alojamientoCodigo, datos.alojamientoCodigo, alojamiento.codigo),
    edificio: stringValue(snapshot.edificio, datos.edificio, alojamiento.edificio, snapshot.sector, alojamiento.sector),
    predio: stringValue(snapshot.predio, datos.predio, alojamiento.predio, snapshot.lugar, alojamiento.lugar),
    lugar: stringValue(snapshot.lugar, datos.lugar, alojamiento.lugar),
    localidad: stringValue(snapshot.localidad, datos.localidad, alojamiento.localidad),
    provincia: stringValue(snapshot.provincia, datos.provincia, alojamiento.provincia),
    dependencia: stringValue(snapshot.dependencia, datos.dependencia, alojamiento.dependencia),
    sector: stringValue(snapshot.sector, datos.sector, alojamiento.sector),
    tipo: stringValue(snapshot.tipo, datos.tipo, alojamiento.tipo),
    clase: stringValue(snapshot.clase, datos.clase, alojamiento.clase),
  };
}

function snapshotPlaza(origen) {
  const datos = origen?.datos || {};
  const snapshot = datos.plazaSnapshot && typeof datos.plazaSnapshot === "object" ? datos.plazaSnapshot : {};
  const plaza = origen?.plaza && typeof origen.plaza === "object" ? origen.plaza : {};

  return {
    plazaCodigo: stringValue(snapshot.plazaCodigo, datos.plazaCodigo, plaza.codigo),
    numeroPlaza: datos.numeroPlaza ?? snapshot.numeroPlaza ?? plaza.numeroPlaza ?? null,
  };
}

function snapshotHuesped(origen) {
  const datos = origen?.datos || {};
  const huesped = datos.huesped && typeof datos.huesped === "object" ? datos.huesped : {};

  return {
    nombreCompleto: stringValue(huesped.nombreCompleto, datos.nombreCompleto, datos.postulanteNombre),
    apellido: stringValue(huesped.apellido, datos.apellido),
    nombres: stringValue(huesped.nombres, datos.nombres),
    gradoEscalafon: stringValue(huesped.gradoEscalafon, datos.gradoEscalafon, datos.grado),
    destinoActual: stringValue(huesped.destinoActual, datos.destinoActual),
    destinoFuturo: stringValue(huesped.destinoFuturo, datos.destinoFuturo),
    genero: stringValue(huesped.genero, datos.genero, datos.sexo),
  };
}

function inspectorSnapshot(user) {
  if (!isInspectorAlojamientos(user)) return { nombre: "", grado: "" };
  return {
    nombre: nombreDesdeUsuario(user),
    grado: stringValue(user?.grado),
  };
}

function sanitizePayload(payload = {}) {
  const source =
    payload?.datos && typeof payload.datos === "object" && !Array.isArray(payload.datos)
      ? payload.datos
      : payload;

  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  if (!Object.keys(source).every((key) => EDITABLE_TOP_LEVEL.has(key))) return null;

  const out = {};
  for (const field of EDITABLE_TOP_LEVEL) {
    if (source[field] !== undefined) out[field] = trimText(source[field], field === "fechaFirma" ? 30 : 4000);
  }
  return out;
}

async function findEditableAnexo24(id, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!canOperateAnexo24(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_24",
    activo: { $ne: false },
  }).populate({ path: "alojamiento", select: "lugar codigo dependencia sector tipo numero" });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!puedeVerDocumento(user, documento)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "BORRADOR") return publicError(409, "ESTADO_INVALIDO");

  return { ok: true, documento };
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

async function generarDesdeAnexo23(documentoOrigen, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!canOperateAnexo24(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!documentoOrigen || up(documentoOrigen.codigo) !== "ANEXO_23") {
    return publicError(404, "ORIGEN_NO_DISPONIBLE");
  }
  if (up(documentoOrigen.estado) !== "CERRADO") return publicError(409, "ESTADO_ORIGEN_INVALIDO");
  if (!puedeVerDocumento(user, documentoOrigen)) return publicError(404, "ORIGEN_NO_DISPONIBLE");

  const alojadoId = idValue(documentoOrigen.alojado) || idValue(documentoOrigen.solicitante);
  const alojamientoId = idValue(documentoOrigen.alojamiento);
  const plazaId = idValue(documentoOrigen.plaza);
  const asignacionId = idValue(documentoOrigen.asignacion);
  if (!isObjectId(alojadoId) || !isObjectId(alojamientoId) || !isObjectId(plazaId) || !isObjectId(asignacionId)) {
    return publicError(409, "ORIGEN_INCOMPLETO");
  }

  const inspectorId = idValue(user._id);
  const alojamientoSnapshot = snapshotAlojamiento(documentoOrigen);
  const plazaSnapshot = snapshotPlaza(documentoOrigen);
  const huesped = snapshotHuesped(documentoOrigen);
  const inspector = inspectorSnapshot(user);

  const documento = new AlojamientoDocumento({
    codigo: "ANEXO_24",
    estado: "BORRADOR",
    derivadoDe: documentoOrigen._id,
    alojamiento: alojamientoId,
    plaza: plazaId,
    asignacion: asignacionId,
    solicitante: idValue(documentoOrigen.solicitante),
    alojado: alojadoId,
    inspector: isObjectId(inspectorId) ? inspectorId : null,
    creadoPor: idValue(user._id),
    actualizadoPor: idValue(user._id),
    datos: {
      huesped,
      alojamientoSnapshot,
      plazaSnapshot,
      inspector,
      lugar: alojamientoSnapshot.lugar,
      localidad: alojamientoSnapshot.localidad,
      provincia: alojamientoSnapshot.provincia,
      predio: alojamientoSnapshot.predio,
      edificio: alojamientoSnapshot.edificio,
      novedadesTexto: "",
      observacionesInspector: "",
      lugarFirma: stringValue(alojamientoSnapshot.lugar),
      fechaFirma: "",
    },
  });

  agregarInterviniente(documento, alojadoId, "ALOJADO");
  if (isObjectId(inspectorId)) agregarInterviniente(documento, inspectorId, "INSPECTOR");
  documento.historialEstados.push({
    estadoNuevo: "BORRADOR",
    realizadoPor: user._id,
    rolActor: "INSPECTOR",
    observacion: "ANEXO_24 generado desde ANEXO_23.",
  });

  try {
    await documento.save();
    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function actualizarDatos(id, payload, user) {
  const resolved = await findEditableAnexo24(id, user);
  if (!resolved.ok) return resolved;

  const sanitized = sanitizePayload(payload);
  if (!sanitized) return publicError(400, "PAYLOAD_INVALIDO");

  const documento = resolved.documento;
  documento.datos = {
    ...(documento.datos || {}),
    ...sanitized,
  };
  documento.actualizadoPor = idValue(user?._id);
  documento.intervenciones.push({
    tipo: "ACTUALIZACION_ANEXO_24",
    actor: user._id,
    rolActor: "INSPECTOR",
    observacion: "Actualizacion de novedades ANEXO_24.",
  });

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function enviar(id, user) {
  const resolved = await findEditableAnexo24(id, user);
  if (!resolved.ok) return resolved;

  const documento = resolved.documento;
  let transition = registrarCambioEstado(documento, {
    estadoNuevo: "ENVIADO",
    actorId: user._id,
    rolActor: "INSPECTOR",
    observacion: "ANEXO_24 enviado para revision.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");

  transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "INSPECTOR",
    observacion: "ANEXO_24 en revision administrativa.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");

  documento.actualizadoPor = idValue(user?._id);

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function cerrarAnexo24(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_24",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "EN_REVISION") return publicError(409, "ESTADO_INVALIDO");

  const observacion = trimText(payload?.observacion, 1000);
  const conformidad = registrarConformidad(documento, {
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    rol: "ADMIN_GENERAL",
    ok: true,
    observacion,
  });
  if (!conformidad.ok) return publicError(400, "CONFORMIDAD_INVALIDA");

  documento.signers = Array.isArray(documento.signers) ? documento.signers : [];
  documento.signers.push({
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ADMIN_GENERAL",
    fecha: new Date(),
    fuente: "CIERRE_ADMIN_GENERAL_ANEXO_24",
  });

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "CERRADO",
    actorId: user._id,
    rolActor: "ADMIN_GENERAL",
    observacion: "Cierre ADMIN_GENERAL ANEXO_24.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");

  documento.estadoInstitucional = "CERRADO_ADMIN_GENERAL";
  documento.actualizadoPor = idValue(user?._id);

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

module.exports = {
  generarDesdeAnexo23,
  actualizarDatos,
  enviar,
  cerrarAnexo24,
};
