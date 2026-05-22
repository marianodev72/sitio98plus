const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const AlojamientoNaval = require("../../models/AlojamientoNaval");
const AlojamientoPlaza = require("../../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../../models/AsignacionAlojamiento");
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
  "lugarEntrega",
  "fechaEntrega",
  "material",
  "documentacion",
  "medidores",
  "estadoSistemas",
  "novedadesTexto",
  "observacionesInspector",
  "proximoDestinoAlojado",
  "lugarFirma",
  "fechaFirma",
  "horaFirma",
]);

const MATERIAL_KEYS = [
  "llavesEdificio",
  "llavesAlojamiento",
  "llavesBaulera",
  "llaveTerraza",
  "llaveCochera",
  "inventarioMuebles",
  "lineaTelefonica",
];
const DOCUMENTACION_KEYS = ["reglamentoAlojamientos", "guiaTelefonica", "reglamentoCopropiedad"];
const MEDIDOR_KEYS = ["gas_m3", "agua_m3", "luz_kws"];
const ESTADO_KEYS = [
  "agua",
  "cloacas",
  "electricidad",
  "gas",
  "pluviales",
  "telefono",
  "aberturas",
  "albanileria",
  "alfombras",
  "antenaTv",
  "calefactorEstufa",
  "calefonTermotanque",
  "carpinteria",
  "cerrajeria",
  "cocina",
  "desinfeccion",
  "herrajes",
  "limpieza",
  "lustrado",
  "parquesJardines",
  "pintura",
  "pisos",
  "porteroElectrico",
  "sanitarios",
  "vidrios",
  "estadoGeneral",
];

