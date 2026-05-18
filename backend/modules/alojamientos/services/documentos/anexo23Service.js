const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const { agregarInterviniente, up } = require("./alojamientoDocumentoStateService");
const { sanitizeDatosDocumento } = require("./alojamientoDocumentoSanitizer");

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
      autorizacionDescuento: false,
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

module.exports = {
  generarDesdeAnexo22,
};
