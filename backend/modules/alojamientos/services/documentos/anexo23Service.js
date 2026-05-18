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

const SI_NO_FIELDS = Object.freeze([
  "llavesEdificio",
  "llavesAlojamiento",
  "llaveTerraza",
  "llaveCochera",
  "inventarioMuebles",
  "lineaTelefonica",
]);

const ESTADO_FIELDS = Object.freeze([
  "electricidad",
  "gas",
  "telefono",
  "aberturas",
  "albanileria",
  "alfombras",
  "antenaTv",
  "calefactorEstufa",
  "calefonTermotanque",
  "carpinteria",
  "sanitarios",
  "cerrajeria",
  "cocina",
  "desinfeccion",
  "herrajes",
  "limpieza",
  "lustrado",
  "pintura",
  "pisos",
  "vidrios",
  "estadoGeneral",
]);

const EDITABLE_TOP_LEVEL = new Set([
  "material",
  "estadoSistemas",
  "novedadesTexto",
  "reparacionMantenimientoEntrega",
  "lugarFirma",
  "fechaFirma",
  "autorizacionDescuento",
]);
const SI_NO_VALUES = new Set(["SI", "NO"]);
const ESTADO_VALUES = new Set(["MB", "B", "R", "M"]);

function publicError(status, code = "NO_DISPONIBLE") {
  return {
    ok: false,
    status,
    code,
    message: "No es posible generar el ANEXO_23 en este momento.",
  };
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function canOperateAnexo23(user) {
  return isAdminGeneral(user) || isInspectorAlojamientos(user);
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id;
  return value;
}

function stringValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function nombreDesdeUsuario(user) {
  if (!user || typeof user !== "object") return "";
  return stringValue(
    [user.apellido, user.nombre || user.nombres].filter(Boolean).join(", "),
    user.email
  );
}

function isUsuarioVinculado(documento, user) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;

  if (String(idValue(documento.solicitante) || "") === userId) return true;
  if (String(idValue(documento.alojado) || "") === userId) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => String(idValue(item?.userId) || "") === userId);
}

function hasConformidadAlojado(documento, user) {
  const userId = String(user?._id || "");
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some(
    (item) => up(item?.tipo) === "ALOJADO" && String(idValue(item?.usuario) || "") === userId
  );
}

function alojamientoSnapshotFrom(origen) {
  const datos = origen?.datos || {};
  const alojamiento = origen?.alojamiento && typeof origen.alojamiento === "object"
    ? origen.alojamiento
    : {};

  return {
    alojamientoCodigo: stringValue(datos.alojamientoCodigo, alojamiento.codigo),
    lugar: stringValue(datos.lugar, datos.alojamientoLugar, alojamiento.lugar),
    dependencia: stringValue(datos.dependencia, alojamiento.dependencia),
    sector: stringValue(datos.sector, alojamiento.sector),
    tipo: stringValue(datos.tipo, alojamiento.tipo),
    numero: stringValue(datos.numero, alojamiento.numero),
    clase: stringValue(datos.clase, alojamiento.clase),
    capacidad: datos.capacidad ?? alojamiento.capacidad ?? null,
    generoPermitido: stringValue(datos.generoPermitido, alojamiento.generoPermitido),
    localidad: stringValue(datos.localidad, alojamiento.localidad),
    provincia: stringValue(datos.provincia, alojamiento.provincia),
    predio: stringValue(datos.predio, datos.lugar, datos.alojamientoLugar, alojamiento.lugar),
    edificio: stringValue(datos.edificio, datos.sector, alojamiento.sector),
  };
}

function plazaSnapshotFrom(origen) {
  const datos = origen?.datos || {};
  const plaza = origen?.plaza && typeof origen.plaza === "object" ? origen.plaza : {};

  return {
    plazaCodigo: stringValue(datos.plazaCodigo, plaza.codigo),
    numeroPlaza: datos.numeroPlaza ?? plaza.numeroPlaza ?? null,
  };
}

function huespedSnapshotFrom(origen) {
  const datos = origen?.datos || {};
  const alojado = origen?.alojado && typeof origen.alojado === "object" ? origen.alojado : {};
  const solicitante = origen?.solicitante && typeof origen.solicitante === "object" ? origen.solicitante : {};

  return {
    nombre: stringValue(datos.postulanteNombre, nombreDesdeUsuario(alojado), nombreDesdeUsuario(solicitante)),
    apellido: stringValue(datos.apellido, alojado.apellido, solicitante.apellido),
    nombres: stringValue(datos.nombres, alojado.nombre, alojado.nombres, solicitante.nombre, solicitante.nombres),
    mr: stringValue(datos.mr),
    gradoEscalafon: stringValue(datos.gradoEscalafon),
    destino: stringValue(datos.destinoActual, datos.destinoFuturo),
    genero: stringValue(datos.genero, datos.sexo),
  };
}