function publicError(status, code = "NO_DISPONIBLE", message = "No es posible procesar el ANEXO_26 en este momento.") {
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

function sameId(a, b) {
  return String(idValue(a) || "") === String(idValue(b) || "");
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

function pickObject(source, keys, sanitizer) {
  const obj = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  return Object.fromEntries(keys.map((key) => [key, sanitizer(obj[key])]));
}

function siNo(value) {
  const val = up(value);
  if (["SI", "SÍ", "TRUE", "1"].includes(val)) return "SI";
  if (["NO", "FALSE", "0"].includes(val)) return "NO";
  return "";
}

function mbbrm(value) {
  const val = up(value);
  return ["MB", "B", "R", "M"].includes(val) ? val : "";
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
  if (source.lugarEntrega !== undefined) out.lugarEntrega = trimText(source.lugarEntrega, 180);
  if (source.fechaEntrega !== undefined) out.fechaEntrega = trimText(source.fechaEntrega, 30);
  if (source.material !== undefined) out.material = pickObject(source.material, MATERIAL_KEYS, siNo);
  if (source.documentacion !== undefined) out.documentacion = pickObject(source.documentacion, DOCUMENTACION_KEYS, siNo);
  if (source.medidores !== undefined) out.medidores = pickObject(source.medidores, MEDIDOR_KEYS, (v) => trimText(v, 40));
  if (source.estadoSistemas !== undefined) out.estadoSistemas = pickObject(source.estadoSistemas, ESTADO_KEYS, mbbrm);
  if (source.novedadesTexto !== undefined) out.novedadesTexto = trimText(source.novedadesTexto, 12000);
  if (source.observacionesInspector !== undefined) out.observacionesInspector = trimText(source.observacionesInspector, 4000);
  if (source.proximoDestinoAlojado !== undefined) out.proximoDestinoAlojado = trimText(source.proximoDestinoAlojado, 300);
  if (source.lugarFirma !== undefined) out.lugarFirma = trimText(source.lugarFirma, 180);
  if (source.fechaFirma !== undefined) out.fechaFirma = trimText(source.fechaFirma, 30);
  if (source.horaFirma !== undefined) out.horaFirma = trimText(source.horaFirma, 20);
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
    gradoEscalafon: stringValue(huesped.gradoEscalafon, datos.gradoEscalafon, datos.gradoAlojado),
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

function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.hour}:${parts.minute}`;
}

async function generarDesdeAnexo25(documentoOrigen, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!documentoOrigen || up(documentoOrigen.codigo) !== "ANEXO_25") {
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
    codigo: "ANEXO_26",
    derivadoDe: documentoOrigen._id,
    activo: { $ne: false },
  });
  if (existente) return { ok: true, status: 200, documento: toResponse(existente) };

  const alojamientoSnapshot = snapshotAlojamiento(documentoOrigen);
  const plazaSnapshot = snapshotPlaza(documentoOrigen);
  const huesped = snapshotHuesped(documentoOrigen);
  const fecha = new Date();

  const documento = new AlojamientoDocumento({
    codigo: "ANEXO_26",
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
      lugarEntrega: alojamientoSnapshot.lugar,
      fechaEntrega: fecha,
      material: {},
      documentacion: {},
      medidores: {},
      estadoSistemas: {},
      novedadesTexto: "",
      observacionesInspector: "",
      observacionesAlojado: "",
      proximoDestinoAlojado: "",
      lugarFirma: alojamientoSnapshot.lugar,
      fechaFirma: localDate(fecha),
      horaFirma: localTime(fecha),
      conformidadInspector: {
        ok: true,
        fecha,
        usuario: user._id,
        observacion: "Acta de entrega generada por inspector de alojamientos.",
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
    observacion: "Generacion de ANEXO_26 por inspector de alojamientos.",
  });
  documento.signers.push({
    tipo: "INSPECTOR",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "INSPECTOR_ALOJAMIENTOS",
    fecha,
    fuente: "GENERACION_ANEXO_26",
  });
  documento.historialEstados.push({
    fecha,
    estadoNuevo: "ENVIADO",
    realizadoPor: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "ANEXO_26 generado y enviado por inspector de alojamientos desde ANEXO_25.",
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
    codigo: "ANEXO_26",
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
    tipo: "ACTUALIZACION_ANEXO_26",
    actor: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "Actualizacion de datos ANEXO_26 por inspector de alojamientos.",
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
    codigo: "ANEXO_26",
    activo: { $ne: false },
  });

  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isUsuarioVinculado(documento, user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "ENVIADO") return publicError(409, "ESTADO_INVALIDO");

  const ok = typeof payload?.ok === "boolean" ? payload.ok : payload?.datos?.ok;
  if (typeof ok !== "boolean") return publicError(400, "CONFORMIDAD_EXPLICITA_REQUERIDA");
  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAlojado, 1000);

  documento.datos = {
    ...(documento.datos || {}),
    observacionesAlojado: observacion,
    conformidadAlojado: {
      ok,
      fecha: new Date(),
      usuario: user._id,
      observacion,
    },
  };

  const conformidad = registrarConformidad(documento, {
    tipo: "ALOJADO",
    usuario: user._id,
    rol: "ALOJADO",
    ok,
    observacion,
  });
  if (!conformidad.ok) return publicError(400, "CONFORMIDAD_INVALIDA");

  documento.signers.push({
    tipo: "ALOJADO",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ALOJADO",
    fecha: new Date(),
    fuente: "CONFORMIDAD_ALOJADO_ANEXO_26",
  });

  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "ALOJADO",
    observacion: ok ? "Conformidad del alojado sobre ANEXO_26." : "Sin conformidad del alojado sobre ANEXO_26.",
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

async function actualizarOcupacionAlojamiento({ alojamientoId, alojadoId, plazaId, anexoId, actorId, now, session }) {
  const alojamiento = await AlojamientoNaval.findOne({
    _id: alojamientoId,
    activo: { $ne: false },
  }).session(session);

  if (!alojamiento) throw publicError(404, "ALOJAMIENTO_NO_DISPONIBLE");

  const plazas = await AlojamientoPlaza.find({
    alojamiento: alojamientoId,
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
  const yaRegistrado = alojamiento.historialOcupacion.some(
    (item) => up(item?.accion) === "LIBERACION_ANEXO_26" && sameId(item?.anexoId, anexoId)
  );
  if (!yaRegistrado) {
    alojamiento.historialOcupacion.push({
      fecha: now,
      accion: "LIBERACION_ANEXO_26",
      alojado: alojadoId,
      plaza: plazaId,
      estadoAnterior: "OCUPADA",
      estadoNuevo: "LIBRE",
      anexoId,
      realizadoPor: actorId,
      observacion: "Ocupacion finalizada por cierre ADMIN_GENERAL ANEXO_26.",
    });
  }

  await alojamiento.save({ session });
}

async function liberarOcupacionDesdeAnexo26(documento, adminUser, { session, now }) {
  const { User: UserModel } = require("../../../../models/user");
  const alojadoId = idValue(documento?.alojado);
  const alojamientoId = idValue(documento?.alojamiento);
  const plazaId = idValue(documento?.plaza);
  const asignacionId = idValue(documento?.asignacion);
  const actorId = idValue(adminUser?._id);

  if (!isObjectId(alojadoId)) throw publicError(409, "ALOJADO_REQUERIDO");
  if (!isObjectId(alojamientoId)) throw publicError(409, "ALOJAMIENTO_REQUERIDO");
  if (!isObjectId(plazaId)) throw publicError(409, "PLAZA_REQUERIDA");
  if (!isObjectId(asignacionId)) throw publicError(409, "ASIGNACION_REQUERIDA");

  const asignacion = await AsignacionAlojamiento.findById(asignacionId).session(session);
  const plaza = await AlojamientoPlaza.findOne({ _id: plazaId, activo: { $ne: false } }).session(session);
  const alojado = await UserModel.findById(alojadoId).select("+tokenVersion").session(session);

  if (!asignacion) throw publicError(404, "ASIGNACION_NO_DISPONIBLE");
  if (!plaza) throw publicError(404, "PLAZA_NO_DISPONIBLE");
  if (!alojado) throw publicError(404, "ALOJADO_NO_DISPONIBLE");

  if (!sameId(asignacion.alojado, alojadoId)) throw publicError(409, "ASIGNACION_ALOJADO_INCONSISTENTE");
  if (!sameId(asignacion.alojamiento, alojamientoId)) throw publicError(409, "ASIGNACION_ALOJAMIENTO_INCONSISTENTE");
  if (!sameId(asignacion.plaza, plazaId)) throw publicError(409, "ASIGNACION_PLAZA_INCONSISTENTE");
  if (!sameId(plaza.alojamiento, alojamientoId)) throw publicError(409, "PLAZA_ALOJAMIENTO_INCONSISTENTE");

  const asignacionEstado = up(asignacion.estado);
  const plazaEstado = up(plaza.estado);
  const userRole = up(alojado.role);
  const userEstadoHabitacional = up(alojado.estadoHabitacional);
  const reservaVacia = !plaza.reservaActual || (!plaza.reservaActual.usuario && !plaza.reservaActual.anexoId);
  const finalizacionPorEsteAnexo = Array.isArray(asignacion.auditoria) && asignacion.auditoria.some(
    (item) => up(item?.accion) === "FINALIZACION_ANEXO_26" && String(item?.observacion || "").includes(String(documento._id))
  );

  const yaFinalizada = asignacionEstado === "FINALIZADA";
  const plazaYaLibre = plazaEstado === "LIBRE" && !plaza.alojadoActual && reservaVacia;
  const usuarioYaPostulante =
    userRole === "POSTULANTE" &&
    userEstadoHabitacional === "POSTULANTE" &&
    !alojado.alojamientoAsignado;

  if (!yaFinalizada && asignacionEstado !== "ACTIVA") throw publicError(409, "ASIGNACION_ESTADO_INVALIDO");
  if (yaFinalizada && !finalizacionPorEsteAnexo) throw publicError(409, "ASIGNACION_FINALIZADA_SIN_EVIDENCIA_ANEXO_26");
  if (!plazaYaLibre) {
    if (plazaEstado !== "OCUPADA") throw publicError(409, "PLAZA_ESTADO_INVALIDO");
    if (!sameId(plaza.alojadoActual, alojadoId)) throw publicError(409, "PLAZA_OCUPADA_POR_OTRO_USUARIO");
    if (!reservaVacia) throw publicError(409, "PLAZA_CON_RESERVA_ACTIVA");
  }
  if (!usuarioYaPostulante) {
    if (userRole !== "ALOJADO" && userRole !== "POSTULANTE") throw publicError(409, "ROL_NO_MIGRABLE");
    if (alojado.alojamientoAsignado && !sameId(alojado.alojamientoAsignado, alojamientoId)) {
      throw publicError(409, "ALOJAMIENTO_USUARIO_INCONSISTENTE");
    }
  }

  if (!yaFinalizada) {
    asignacion.estado = "FINALIZADA";
    asignacion.fechaFin = asignacion.fechaFin || now;
    asignacion.actualizadoPor = actorId;
  } else if (!asignacion.fechaFin) {
    asignacion.fechaFin = now;
  }
  asignacion.auditoria = Array.isArray(asignacion.auditoria) ? asignacion.auditoria : [];
  const auditoriaExiste = finalizacionPorEsteAnexo;
  if (!auditoriaExiste) {
    asignacion.auditoria.push({
      fecha: now,
      accion: "FINALIZACION_ANEXO_26",
      actor: actorId,
      estadoAnterior: yaFinalizada ? "FINALIZADA" : asignacionEstado,
      estadoNuevo: "FINALIZADA",
      observacion: `Asignacion finalizada por cierre ADMIN_GENERAL ANEXO_26 ${documento._id}.`,
    });
  }
  await asignacion.save({ session });

  if (!plazaYaLibre) {
    plaza.estado = "LIBRE";
    plaza.alojadoActual = null;
    plaza.reservaActual = null;
  }
  plaza.historial = Array.isArray(plaza.historial) ? plaza.historial : [];
  const historialPlazaExiste = plaza.historial.some(
    (item) => up(item?.accion) === "LIBERACION_ANEXO_26" && sameId(item?.anexoId, documento._id)
  );
  if (!historialPlazaExiste) {
    plaza.historial.push({
      fecha: now,
      accion: "LIBERACION_ANEXO_26",
      alojado: alojadoId,
      estadoAnterior: plazaYaLibre ? "LIBRE" : plazaEstado,
      estadoNuevo: "LIBRE",
      anexoId: documento._id,
      realizadoPor: actorId,
      observacion: "Plaza liberada por cierre ADMIN_GENERAL ANEXO_26.",
    });
  }
  await plaza.save({ session });

  if (!usuarioYaPostulante) {
    alojado.role = "POSTULANTE";
    alojado.estadoHabitacional = "POSTULANTE";
    alojado.alojamientoAsignado = null;
    if (typeof alojado.tokenVersion === "number") alojado.tokenVersion += 1;
  }
  await alojado.save({ session });

  await actualizarOcupacionAlojamiento({
    alojamientoId,
    alojadoId,
    plazaId,
    anexoId: documento._id,
    actorId,
    now,
    session,
  });
}

async function cerrarAnexo26(id, payload = {}, user) {
  if (!isObjectId(user?._id)) return publicError(403, "USUARIO_NO_AUTORIZADO");
  if (!isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAdminGeneral, 1000);
  const session = await AlojamientoDocumento.startSession();

  try {
    let cerrado = null;

    await session.withTransaction(async () => {
      const documento = await AlojamientoDocumento.findOne({
        _id: id,
        codigo: "ANEXO_26",
        activo: { $ne: false },
      }).session(session);

      if (!documento) throw publicError(404, "DOCUMENTO_NO_DISPONIBLE");
      if (up(documento.codigo) !== "ANEXO_26") throw publicError(404, "DOCUMENTO_NO_DISPONIBLE");
      if (up(documento.estado) !== "EN_REVISION") throw publicError(409, "ESTADO_INVALIDO");
      if (documento.datos?.conformidadAlojado?.ok !== true) {
        throw publicError(409, "CONFORMIDAD_ALOJADO_REQUERIDA");
      }

      const now = new Date();

      await liberarOcupacionDesdeAnexo26(documento, user, { session, now });

      documento.datos = {
        ...(documento.datos || {}),
        observacionesAdminGeneral: observacion,
        conformidadAdminGeneral: {
          ok: true,
          fecha: now,
          usuario: user._id,
          observacion: observacion || "Cierre ADMIN_GENERAL del ANEXO_26 y liberacion de ocupacion.",
        },
      };

      const conformidad = registrarConformidad(documento, {
        tipo: "ADMIN_GENERAL",
        usuario: user._id,
        rol: "ADMIN_GENERAL",
        ok: true,
        observacion: observacion || "Cierre ADMIN_GENERAL del ANEXO_26 y liberacion de ocupacion.",
      });
      if (!conformidad.ok) throw publicError(400, "CONFORMIDAD_INVALIDA");

      documento.signers = Array.isArray(documento.signers) ? documento.signers : [];
      const signerExiste = documento.signers.some(
        (item) => up(item?.tipo) === "ADMIN_GENERAL" && up(item?.fuente) === "CIERRE_ADMIN_GENERAL_ANEXO_26"
      );
      if (!signerExiste) {
        documento.signers.push({
          tipo: "ADMIN_GENERAL",
          usuario: user._id,
          nombre: nombreDesdeUsuario(user),
          rol: "ADMIN_GENERAL",
          fecha: now,
          fuente: "CIERRE_ADMIN_GENERAL_ANEXO_26",
        });
      }

      const transition = registrarCambioEstado(documento, {
        estadoNuevo: "CERRADO",
        actorId: user._id,
        rolActor: "ADMIN_GENERAL",
        observacion: "Cierre ADMIN_GENERAL ANEXO_26 y liberacion de ocupacion.",
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

module.exports = {
  generarDesdeAnexo25,
  actualizarDatos,
  conformidadAlojado,
  cerrarAnexo26,
};
