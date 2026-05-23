const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
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
  puedeVerDocumentoPorTerritorio,
} = require("./alojamientoDocumentoVisibilityService");

const EDITABLE_SOLICITANTE = new Set([
  "solicitaCambio",
  "solicitaReparacion",
  "solicitaVerificacion",
  "solicitaProvision",
  "descripcionSolicitud",
  "lugarFirma",
  "fechaFirma",
]);

const EDITABLE_INSPECTOR = new Set([
  "emergencia",
  "correspondeAlojado",
  "novedadesActaAnterior",
  "descripcionTrabajo",
  "cargoAlojado",
  "cargoAlcaldia",
  "razonSeguridad",
  "razonPreservacion",
  "razonPresentacion",
  "observacionesInspector",
  "informeTecnico",
  "estimacion",
  "autorizacion",
  "verificacionInspector",
  "prioridadInspector",
  "decisionInspector",
  "motivoRechazo",
  "visitasProgramadas",
  "nuevaVisita",
  "fechaProgramadaTrabajo",
  "responsableTrabajo",
  "descripcionTecnicaTrabajo",
  "trabajoFinalizadoInspector",
  "fechaFinalizacionInspector",
  "observacionFinalInspector",
]);

function publicError(status, code = "NO_DISPONIBLE", message = "No es posible procesar el ANEXO_28 en este momento.") {
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
  return Boolean(a && b && String(idValue(a)) === String(idValue(b)));
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

function boolValue(value) {
  return value === true;
}

function sanitizeList(value, max = 30) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, max)
    .map((item) => trimText(item, 500))
    .filter(Boolean);
}

function sanitizeVisita(value, userId) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const fechaProgramada = trimText(source.fechaProgramada, 40);
  const observacion = trimText(source.observacion, 1000);
  if (!fechaProgramada && !observacion) return null;
  return {
    fechaProgramada: fechaProgramada || null,
    observacion,
    creadoPor: userId || null,
    fechaRegistro: new Date().toISOString(),
  };
}

function nombreDesdeUsuario(user) {
  if (!user || typeof user !== "object") return "";
  return stringValue(user.nombreCompleto, [user.apellido, user.nombre || user.nombres].filter(Boolean).join(", "));
}

function sanitizeSolicitantePayload(payload = {}) {
  const source =
    payload?.datos && typeof payload.datos === "object" && !Array.isArray(payload.datos)
      ? payload.datos
      : payload;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  if (!Object.keys(source).every((key) => EDITABLE_SOLICITANTE.has(key))) return null;

  return {
    solicita: {
      cambio: boolValue(source.solicitaCambio),
      reparacion: boolValue(source.solicitaReparacion),
      verificacion: boolValue(source.solicitaVerificacion),
      provision: boolValue(source.solicitaProvision),
    },
    descripcionSolicitud: trimText(source.descripcionSolicitud, 4000),
    lugarFirma: trimText(source.lugarFirma, 180),
    fechaFirma: trimText(source.fechaFirma, 30),
  };
}

