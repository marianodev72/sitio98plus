const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const AlojamientoPlaza = require("../../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../../models/AsignacionAlojamiento");
const { User } = require("../../../../models/user");
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

function publicError(status, code = "NO_DISPONIBLE", message = "No es posible generar el ANEXO_23 en este momento.") {
  return {
    ok: false,
    status,
    code,
    message,
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

function hasConformidadTipo(documento, tipo) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some((item) => up(item?.tipo) === tipoUp && item?.ok === true);
}

function sameId(a, b) {
  return String(idValue(a) || "") === String(idValue(b) || "");
}

function alojamientoSnapshotFrom(origen) {
  const datos = origen?.datos || {};
  const datosAlojamiento = datos.alojamiento && typeof datos.alojamiento === "object" ? datos.alojamiento : {};
  const snapshot = datos.alojamientoSnapshot && typeof datos.alojamientoSnapshot === "object"
    ? datos.alojamientoSnapshot
    : {};
  const alojamiento = origen?.alojamiento && typeof origen.alojamiento === "object"
    ? origen.alojamiento
    : {};

  return {
    alojamientoCodigo: stringValue(
      datos.alojamientoCodigo,
      datosAlojamiento.codigo,
      snapshot.alojamientoCodigo,
      alojamiento.codigo
    ),
    lugar: stringValue(datos.lugar, datos.alojamientoLugar, datosAlojamiento.lugar, snapshot.lugar, alojamiento.lugar),
    dependencia: stringValue(datos.dependencia, datosAlojamiento.dependencia, snapshot.dependencia, alojamiento.dependencia),
    sector: stringValue(datos.sector, datosAlojamiento.sector, snapshot.sector, alojamiento.sector),
    tipo: stringValue(datos.tipo, datosAlojamiento.tipo, snapshot.tipo, alojamiento.tipo),
    numero: stringValue(datos.numero, datosAlojamiento.numero, snapshot.numero, alojamiento.numero),
    clase: stringValue(datos.clase, datosAlojamiento.clase, snapshot.clase, alojamiento.clase),
    capacidad: datos.capacidad ?? datosAlojamiento.capacidad ?? snapshot.capacidad ?? alojamiento.capacidad ?? null,
    generoPermitido: stringValue(
      datos.generoPermitido,
      datosAlojamiento.generoPermitido,
      snapshot.generoPermitido,
      alojamiento.generoPermitido
    ),
    localidad: stringValue(datos.localidad, datosAlojamiento.localidad, snapshot.localidad, alojamiento.localidad),
    provincia: stringValue(datos.provincia, datosAlojamiento.provincia, snapshot.provincia, alojamiento.provincia),
    predio: stringValue(
      datos.predio,
      datosAlojamiento.predio,
      snapshot.predio,
      alojamiento.predio,
      datos.lugar,
      datos.alojamientoLugar,
      alojamiento.lugar
    ),
    edificio: stringValue(
      datos.edificio,
      datosAlojamiento.edificio,
      snapshot.edificio,
      alojamiento.edificio,
      datos.sector,
      alojamiento.sector
    ),
  };
}

function plazaSnapshotFrom(origen) {
  const datos = origen?.datos || {};
  const snapshot = datos.plazaSnapshot && typeof datos.plazaSnapshot === "object" ? datos.plazaSnapshot : {};
  const plaza = origen?.plaza && typeof origen.plaza === "object" ? origen.plaza : {};

  return {
    plazaCodigo: stringValue(datos.plazaCodigo, snapshot.plazaCodigo, plaza.codigo),
    numeroPlaza: datos.numeroPlaza ?? snapshot.numeroPlaza ?? plaza.numeroPlaza ?? null,
  };
}

function huespedSnapshotFrom(origen, anexo21Origen = null) {
  const datos = origen?.datos || {};
  const datos21 = anexo21Origen?.datos || {};
  const huesped = datos.huesped && typeof datos.huesped === "object" ? datos.huesped : {};
  const alojado = origen?.alojado && typeof origen.alojado === "object" ? origen.alojado : {};
  const solicitante = origen?.solicitante && typeof origen.solicitante === "object" ? origen.solicitante : {};
  const nombreCompleto = stringValue(
    datos21.apellidoNombre,
    datos21.nombreCompleto,
    datos21.postulanteNombre,
    datos.apellidoNombre,
    datos.nombreCompleto,
    datos.postulanteNombre,
    huesped.nombre,
    nombreDesdeUsuario(alojado),
    nombreDesdeUsuario(solicitante)
  );
  const destinoActual = stringValue(datos21.destinoActual, datos.destinoActual, huesped.destinoActual);
  const destinoFuturo = stringValue(datos21.destinoFuturo, datos.destinoFuturo, huesped.destinoFuturo);

  return {
    nombre: nombreCompleto,
    apellido: stringValue(datos21.apellido, datos.apellido, huesped.apellido, alojado.apellido, solicitante.apellido),
    nombres: stringValue(
      datos21.nombres,
      datos.nombres,
      huesped.nombres,
      alojado.nombre,
      alojado.nombres,
      solicitante.nombre,
      solicitante.nombres
    ),
    nombreCompleto,
    postulanteNombre: nombreCompleto,
    mr: stringValue(datos21.mr, datos21.dni, datos.mr, datos.dni, huesped.mr),
    dni: stringValue(datos21.dni, datos.dni, huesped.dni),
    gradoEscalafon: stringValue(datos21.gradoEscalafon, datos21.grado, datos.gradoEscalafon, datos.grado, huesped.gradoEscalafon),
    grado: stringValue(datos21.grado, datos.grado, huesped.grado),
    destino: stringValue(destinoActual, destinoFuturo, datos21.destino, datos.destino, huesped.destino),
    destinoActual,
    destinoFuturo,
    genero: stringValue(datos21.genero, datos21.sexo, datos.genero, datos.sexo, huesped.genero, alojado.genero, solicitante.genero),
    telefono: stringValue(
      datos21.telefono,
      datos21.telefonoActual,
      datos21.telefonoFuturo,
      datos.telefono,
      datos.telefonoActual,
      datos.telefonoFuturo,
      huesped.telefono,
      alojado.telefono,
      solicitante.telefono
    ),
    email: stringValue(datos21.email, datos.email, huesped.email, alojado.email, solicitante.email),
  };
}

function inspectorSnapshotFrom(user) {
  if (!isInspectorAlojamientos(user)) {
    return {
      nombre: "No asignado",
      grado: "",
    };
  }

  return {
    nombre: nombreDesdeUsuario(user),
    grado: stringValue(user?.grado),
  };
}

async function findAnexo21Origen(documentoOrigen) {
  const anexo21Id = idValue(documentoOrigen?.derivadoDe);
  if (!isObjectId(anexo21Id)) return null;

  return AlojamientoDocumento.findOne({
    _id: anexo21Id,
    codigo: "ANEXO_21",
    activo: { $ne: false },
  }).populate([
    { path: "solicitante", select: "nombre apellido email grado mr destino genero sexo telefono" },
    { path: "alojado", select: "nombre apellido email grado mr destino genero sexo telefono" },
  ]);
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

  const anexo21Origen = await findAnexo21Origen(documentoOrigen);
  const alojamientoSnapshot = alojamientoSnapshotFrom(documentoOrigen);
  const plazaSnapshot = plazaSnapshotFrom(documentoOrigen);
  const huesped = huespedSnapshotFrom(documentoOrigen, anexo21Origen);
  const inspector = inspectorSnapshotFrom(user);
  const inspectorId = isInspectorAlojamientos(user) ? idValue(user?._id) : null;

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
    inspector: inspectorId,
    creadoPor: idValue(user?._id),
    actualizadoPor: idValue(user?._id),
    datos: {
      apellido: huesped.apellido,
      nombres: huesped.nombres,
      postulanteNombre: huesped.postulanteNombre,
      nombreCompleto: huesped.nombreCompleto,
      genero: huesped.genero,
      mr: huesped.mr,
      dni: huesped.dni,
      gradoEscalafon: huesped.gradoEscalafon,
      grado: huesped.grado,
      destinoActual: huesped.destinoActual,
      destinoFuturo: huesped.destinoFuturo,
      telefono: huesped.telefono,
      email: huesped.email,
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
  if (inspectorId) agregarInterviniente(documento, inspectorId, "INSPECTOR");
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

async function cerrarAnexo23(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const observacion = trimText(payload?.observacion, 1000);
  const session = await AlojamientoDocumento.startSession();

  try {
    let cerrado = null;

    await session.withTransaction(async () => {
      const documento = await AlojamientoDocumento.findOne({
        _id: id,
        codigo: "ANEXO_23",
        activo: { $ne: false },
      }).session(session);

      if (!documento) throw publicError(404, "DOCUMENTO_NO_DISPONIBLE");
      if (up(documento.estado) !== "EN_REVISION") throw publicError(409, "ESTADO_INVALIDO");
      if (!hasConformidadTipo(documento, "ALOJADO")) {
        throw publicError(409, "CONFORMIDAD_ALOJADO_REQUERIDA");
      }
      if (hasConformidadTipo(documento, "ADMIN_GENERAL")) throw publicError(409, "CIERRE_DUPLICADO");

      const alojadoId = idValue(documento.alojado);
      const alojamientoId = idValue(documento.alojamiento);
      const plazaId = idValue(documento.plaza);
      const asignacionId = idValue(documento.asignacion);

      if (!isObjectId(alojadoId)) throw publicError(409, "ALOJADO_REQUERIDO");
      if (!isObjectId(alojamientoId)) throw publicError(409, "ALOJAMIENTO_REQUERIDO");
      if (!isObjectId(plazaId)) throw publicError(409, "PLAZA_REQUERIDA");
      if (!isObjectId(asignacionId)) throw publicError(409, "ASIGNACION_REQUERIDA");

      const [alojado, plaza, asignacion] = await Promise.all([
        User.findById(alojadoId).select("+tokenVersion").session(session),
        AlojamientoPlaza.findOne({ _id: plazaId, activo: { $ne: false } }).session(session),
        AsignacionAlojamiento.findById(asignacionId).session(session),
      ]);

      if (!alojado) throw publicError(404, "ALOJADO_NO_DISPONIBLE");
      const roleAlojado = up(alojado.role);
      if (roleAlojado !== "POSTULANTE" && roleAlojado !== "ALOJADO") {
        throw publicError(
          409,
          "ROL_NO_MIGRABLE",
          "No se puede materializar ALOJADO porque el usuario posee un rol institucional no migrable automáticamente"
        );
      }

      if (!plaza) throw publicError(404, "PLAZA_NO_DISPONIBLE");
      if (!sameId(plaza.alojamiento, alojamientoId)) throw publicError(409, "PLAZA_INCONSISTENTE");
      const plazaEstado = up(plaza.estado);
      if (plazaEstado !== "RESERVADA" && plazaEstado !== "OCUPADA") {
        throw publicError(409, "PLAZA_NO_RESERVADA");
      }
      if (plaza.alojadoActual && !sameId(plaza.alojadoActual, alojadoId)) {
        throw publicError(409, "PLAZA_OCUPADA_POR_OTRO_USUARIO");
      }
      if (plaza.reservaActual?.usuario && !sameId(plaza.reservaActual.usuario, alojadoId)) {
        throw publicError(409, "RESERVA_INCONSISTENTE");
      }
      if (plaza.reservaActual?.anexoId && !sameId(plaza.reservaActual.anexoId, documento.derivadoDe)) {
        throw publicError(409, "RESERVA_DOCUMENTAL_INCONSISTENTE");
      }

      if (!asignacion) throw publicError(404, "ASIGNACION_NO_DISPONIBLE");
      if (!sameId(asignacion.alojado, alojadoId)) throw publicError(409, "ASIGNACION_ALOJADO_INCONSISTENTE");
      if (!sameId(asignacion.alojamiento, alojamientoId)) throw publicError(409, "ASIGNACION_ALOJAMIENTO_INCONSISTENTE");
      if (!sameId(asignacion.plaza, plazaId)) throw publicError(409, "ASIGNACION_PLAZA_INCONSISTENTE");
      const asignacionEstado = up(asignacion.estado);
      if (asignacionEstado !== "RESERVADA" && asignacionEstado !== "ACTIVA") {
        throw publicError(409, "ASIGNACION_ESTADO_INVALIDO");
      }

      const now = new Date();

      if (roleAlojado === "POSTULANTE") alojado.role = "ALOJADO";
      alojado.estadoHabitacional = "ALOJADO_ACTIVO";
      alojado.alojamientoAsignado = alojamientoId;
      if (typeof alojado.tokenVersion === "number") alojado.tokenVersion += 1;
      await alojado.save({ session });

      const estadoPlazaAnterior = plaza.estado;
      plaza.estado = "OCUPADA";
      plaza.alojadoActual = alojadoId;
      plaza.reservaActual = null;
      plaza.historial = Array.isArray(plaza.historial) ? plaza.historial : [];
      plaza.historial.push({
        fecha: now,
        accion: "OCUPACION_ANEXO_23",
        alojado: alojadoId,
        estadoAnterior: estadoPlazaAnterior,
        estadoNuevo: "OCUPADA",
        anexoId: documento._id,
        realizadoPor: user._id,
        observacion: "Ocupacion materializada por cierre ADMIN_GENERAL ANEXO_23.",
      });
      await plaza.save({ session });

      const estadoAsignacionAnterior = asignacion.estado;
      asignacion.estado = "ACTIVA";
      asignacion.fechaInicio = asignacion.fechaInicio || now;
      asignacion.actualizadoPor = user._id;
      asignacion.auditoria = Array.isArray(asignacion.auditoria) ? asignacion.auditoria : [];
      asignacion.auditoria.push({
        fecha: now,
        accion: "ACTIVACION_ANEXO_23",
        actor: user._id,
        estadoAnterior: estadoAsignacionAnterior,
        estadoNuevo: "ACTIVA",
        observacion: "Asignacion activada por cierre ADMIN_GENERAL ANEXO_23.",
      });
      await asignacion.save({ session });

      const conformidad = registrarConformidad(documento, {
        tipo: "ADMIN_GENERAL",
        usuario: user._id,
        rol: "ADMIN_GENERAL",
        ok: true,
        observacion,
      });
      if (!conformidad.ok) throw publicError(400, "CONFORMIDAD_INVALIDA");

      documento.signers = Array.isArray(documento.signers) ? documento.signers : [];
      documento.signers.push({
        tipo: "ADMIN_GENERAL",
        usuario: user._id,
        nombre: nombreDesdeUsuario(user),
        rol: "ADMIN_GENERAL",
        fecha: now,
        fuente: "CIERRE_ADMIN_GENERAL_ANEXO_23",
      });

      const transition = registrarCambioEstado(documento, {
        estadoNuevo: "CERRADO",
        actorId: user._id,
        rolActor: "ADMIN_GENERAL",
        observacion: "Cierre ADMIN_GENERAL ANEXO_23.",
      });
      if (!transition.ok) throw publicError(409, "TRANSICION_INVALIDA");

      documento.estadoInstitucional = "CERRADO_ADMIN_GENERAL";
      documento.actualizadoPor = idValue(user?._id);

      await documento.save({ session });
      cerrado = documento;
    });

    return { ok: true, status: 200, documento: toResponse(cerrado) };
  } catch (err) {
    if (err?.ok === false) return err;
    return publicError(500, "ERROR_INTERNO");
  } finally {
    session.endSession();
  }
}

async function materializarAlojadoDesdeAnexo23(documento, adminUser, options = {}) {
  const { session = null, modoRegularizacion = false } = options;
  if (!documento) throw publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.codigo) !== "ANEXO_23") throw publicError(409, "CODIGO_INVALIDO");
  if (modoRegularizacion) {
    if (up(documento.estado) !== "CERRADO") throw publicError(409, "ESTADO_INVALIDO");
    if (!hasConformidadTipo(documento, "ADMIN_GENERAL")) {
      throw publicError(409, "CONFORMIDAD_ADMIN_GENERAL_REQUERIDA");
    }
  } else if (up(documento.estado) !== "EN_REVISION") {
    throw publicError(409, "ESTADO_INVALIDO");
  }
  if (!hasConformidadTipo(documento, "ALOJADO")) {
    throw publicError(409, "CONFORMIDAD_ALOJADO_REQUERIDA");
  }

  const alojadoId = idValue(documento.alojado);
  const alojamientoId = idValue(documento.alojamiento);
  const plazaId = idValue(documento.plaza);
  const asignacionId = idValue(documento.asignacion);

  if (!isObjectId(alojadoId)) throw publicError(409, "ALOJADO_REQUERIDO");
  if (!isObjectId(alojamientoId)) throw publicError(409, "ALOJAMIENTO_REQUERIDO");
  if (!isObjectId(plazaId)) throw publicError(409, "PLAZA_REQUERIDA");
  if (!isObjectId(asignacionId)) throw publicError(409, "ASIGNACION_REQUERIDA");

  const applySession = (query) => (session ? query.session(session) : query);
  const [alojado, plaza, asignacion] = await Promise.all([
    applySession(User.findById(alojadoId).select("+tokenVersion")),
    applySession(AlojamientoPlaza.findOne({ _id: plazaId, activo: { $ne: false } })),
    applySession(AsignacionAlojamiento.findById(asignacionId)),
  ]);

  if (!alojado) throw publicError(404, "ALOJADO_NO_DISPONIBLE");
  const roleAlojado = up(alojado.role);
  if (roleAlojado !== "POSTULANTE" && roleAlojado !== "ALOJADO") {
    throw publicError(
      409,
      "ROL_NO_MIGRABLE",
      "No se puede materializar ALOJADO porque el usuario posee un rol institucional no migrable automaticamente"
    );
  }

  if (!plaza) throw publicError(404, "PLAZA_NO_DISPONIBLE");
  if (!sameId(plaza.alojamiento, alojamientoId)) throw publicError(409, "PLAZA_INCONSISTENTE");
  const plazaEstado = up(plaza.estado);
  if (plazaEstado !== "RESERVADA" && plazaEstado !== "OCUPADA") {
    throw publicError(409, "PLAZA_NO_RESERVADA");
  }
  if (plaza.alojadoActual && !sameId(plaza.alojadoActual, alojadoId)) {
    throw publicError(409, "PLAZA_OCUPADA_POR_OTRO_USUARIO");
  }
  if (plaza.reservaActual?.usuario && !sameId(plaza.reservaActual.usuario, alojadoId)) {
    throw publicError(409, "RESERVA_INCONSISTENTE");
  }
  if (plaza.reservaActual?.anexoId && !sameId(plaza.reservaActual.anexoId, documento.derivadoDe)) {
    throw publicError(409, "RESERVA_DOCUMENTAL_INCONSISTENTE");
  }

  if (!asignacion) throw publicError(404, "ASIGNACION_NO_DISPONIBLE");
  if (!sameId(asignacion.alojado, alojadoId)) throw publicError(409, "ASIGNACION_ALOJADO_INCONSISTENTE");
  if (!sameId(asignacion.alojamiento, alojamientoId)) throw publicError(409, "ASIGNACION_ALOJAMIENTO_INCONSISTENTE");
  if (!sameId(asignacion.plaza, plazaId)) throw publicError(409, "ASIGNACION_PLAZA_INCONSISTENTE");
  const asignacionEstado = up(asignacion.estado);
  if (asignacionEstado !== "RESERVADA" && asignacionEstado !== "ACTIVA") {
    throw publicError(409, "ASIGNACION_ESTADO_INVALIDO");
  }

  const yaMaterializado =
    roleAlojado === "ALOJADO" &&
    up(alojado.estadoHabitacional) === "ALOJADO_ACTIVO" &&
    sameId(alojado.alojamientoAsignado, alojamientoId) &&
    up(plaza.estado) === "OCUPADA" &&
    sameId(plaza.alojadoActual, alojadoId) &&
    !plaza.reservaActual?.usuario &&
    asignacionEstado === "ACTIVA" &&
    Boolean(asignacion.fechaInicio);
  if (yaMaterializado) return { alojado, plaza, asignacion, yaMaterializado: true };

  const now = new Date();
  const actorId = isObjectId(adminUser?._id) ? adminUser._id : null;

  if (roleAlojado === "POSTULANTE") alojado.role = "ALOJADO";
  alojado.estadoHabitacional = "ALOJADO_ACTIVO";
  alojado.alojamientoAsignado = alojamientoId;
  if (typeof alojado.tokenVersion === "number") alojado.tokenVersion += 1;
  await alojado.save({ session });

  const estadoPlazaAnterior = plaza.estado;
  plaza.estado = "OCUPADA";
  plaza.alojadoActual = alojadoId;
  plaza.reservaActual = null;
  plaza.historial = Array.isArray(plaza.historial) ? plaza.historial : [];
  plaza.historial.push({
    fecha: now,
    accion: modoRegularizacion ? "REGULARIZACION_ANEXO_23" : "OCUPACION_ANEXO_23",
    alojado: alojadoId,
    estadoAnterior: estadoPlazaAnterior,
    estadoNuevo: "OCUPADA",
    anexoId: documento._id,
    realizadoPor: actorId,
    observacion: modoRegularizacion
      ? "Ocupacion regularizada desde ANEXO_23 cerrado."
      : "Ocupacion materializada por cierre ADMIN_GENERAL ANEXO_23.",
  });
  await plaza.save({ session });

  const estadoAsignacionAnterior = asignacion.estado;
  asignacion.estado = "ACTIVA";
  asignacion.fechaInicio = asignacion.fechaInicio || now;
  asignacion.actualizadoPor = actorId;
  asignacion.auditoria = Array.isArray(asignacion.auditoria) ? asignacion.auditoria : [];
  asignacion.auditoria.push({
    fecha: now,
    accion: modoRegularizacion ? "REGULARIZACION_ANEXO_23" : "ACTIVACION_ANEXO_23",
    actor: actorId,
    estadoAnterior: estadoAsignacionAnterior,
    estadoNuevo: "ACTIVA",
    observacion: modoRegularizacion
      ? "Asignacion regularizada desde ANEXO_23 cerrado."
      : "Asignacion activada por cierre ADMIN_GENERAL ANEXO_23.",
  });
  await asignacion.save({ session });

  return { alojado, plaza, asignacion };
}

module.exports = {
  generarDesdeAnexo22,
  actualizarDatos,
  enviar,
  conformidadAlojado,
  cerrarAnexo23,
  materializarAlojadoDesdeAnexo23,
};