function inspectorSnapshotFrom(user) {
  return {
    nombre: nombreDesdeUsuario(user),
    grado: stringValue(user?.grado),
  };
}

function trimText(value, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeSiNo(value) {
  const normalized = up(value);
  if (!normalized) return "";
  if (!SI_NO_VALUES.has(normalized)) return null;
  return normalized;
}

function normalizeEstado(value) {
  const normalized = up(value);
  if (!normalized) return "";
  if (!ESTADO_VALUES.has(normalized)) return null;
  return normalized;
}

function assertNoUnknownKeys(source, allowed) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return false;
  return Object.keys(source).every((key) => allowed.has(key));
}

function sanitizeMaterial(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (!Object.keys(input).every((key) => SI_NO_FIELDS.includes(key))) return null;

  const out = {};
  for (const field of SI_NO_FIELDS) {
    if (input[field] === undefined) continue;
    const value = normalizeSiNo(input[field]);
    if (value === null) return null;
    out[field] = value;
  }
  return out;
}

function sanitizeEstadoSistemas(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (!Object.keys(input).every((key) => ESTADO_FIELDS.includes(key))) return null;

  const out = {};
  for (const field of ESTADO_FIELDS) {
    if (input[field] === undefined) continue;
    const value = normalizeEstado(input[field]);
    if (value === null) return null;
    out[field] = value;
  }
  return out;
}

function sanitizePayload(payload = {}) {
  const source = payload?.datos && typeof payload.datos === "object" && !Array.isArray(payload.datos)
    ? payload.datos
    : payload;

  if (!assertNoUnknownKeys(source, EDITABLE_TOP_LEVEL)) return null;

  const out = {};
  if (source.material !== undefined) {
    const material = sanitizeMaterial(source.material);
    if (!material) return null;
    out.material = material;
  }
  if (source.estadoSistemas !== undefined) {
    const estadoSistemas = sanitizeEstadoSistemas(source.estadoSistemas);
    if (!estadoSistemas) return null;
    out.estadoSistemas = estadoSistemas;
  }

  for (const field of ["novedadesTexto", "reparacionMantenimientoEntrega", "lugarFirma", "fechaFirma"]) {
    if (source[field] !== undefined) out[field] = trimText(source[field], field === "fechaFirma" ? 30 : 4000);
  }

  if (source.autorizacionDescuento !== undefined) {
    if (typeof source.autorizacionDescuento !== "boolean") return null;
    out.autorizacionDescuento = source.autorizacionDescuento;
  }

  return out;
}