function sanitizeInspectorPayload(payload = {}) {
  const source =
    payload?.datos && typeof payload.datos === "object" && !Array.isArray(payload.datos)
      ? payload.datos
      : payload;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  if (!Object.keys(source).every((key) => EDITABLE_INSPECTOR.has(key))) return null;

  return {
    bloqueInspector: {
      emergencia: boolValue(source.emergencia),
      correspondeAlojado: boolValue(source.correspondeAlojado),
      novedadesActaAnterior: boolValue(source.novedadesActaAnterior),
      descripcionTrabajo: trimText(source.descripcionTrabajo, 4000),
    },
    bloqueAdministrativo: {
      cargoAlojado: boolValue(source.cargoAlojado),
      cargoAlcaldia: boolValue(source.cargoAlcaldia),
      razonSeguridad: boolValue(source.razonSeguridad),
      razonPreservacion: boolValue(source.razonPreservacion),
      razonPresentacion: boolValue(source.razonPresentacion),
    },
    observacionesInspector: trimText(source.observacionesInspector, 3000),
    informeTecnico: trimText(source.informeTecnico, 3000),
    estimacion: trimText(source.estimacion, 1000),
    autorizacion: trimText(source.autorizacion, 1000),
    verificacionInspector: trimText(source.verificacionInspector, 1000),
    prioridadInspector: ["URGENTE", "ALTA", "MEDIA", "BAJA"].includes(up(source.prioridadInspector))
      ? up(source.prioridadInspector)
      : "",
    decisionInspector: ["APROBADO", "RECHAZADO", "OBSERVADO"].includes(up(source.decisionInspector))
      ? up(source.decisionInspector)
      : "",
    motivoRechazo: trimText(source.motivoRechazo, 1000),
    visitasProgramadas: Array.isArray(source.visitasProgramadas)
      ? source.visitasProgramadas.map((item) => sanitizeVisita(item)).filter(Boolean).slice(0, 50)
      : null,
    nuevaVisita: sanitizeVisita(source.nuevaVisita, null),
    fechaProgramadaTrabajo: trimText(source.fechaProgramadaTrabajo, 40),
    responsableTrabajo: trimText(source.responsableTrabajo, 180),
    descripcionTecnicaTrabajo: trimText(source.descripcionTecnicaTrabajo, 3000),
    trabajoFinalizadoInspector: source.trabajoFinalizadoInspector === true,
    fechaFinalizacionInspector: trimText(source.fechaFinalizacionInspector, 40),
    observacionFinalInspector: trimText(source.observacionFinalInspector, 2000),
  };
}

function snapshotAlojamiento(alojamiento) {
  return {
    alojamientoCodigo: stringValue(alojamiento?.codigo),
    edificio: stringValue(alojamiento?.numero, alojamiento?.sector),
    predio: stringValue(alojamiento?.lugar),
    lugar: stringValue(alojamiento?.lugar),
    localidad: stringValue(alojamiento?.localidad),
    provincia: stringValue(alojamiento?.provincia),
    dependencia: stringValue(alojamiento?.dependencia),
    sector: stringValue(alojamiento?.sector),
    tipo: stringValue(alojamiento?.tipo),
    clase: stringValue(alojamiento?.clase),
  };
}

function snapshotPlaza(plaza) {
  return {
    plazaCodigo: stringValue(plaza?.codigo),
    numeroPlaza: plaza?.numeroPlaza ?? null,
  };
}

function snapshotHuesped(user) {
  return {
    nombreCompleto: nombreDesdeUsuario(user),
    apellido: stringValue(user?.apellido),
    nombres: stringValue(user?.nombre, user?.nombres),
    gradoEscalafon: stringValue(user?.gradoEscalafon, user?.grado),
    destinoActual: stringValue(user?.destinoActual, user?.destino),
    genero: stringValue(user?.genero, user?.sexo),
  };
}

function solicitudTieneContenido(datos = {}) {
  const solicita = datos.solicita || {};
  return Boolean(
    trimText(datos.descripcionSolicitud, 1) ||
      solicita.cambio ||
      solicita.reparacion ||
      solicita.verificacion ||
      solicita.provision
  );
}

function gestionTecnicaMinima(datos = {}) {
  return Boolean(
    trimText(datos?.bloqueInspector?.descripcionTrabajo, 1) ||
      trimText(datos?.observacionesInspector, 1) ||
      trimText(datos?.decisionInspector, 1)
  );
}

function addInspectorHistory(documento, datos, user) {
  const partes = [
    datos.decisionInspector ? `Decision: ${datos.decisionInspector}` : "",
    datos.prioridadInspector ? `Prioridad: ${datos.prioridadInspector}` : "",
    datos.observacionesInspector ? `Obs: ${datos.observacionesInspector}` : "",
    datos.bloqueInspector?.descripcionTrabajo ? `Trabajo: ${datos.bloqueInspector.descripcionTrabajo}` : "",
    datos.trabajoFinalizadoInspector ? "Trabajo finalizado" : "",
  ].filter(Boolean);
  if (!partes.length) return;

  const historial = Array.isArray(documento.datos?.observacionesInspectorHistorial)
    ? documento.datos.observacionesInspectorHistorial
    : [];
  historial.push({
    fecha: new Date().toISOString(),
    texto: partes.join(" | "),
    usuario: user?._id || null,
  });
  documento.datos.observacionesInspectorHistorial = historial.slice(-80);
}

