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
  puedeVerDocumentoPorTerritorio,
} = require("./alojamientoDocumentoVisibilityService");

const EDITABLE_TOP_LEVEL = new Set([
  "gradoAlojado",
  "lugarInspeccion",
  "fechaInspeccion",
  "reparacionesArmada",
  "reparacionesAlojado",
  "representante1",
  "representante2",
  "observacionesInspector",
  "lugarFirma",
  "fechaFirma",
]);

function publicError(status, code = "NO_DISPONIBLE", message = "No es posible procesar el ANEXO_25 en este momento.") {
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

function isAlojado(user) {
  return up(user?.role) === "ALOJADO";
}

function isInspectorAlojamientos(user) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return up(user?.role) === "INSPECTOR_ALOJAMIENTOS" || permisos.includes("INSPECTOR_ALOJAMIENTOS");
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

function sanitizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => trimText(item, 1000)).filter(Boolean).slice(0, 60);
}

function sanitizeRepresentante(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    apellidoNombres: trimText(source.apellidoNombres, 180),
    grado: trimText(source.grado, 80),
    destino: trimText(source.destino, 180),
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
  if (source.gradoAlojado !== undefined) out.gradoAlojado = trimText(source.gradoAlojado, 80);
  if (source.lugarInspeccion !== undefined) out.lugarInspeccion = trimText(source.lugarInspeccion, 180);
  if (source.fechaInspeccion !== undefined) out.fechaInspeccion = trimText(source.fechaInspeccion, 30);
  if (source.reparacionesArmada !== undefined) out.reparacionesArmada = sanitizeList(source.reparacionesArmada);
  if (source.reparacionesAlojado !== undefined) out.reparacionesAlojado = sanitizeList(source.reparacionesAlojado);
  if (source.representante1 !== undefined) out.representante1 = sanitizeRepresentante(source.representante1);
  if (source.representante2 !== undefined) out.representante2 = sanitizeRepresentante(source.representante2);
  if (source.observacionesInspector !== undefined) out.observacionesInspector = trimText(source.observacionesInspector, 4000);
  if (source.lugarFirma !== undefined) out.lugarFirma = trimText(source.lugarFirma, 180);
  if (source.fechaFirma !== undefined) out.fechaFirma = trimText(source.fechaFirma, 30);
  return out;
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

function isUsuarioVinculado(documento, user) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;
  if (String(idValue(documento.alojado) || "") === userId) return true;
  if (String(idValue(documento.solicitante) || "") === userId) return true;
  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => String(idValue(item?.userId) || "") === userId);
}

function isInspectorInterviniente(documento, user) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;
  if (String(idValue(documento.inspector) || "") === userId) return true;
  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some(
    (item) => String(idValue(item?.userId) || "") === userId && up(item?.rol) === "INSPECTOR"
  );
}