async function findEditableAnexo23(id, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!canOperateAnexo23(user)) return publicError(404, "NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_23",
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

async function generarDesdeAnexo22(documentoOrigen, user) {
  if (!isObjectId(user?._id)) {
    return publicError(403, "USUARIO_NO_AUTORIZADO");
  }
  if (!documentoOrigen || up(documentoOrigen.codigo) !== "ANEXO_22") {
    return publicError(404, "ORIGEN_NO_DISPONIBLE");
  }
  if (up(documentoOrigen.estado) !== "CERRADO") {
    return publicError(404, "ESTADO_ORIGEN_INVALIDO");
  }
  if (!isObjectId(documentoOrigen._id)) {
    return publicError(404, "ORIGEN_NO_DISPONIBLE");
  }

  const existente = await AlojamientoDocumento.findOne({
    codigo: "ANEXO_23",
    derivadoDe: documentoOrigen._id,
    activo: { $ne: false },
  });
  if (existente) {
    return { ok: true, status: 200, documento: toResponse(existente) };
  }

  const alojamientoSnapshot = alojamientoSnapshotFrom(documentoOrigen);
  const plazaSnapshot = plazaSnapshotFrom(documentoOrigen);
  const huesped = huespedSnapshotFrom(documentoOrigen);
  const inspector = inspectorSnapshotFrom(user);

  const alojadoId = idValue(documentoOrigen.alojado) || idValue(documentoOrigen.solicitante);
  if (!isObjectId(alojadoId)) return publicError(404, "ALOJADO_NO_DISPONIBLE");

  const documento = new AlojamientoDocumento({
    codigo: "ANEXO_23",
    estado: "BORRADOR",
    derivadoDe: documentoOrigen._id,
    alojamiento: idValue(documentoOrigen.alojamiento),
    plaza: idValue(documentoOrigen.plaza),
    asignacion: idValue(documentoOrigen.asignacion),
    solicitante: idValue(documentoOrigen.solicitante),
    alojado: alojadoId,
    inspector: idValue(user?._id),
    creadoPor: idValue(user?._id),
    actualizadoPor: idValue(user?._id),
    datos: {
      huesped,
      inspector,
      alojamientoSnapshot,
      plazaSnapshot,
      lugar: alojamientoSnapshot.lugar,
      localidad: alojamientoSnapshot.localidad,
      provincia: alojamientoSnapshot.provincia,
      predio: alojamientoSnapshot.predio,
      edificio: alojamientoSnapshot.edificio,
      material: {},
      estadoSistemas: {},
      novedadesTexto: "",
      reparacionMantenimientoEntrega: "",
      autorizacionDescuento: true,
    },
  });

  agregarInterviniente(documento, alojadoId, "ALOJADO");
  agregarInterviniente(documento, user._id, "INSPECTOR");
  documento.historialEstados.push({
    estadoNuevo: "BORRADOR",
    realizadoPor: user._id,
    rolActor: up(user?.role) === "ADMIN_GENERAL" ? "ADMIN_GENERAL" : "INSPECTOR",
    observacion: "ANEXO_23 generado desde ANEXO_22.",
  });

  try {
    await documento.save();
    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch (err) {
    if (err?.code === 11000) {
      const duplicado = await AlojamientoDocumento.findOne({
        codigo: "ANEXO_23",
        derivadoDe: documentoOrigen._id,
        activo: { $ne: false },
      });
      if (duplicado) return { ok: true, status: 200, documento: toResponse(duplicado) };
      return publicError(409, "DUPLICADO");
    }
    return publicError(500, "ERROR_INTERNO");
  }
}

async function actualizarDatos(id, payload, user) {
  const resolved = await findEditableAnexo23(id, user);
  if (!resolved.ok) return resolved;

  const sanitized = sanitizePayload(payload);
  if (!sanitized) return publicError(400, "PAYLOAD_INVALIDO");

  const documento = resolved.documento;
  documento.datos = {
    ...(documento.datos || {}),
    ...sanitized,
    material: {
      ...((documento.datos || {}).material || {}),
      ...(sanitized.material || {}),
    },
    estadoSistemas: {
      ...((documento.datos || {}).estadoSistemas || {}),
      ...(sanitized.estadoSistemas || {}),
    },
  };
  documento.actualizadoPor = idValue(user?._id);
  documento.intervenciones.push({
    tipo: "ACTUALIZACION_ANEXO_23",
    actor: user._id,
    rolActor: isAdminGeneral(user) ? "ADMIN_GENERAL" : "INSPECTOR",
    observacion: "Actualizacion de datos operativos ANEXO_23.",
  });

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function enviar(id, user) {
  const resolved = await findEditableAnexo23(id, user);
  if (!resolved.ok) return resolved;

  const documento = resolved.documento;
  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "ENVIADO",
    actorId: user._id,
    rolActor: isAdminGeneral(user) ? "ADMIN_GENERAL" : "INSPECTOR",
    observacion: "ANEXO_23 enviado al alojado para conformidad.",
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

async function conformidadAlojado(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_23",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isUsuarioVinculado(documento, user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "ENVIADO") return publicError(409, "ESTADO_INVALIDO");
  if (hasConformidadAlojado(documento, user)) return publicError(409, "CONFORMIDAD_DUPLICADA");

  const observacion = trimText(payload?.observacion, 1000);
  const conformidad = registrarConformidad(documento, {
    tipo: "ALOJADO",
    usuario: user._id,
    rol: "ALOJADO",
    ok: true,
    observacion,
  });
  if (!conformidad.ok) return publicError(400, "CONFORMIDAD_INVALIDA");

  documento.signers = Array.isArray(documento.signers) ? documento.signers : [];
  documento.signers.push({
    tipo: "ALOJADO",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ALOJADO",
    fecha: new Date(),
    fuente: "CONFORMIDAD_ALOJADO_ANEXO_23",
  });

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "ALOJADO",
    observacion: "Conformidad ALOJADO ANEXO_23.",
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

module.exports = {
  generarDesdeAnexo22,
  actualizarDatos,
  enviar,
  conformidadAlojado,
};