function buildNumero() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `A28-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function isUsuarioVinculado(documento, user) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;
  if (String(idValue(documento.alojado) || "") === userId) return true;
  if (String(idValue(documento.solicitante) || "") === userId) return true;
  if (String(idValue(documento.creadoPor) || "") === userId) return true;
  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => String(idValue(item?.userId) || "") === userId);
}

function canInspect(user, documento) {
  if (!isObjectId(user?._id) || !isInspectorAlojamientos(user)) return false;
  return puedeVerDocumentoPorTerritorio(user, documento);
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

async function cargarAsignacionActivaPorAlojado(userId) {
  return AsignacionAlojamiento.findOne({
    alojado: userId,
    estado: "ACTIVA",
  })
    .populate({ path: "alojamiento", select: "codigo dependencia lugar sector tipo numero clase localidad provincia" })
    .populate({ path: "plaza", select: "codigo numeroPlaza estado alojadoActual alojamiento reservaActual" });
}

async function cargarAsignacionActivaPorId(id) {
  if (!isObjectId(id)) return null;
  return AsignacionAlojamiento.findOne({
    _id: id,
    estado: "ACTIVA",
  })
    .populate({ path: "alojamiento", select: "codigo dependencia lugar sector tipo numero clase localidad provincia" })
    .populate({ path: "plaza", select: "codigo numeroPlaza estado alojadoActual alojamiento reservaActual" });
}

function validarAsignacionActiva(asignacion) {
  if (!asignacion || up(asignacion.estado) !== "ACTIVA") return false;
  if (!asignacion.alojado || !asignacion.alojamiento || !asignacion.plaza) return false;
  if (!sameId(asignacion.plaza?.alojadoActual, asignacion.alojado)) return false;
  if (!sameId(asignacion.plaza?.alojamiento, asignacion.alojamiento)) return false;
  return up(asignacion.plaza?.estado) === "OCUPADA";
}

async function crearDocumentoDesdeAsignacion({ asignacion, alojado, user, promotorTipo, datosSolicitante, estado }) {
  const fecha = new Date();
  const alojamientoSnapshot = snapshotAlojamiento(asignacion.alojamiento);
  const plazaSnapshot = snapshotPlaza(asignacion.plaza);
  const huesped = snapshotHuesped(alojado);
  const documento = new AlojamientoDocumento({
    codigo: "ANEXO_28",
    estado,
    estadoInstitucional: estado === "BORRADOR" ? "BORRADOR_SOLICITANTE" : "PEDIDO_PRESENTADO",
    alojamiento: idValue(asignacion.alojamiento),
    plaza: idValue(asignacion.plaza),
    asignacion: asignacion._id,
    solicitante: idValue(alojado),
    alojado: idValue(alojado),
    inspector: promotorTipo === "INSPECTOR" ? user._id : null,
    creadoPor: user._id,
    actualizadoPor: user._id,
    datos: {
      numeroPedidoTrabajo: buildNumero(),
      huesped,
      alojamientoSnapshot,
      plazaSnapshot,
      promotor: {
        tipo: promotorTipo,
        nombre: nombreDesdeUsuario(user) || (promotorTipo === "ALOJADO" ? "Alojado" : "Inspector de alojamiento"),
        rol: promotorTipo === "ALOJADO" ? "ALOJADO" : "INSPECTOR_ALOJAMIENTOS",
      },
      solicita: datosSolicitante.solicita,
      descripcionSolicitud: datosSolicitante.descripcionSolicitud,
      lugarFirma: datosSolicitante.lugarFirma || alojamientoSnapshot.lugar,
      fechaFirma: datosSolicitante.fechaFirma || fecha,
      bloqueInspector: {},
      bloqueAdministrativo: {},
      observacionesInspector: "",
      observacionesAdminGeneral: "",
    },
  });

  agregarInterviniente(documento, idValue(alojado), "ALOJADO");
  if (promotorTipo === "INSPECTOR") agregarInterviniente(documento, user._id, "INSPECTOR");
  documento.historialEstados.push({
    fecha,
    estadoNuevo: estado,
    realizadoPor: user._id,
    rolActor: promotorTipo === "ALOJADO" ? "ALOJADO" : "INSPECTOR_ALOJAMIENTOS",
    observacion:
      promotorTipo === "ALOJADO"
        ? "ANEXO_28 creado por alojado."
        : "ANEXO_28 generado por inspector de alojamientos.",
  });

  if (estado === "ENVIADO") {
    documento.signers.push({
      tipo: "INSPECTOR",
      usuario: user._id,
      nombre: nombreDesdeUsuario(user),
      rol: "INSPECTOR_ALOJAMIENTOS",
      fecha,
      fuente: "GENERACION_ANEXO_28",
    });
  }

  await documento.save();
  return documento;
}

async function crearPorAlojado(payload, user) {
  if (!isObjectId(user?._id) || !isAlojado(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  const datosSolicitante = sanitizeSolicitantePayload(payload);
  if (!datosSolicitante) return publicError(400, "PAYLOAD_INVALIDO");

  const asignacion = await cargarAsignacionActivaPorAlojado(user._id);
  if (!validarAsignacionActiva(asignacion)) return publicError(404, "OCUPACION_NO_DISPONIBLE");

  const alojado = await User.findById(user._id).select("nombre apellido nombres grado gradoEscalafon destino destinoActual genero sexo");
  if (!alojado) return publicError(404, "ALOJADO_NO_DISPONIBLE");

  try {
    const documento = await crearDocumentoDesdeAsignacion({
      asignacion,
      alojado,
      user,
      promotorTipo: "ALOJADO",
      datosSolicitante,
      estado: "BORRADOR",
    });
    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function crearPorInspector(payload, user) {
  if (!isObjectId(user?._id) || !isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  const datosSolicitante = sanitizeSolicitantePayload(payload);
  if (!datosSolicitante) return publicError(400, "PAYLOAD_INVALIDO");

  const asignacionId = payload?.asignacionId || payload?.datos?.asignacionId;
  const asignacion = await cargarAsignacionActivaPorId(asignacionId);
  if (!validarAsignacionActiva(asignacion)) return publicError(404, "OCUPACION_NO_DISPONIBLE");

  const documentoTerritorio = {
    alojamiento: asignacion.alojamiento,
    datos: { alojamientoSnapshot: snapshotAlojamiento(asignacion.alojamiento) },
  };
  if (!puedeVerDocumentoPorTerritorio(user, documentoTerritorio)) return publicError(404, "OCUPACION_NO_DISPONIBLE");

  const alojado = await User.findById(asignacion.alojado).select("nombre apellido nombres grado gradoEscalafon destino destinoActual genero sexo");
  if (!alojado) return publicError(404, "ALOJADO_NO_DISPONIBLE");

  try {
    const documento = await crearDocumentoDesdeAsignacion({
      asignacion,
      alojado,
      user,
      promotorTipo: "INSPECTOR",
      datosSolicitante,
      estado: "ENVIADO",
    });
    return { ok: true, status: 201, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function actualizarBorrador(id, payload, user) {
  if (!isObjectId(user?._id) || !isAlojado(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  const datos = sanitizeSolicitantePayload(payload);
  if (!datos) return publicError(400, "PAYLOAD_INVALIDO");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isUsuarioVinculado(documento, user) || !sameId(documento.creadoPor, user._id)) {
    return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  }
  if (up(documento.estado) !== "BORRADOR") return publicError(409, "ESTADO_INVALIDO");

  documento.datos = { ...(documento.datos || {}), ...datos };
  documento.actualizadoPor = user._id;
  documento.intervenciones.push({
    tipo: "ACTUALIZACION_ANEXO_28",
    actor: user._id,
    rolActor: "ALOJADO",
    observacion: "Actualizacion de pedido de trabajo ANEXO_28.",
  });

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function enviar(id, user) {
  if (!isObjectId(user?._id) || !isAlojado(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isUsuarioVinculado(documento, user) || !sameId(documento.creadoPor, user._id)) {
    return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  }
  if (up(documento.estado) !== "BORRADOR") return publicError(409, "ESTADO_INVALIDO");
  if (!solicitudTieneContenido(documento.datos || {})) return publicError(400, "SOLICITUD_INCOMPLETA");

  documento.signers.push({
    tipo: "ALOJADO",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ALOJADO",
    fecha: new Date(),
    fuente: "ENVIO_ANEXO_28",
  });
  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "ENVIADO",
    actorId: user._id,
    rolActor: "ALOJADO",
    observacion: "Envio de ANEXO_28 por alojado.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");
  documento.estadoInstitucional = "PEDIDO_PRESENTADO";
  documento.actualizadoPor = user._id;

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function guardarGestionInspector(id, payload, user) {
  if (!isObjectId(user?._id) || !isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  const datos = sanitizeInspectorPayload(payload);
  if (!datos) return publicError(400, "PAYLOAD_INVALIDO");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } })
    .populate({ path: "alojamiento", select: "lugar codigo dependencia sector tipo numero" });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!canInspect(user, documento)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!["ENVIADO", "DEVUELTO_A_INSPECTOR"].includes(up(documento.estado))) {
    return publicError(409, "ESTADO_INVALIDO");
  }

  const visitasActuales = Array.isArray(documento.datos?.visitasProgramadas) ? documento.datos.visitasProgramadas : [];
  const visitasProgramadas = Array.isArray(datos.visitasProgramadas) ? datos.visitasProgramadas : visitasActuales;
  if (datos.nuevaVisita) visitasProgramadas.push({ ...datos.nuevaVisita, creadoPor: user._id });

  documento.datos = {
    ...(documento.datos || {}),
    bloqueInspector: datos.bloqueInspector,
    bloqueAdministrativo: datos.bloqueAdministrativo,
    observacionesInspector: datos.observacionesInspector,
    informeTecnico: datos.informeTecnico,
    estimacion: datos.estimacion,
    autorizacion: datos.autorizacion,
    verificacionInspector: datos.verificacionInspector,
    prioridadInspector: datos.prioridadInspector,
    decisionInspector: datos.decisionInspector,
    motivoRechazo: datos.motivoRechazo,
    visitasProgramadas: visitasProgramadas.slice(0, 50),
    fechaProgramadaTrabajo: datos.fechaProgramadaTrabajo,
    responsableTrabajo: datos.responsableTrabajo,
    descripcionTecnicaTrabajo: datos.descripcionTecnicaTrabajo,
    trabajoFinalizadoInspector: datos.trabajoFinalizadoInspector,
    fechaFinalizacionInspector: datos.fechaFinalizacionInspector,
    observacionFinalInspector: datos.observacionFinalInspector,
    inspector: {
      nombre: nombreDesdeUsuario(user) || "Inspector de alojamiento",
    },
  };
  addInspectorHistory(documento, documento.datos, user);
  agregarInterviniente(documento, user._id, "INSPECTOR");
  documento.intervenciones.push({
    tipo: "GESTION_INSPECTOR_ANEXO_28",
    actor: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "Gestion tecnica ANEXO_28 guardada por inspector de alojamientos.",
  });
  documento.actualizadoPor = user._id;

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function enviarRevisionInspector(id, user) {
  if (!isObjectId(user?._id) || !isInspectorAlojamientos(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } })
    .populate({ path: "alojamiento", select: "lugar codigo dependencia sector tipo numero" });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!canInspect(user, documento)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!["ENVIADO", "DEVUELTO_A_INSPECTOR"].includes(up(documento.estado))) {
    return publicError(409, "ESTADO_INVALIDO");
  }
  if (!gestionTecnicaMinima(documento.datos || {})) return publicError(400, "GESTION_TECNICA_REQUERIDA");

  documento.datos = {
    ...(documento.datos || {}),
    inspector: {
      nombre: nombreDesdeUsuario(user) || "Inspector de alojamiento",
    },
    conformidadInspector: {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: documento.datos?.observacionesInspector || documento.datos?.decisionInspector || "",
    },
  };
  agregarInterviniente(documento, user._id, "INSPECTOR");
  registrarConformidad(documento, {
    tipo: "INSPECTOR",
    usuario: user._id,
    rol: "INSPECTOR_ALOJAMIENTOS",
    ok: true,
    observacion: documento.datos?.observacionesInspector || documento.datos?.decisionInspector || "",
  });
  documento.signers.push({
    tipo: "INSPECTOR",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "INSPECTOR_ALOJAMIENTOS",
    fecha: new Date(),
    fuente: "REVISION_INSPECTOR_ANEXO_28",
  });
  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "EN_REVISION",
    actorId: user._id,
    rolActor: "INSPECTOR_ALOJAMIENTOS",
    observacion: "Revision tecnica del inspector sobre ANEXO_28.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");
  documento.estadoInstitucional = "EN_REVISION_ADMIN_GENERAL";
  documento.actualizadoPor = user._id;

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function revisarPorInspector(id, payload, user) {
  return guardarGestionInspector(id, payload, user);
}

async function cerrarAnexo28(id, payload = {}, user) {
  if (!isObjectId(user?._id) || !isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "EN_REVISION") return publicError(409, "ESTADO_INVALIDO");
  if (documento.datos?.conformidadInspector?.ok !== true) return publicError(409, "REVISION_INSPECTOR_REQUERIDA");

  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAdminGeneral, 1000);
  const historialAdmin = Array.isArray(documento.datos?.observacionesAdminGeneralHistorial)
    ? documento.datos.observacionesAdminGeneralHistorial
    : [];
  if (observacion) {
    historialAdmin.push({
      fecha: new Date().toISOString(),
      texto: observacion,
      usuario: user._id,
      accion: "CERRAR",
    });
  }
  documento.datos = {
    ...(documento.datos || {}),
    observacionesAdminGeneral: observacion,
    observacionesAdminGeneralHistorial: historialAdmin.slice(-80),
    conformidadAdminGeneral: {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion,
    },
  };
  registrarConformidad(documento, {
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    rol: "ADMIN_GENERAL",
    ok: true,
    observacion,
  });
  documento.signers.push({
    tipo: "ADMIN_GENERAL",
    usuario: user._id,
    nombre: nombreDesdeUsuario(user),
    rol: "ADMIN_GENERAL",
    fecha: new Date(),
    fuente: "CIERRE_ADMIN_GENERAL_ANEXO_28",
  });
  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "CERRADO",
    actorId: user._id,
    rolActor: "ADMIN_GENERAL",
    observacion: "Cierre ADMIN_GENERAL ANEXO_28.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");
  documento.estadoInstitucional = "CERRADO_ADMIN_GENERAL";
  documento.actualizadoPor = user._id;

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

async function devolverAInspector(id, payload = {}, user) {
  if (!isObjectId(user?._id) || !isAdminGeneral(user)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (!isObjectId(id)) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({ _id: id, codigo: "ANEXO_28", activo: { $ne: false } });
  if (!documento) return publicError(404, "DOCUMENTO_NO_DISPONIBLE");
  if (up(documento.estado) !== "EN_REVISION") return publicError(409, "ESTADO_INVALIDO");

  const observacion = trimText(payload?.observacion || payload?.datos?.observacionesAdminGeneral, 1000);
  const historialAdmin = Array.isArray(documento.datos?.observacionesAdminGeneralHistorial)
    ? documento.datos.observacionesAdminGeneralHistorial
    : [];
  if (observacion) {
    historialAdmin.push({
      fecha: new Date().toISOString(),
      texto: observacion,
      usuario: user._id,
      accion: "DEVOLVER_A_INSPECTOR",
    });
  }
  documento.datos = {
    ...(documento.datos || {}),
    observacionesAdminGeneral: observacion,
    observacionesAdminGeneralHistorial: historialAdmin.slice(-80),
    devueltoAInspector: {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    },
  };
  const transition = registrarCambioEstado(documento, {
    estadoNuevo: "DEVUELTO_A_INSPECTOR",
    actorId: user._id,
    rolActor: "ADMIN_GENERAL",
    observacion: observacion || "Devolucion a inspector ANEXO_28.",
  });
  if (!transition.ok) return publicError(409, "TRANSICION_INVALIDA");
  documento.estadoInstitucional = "DEVUELTO_A_INSPECTOR";
  documento.actualizadoPor = user._id;

  try {
    await documento.save();
    return { ok: true, status: 200, documento: toResponse(documento) };
  } catch {
    return publicError(500, "ERROR_INTERNO");
  }
}

module.exports = {
  crearPorAlojado,
  crearPorInspector,
  actualizarBorrador,
  enviar,
  guardarGestionInspector,
  enviarRevisionInspector,
  revisarPorInspector,
  cerrarAnexo28,
  devolverAInspector,
};