function canInspect(user, documento) {
  if (!isObjectId(user?._id) || !isInspectorAlojamientos(user)) return false;
  return isInspectorInterviniente(documento, user) || puedeVerDocumentoPorTerritorio(user, documento);
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
  if (!isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!documentoOrigen || up(documentoOrigen.codigo) !== "ANEXO_23") {
    return publicError(404, "ORIGEN_NO_DISPONIBLE");
  }
  if (up(documentoOrigen.estado) !== "CERRADO") return publicError(409, "ESTADO_ORIGEN_INVALIDO");
  if (!puedeVerDocumentoPorTerritorio(user, documentoOrigen)) return publicError(404, "ORIGEN_NO_DISPONIBLE");

  const alojadoId = idValue(documentoOrigen.alojado) || idValue(documentoOrigen.solicitante);
  const alojamientoId = idValue(documentoOrigen.alojamiento);
  const plazaId = idValue(documentoOrigen.plaza);
  const asignacionId = idValue(documentoOrigen.asignacion);
  if (!isObjectId(alojadoId) || !isObjectId(alojamientoId) || !isObjectId(plazaId) || !isObjectId(asignacionId)) {
    return publicError(409, "ORIGEN_INCOMPLETO");
  }

  const existente = await AlojamientoDocumento.findOne({
    codigo: "ANEXO_25",
    derivadoDe: documentoOrigen._id,
    activo: { $ne: false },
  });
  if (existente) return { ok: true, status: 200, documento: toResponse(existente) };

  const alojamientoSnapshot = snapshotAlojamiento(documentoOrigen);
  const plazaSnapshot = snapshotPlaza(documentoOrigen);
  const huesped = snapshotHuesped(documentoOrigen);
  const fecha = new Date();

  const documento = new AlojamientoDocumento({
    codigo: "ANEXO_25",
    estado: "ENVIADO",
    derivadoDe: documentoOrigen._id,
    alojamiento: alojamientoId,
    plaza: plazaId,
    asignacion: asignacionId,
    solicitante: idValue(documentoOrigen.solicitante),
    alojado: alojadoId,
    inspector: user._id,
    creadoPor: user._id,
    actualizadoPor: user._id,
    datos: {
      huesped,
      alojamientoSnapshot,
      plazaSnapshot,
      inspector: {
        nombre: nombreDesdeUsuario(user) || "Inspector de alojamiento",
      },
      gradoAlojado: huesped.gradoEscalafon || "",
      lugarInspeccion: alojamientoSnapshot.lugar,
      fechaInspeccion: fecha,
      reparacionesArmada: [],
      reparacionesAlojado: [],
      representante1: {},
      representante2: {},
      observacionesInspector: "",
      observacionesAlojado: "",
      lugarFirma: alojamientoSnapshot.lugar,
      fechaFirma: "",
      conformidadInspector: {
        ok: true,
        fecha,
        usuario: user._id,
        observacion: "Acta de inspeccion previa generada por inspector de alojamientos.",
      },
    },
  });

  agregarInterviniente(documento, user._id, "INSPECTOR");
  agregarInterviniente(documento, alojadoId, "ALOJADO");
  registrarConformidad(documento, {
    tipo: "INSPECTOR",
    usuario: user._id,
    rol: "INSPECTOR_ALOJAMIENTOS",
    ok: true,
    observacion: "Generacion de ANEXO_25 por inspector de alojamientos.",
  });
  documento.signers.push({
    tipo: "INSPECTOR",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "INSPECTOR_ALOJAMIENTOS",
    fecha,
    fuente: "GENERACION_ANEXO_25",
  });
  documento.historialEstados.push({
    fecha,
    estadoNuevo: "ENVIADO",
    realizadoPor: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "ANEXO_25 generado y enviado por inspector de alojamientos desde ANEXO_23.",
  });

  try {
    await documento.save();
    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function actualizarDatos(id, payload, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_25",
    activo: { $ne: false },
  }).populate({ path: "alojamiento", select: "lugar codigo dependencia sector tipo numero" });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!canInspect(user, documento)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "ENVIADO") return publicError(409, "ESTADO_INVALIDO");

  const sanitized = sanitizePayload(payload);
  if (!sanitized) return publicError(400, "PAYLOAD_INVALIDO");

  documento.datos = {
    ...(documento.datos || {}),
    ...sanitized,
  };
  documento.actualizadoPor = idValue(user?._id);
  documento.intervenciones.push({
    tipo: "ACTUALIZACION_ANEXO_25",
    actor: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "Actualizacion de datos ANEXO_25 por inspector de alojamientos.",
  });

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function conformidadAlojado(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isAlojado(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_25",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isUsuarioVinculado(documento, user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "ENVIADO") return publicError(409, "ESTADO_INVALIDO");

  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAlojado, 1000);
  documento.datos = {
    ...(documento.datos || {}),
    observacionesAlojado: observacion,
    conformidadAlojado: {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion,
    },
  };

  const conformidad = registrarConformidad(documento, {
    tipo: "ALOJADO",
    usuario: user._id,
    rol: "ALOJADO",
    ok: true,
    observacion,
  });
  if (!conformidad.ok) return publicError(400, "CONFORMIDAD_INVALIDA");

  documento.signers.push({
    tipo: "ALOJADO",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ALOJADO",
    fecha: new Date(),
    fuente: "CONFORMIDAD_ALOJADO_ANEXO_25",
  });

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "ALOJADO",
    observacion: "Conformidad del alojado sobre ANEXO_25.",
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

async function cerrarAnexo25(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_25",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "EN_REVISION") return publicError(409, "ESTADO_INVALIDO");
  if (documento.datos?.conformidadAlojado?.ok !== true) return publicError(409, "CONFORMIDAD_ALOJADO_REQUERIDA");

  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAdminGeneral, 1000);
  documento.datos = {
    ...(documento.datos || {}),
    observacionesAdminGeneral: observacion,
    conformidadAdminGeneral: {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion,
    },
  };

  const conformidad = registrarConformidad(documento, {
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    rol: "ADMIN_GENERAL",
    ok: true,
    observacion,
  });
  if (!conformidad.ok) return publicError(400, "CONFORMIDAD_INVALIDA");

  documento.signers.push({
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ADMIN_GENERAL",
    fecha: new Date(),
    fuente: "CIERRE_ADMIN_GENERAL_ANEXO_25",
  });

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "CERRADO",
    actorId: user._id,
    rolActor: "ADMIN_GENERAL",
    observacion: "Cierre ADMIN_GENERAL ANEXO_25.",
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
  conformidadAlojado,
  cerrarAnexo25,
};
