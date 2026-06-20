const mongoose = require("mongoose");
const { Notificacion, PRIORIDADES } = require("../models/Notificacion");

const MAX_TITULO = 120;
const MAX_MENSAJE = 800;
const MAX_ACCION_TEXTO = 80;
const MAX_ACCION_URL = 240;
const MAX_TIPO = 80;
const MAX_ENTIDAD_TIPO = 80;
const MAX_METADATA_KEYS = 20;

function trimLimit(value, max) {
  return String(value || "").trim().slice(0, max);
}

function isObjectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function objectIdOrNull(value) {
  return isObjectIdLike(value) ? new mongoose.Types.ObjectId(String(value)) : null;
}

function normalizePrioridad(value) {
  const normalized = String(value || "INFO").toUpperCase().trim();
  return PRIORIDADES.includes(normalized) ? normalized : "INFO";
}

function normalizeAccionUrl(value) {
  const url = trimLimit(value, MAX_ACCION_URL);
  if (!url) return "";
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\") || url.startsWith("/api/")) {
    return "";
  }
  return url;
}

function sanitizeMetadataSegura(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out = {};
  for (const key of Object.keys(value).slice(0, MAX_METADATA_KEYS)) {
    const normalizedKey = trimLimit(key, 60);
    if (!normalizedKey) continue;

    const raw = value[key];
    if (raw === null || raw === undefined) {
      out[normalizedKey] = raw;
    } else if (["string", "number", "boolean"].includes(typeof raw)) {
      out[normalizedKey] = typeof raw === "string" ? trimLimit(raw, 160) : raw;
    }
  }
  return out;
}

async function crearNotificacion({
  usuario,
  titulo,
  mensaje,
  tipo,
  prioridad,
  entidadTipo,
  entidadId,
  accionTexto,
  accionUrl,
  requiereConfirmacion,
  creadoPor,
  metadataSegura,
} = {}) {
  const usuarioId = objectIdOrNull(usuario);
  const tituloSafe = trimLimit(titulo, MAX_TITULO);
  const mensajeSafe = trimLimit(mensaje, MAX_MENSAJE);
  const tipoSafe = trimLimit(tipo, MAX_TIPO).toUpperCase();

  if (!usuarioId || !tituloSafe || !mensajeSafe || !tipoSafe) {
    throw new Error("NOTIFICACION_DATOS_INVALIDOS");
  }

  const entidadTipoSafe = trimLimit(entidadTipo, MAX_ENTIDAD_TIPO).toUpperCase();
  const entidadObjectId = objectIdOrNull(entidadId);

  if (entidadTipoSafe && entidadObjectId) {
    const existente = await Notificacion.findOne({
      usuario: usuarioId,
      entidadTipo: entidadTipoSafe,
      entidadId: entidadObjectId,
      tipo: tipoSafe,
    });
    if (existente) return existente;
  }

  return Notificacion.create({
    usuario: usuarioId,
    titulo: tituloSafe,
    mensaje: mensajeSafe,
    tipo: tipoSafe,
    prioridad: normalizePrioridad(prioridad),
    entidadTipo: entidadTipoSafe,
    entidadId: entidadObjectId,
    accionTexto: trimLimit(accionTexto, MAX_ACCION_TEXTO),
    accionUrl: normalizeAccionUrl(accionUrl),
    requiereConfirmacion: Boolean(requiereConfirmacion),
    creadoPor: objectIdOrNull(creadoPor),
    metadataSegura: sanitizeMetadataSegura(metadataSegura),
  });
}

module.exports = {
  crearNotificacion,
  normalizeAccionUrl,
};
