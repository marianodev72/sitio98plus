const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const { up } = require("./alojamientoDocumentoStateService");
const { puedeVerDocumento } = require("./alojamientoDocumentoVisibilityService");
const { MAX_FILE_SIZE } = require("../../middleware/alojamientoDocumentoUpload");

const CODIGO = "ANEXO_21";
const STORAGE_ROOT = path.resolve(
  process.cwd(),
  "storage",
  "alojamientos",
  "documentos",
  "anexo-21"
);
const STORAGE_KEY_PREFIX = "anexo21";
const CAMPOS_ADJUNTO = new Set(["fidofac", "indiceTitularidad"]);
const MIME_TO_EXT = Object.freeze({
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
});

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isOwner(documento, user) {
  return String(documento?.solicitante || "") === String(user?._id || "");
}

function isPostulante(user) {
  return up(user?.role) === "POSTULANTE";
}

function normalizarCampo(campo) {
  return String(campo || "").trim();
}

function campoValido(campo) {
  return CAMPOS_ADJUNTO.has(normalizarCampo(campo));
}

function deny(status = 404, code = "NO_DISPONIBLE") {
  return { ok: false, status, code };
}

function getDatos(documento) {
  return documento.datos && typeof documento.datos === "object" && !Array.isArray(documento.datos)
    ? documento.datos
    : {};
}

function getAdjuntos(documento) {
  const datos = getDatos(documento);
  return datos.adjuntos && typeof datos.adjuntos === "object" && !Array.isArray(datos.adjuntos)
    ? datos.adjuntos
    : {};
}

function sanitizeOriginalName(value) {
  return path.basename(String(value || "archivo")).replace(/["\r\n]/g, "").slice(0, 180);
}

function serializarAdjuntoPublico(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  return {
    id: metadata.id,
    campo: metadata.campo,
    nombreOriginal: metadata.nombreOriginal,
    mime: metadata.mime,
    size: metadata.size,
    sha256: metadata.sha256,
    fechaSubida: metadata.fechaSubida,
    subidoPor: metadata.subidoPor,
  };
}

function buildStorageKey(documentoId, extension) {
  return `${STORAGE_KEY_PREFIX}/${documentoId}/${crypto.randomUUID()}.${extension}`;
}

function resolveStorageKey(storageKey) {
  const key = String(storageKey || "").replace(/\\/g, "/");
  const prefix = `${STORAGE_KEY_PREFIX}/`;
  if (!key.startsWith(prefix)) return null;

  const relative = key.slice(prefix.length);
  const absPath = path.resolve(STORAGE_ROOT, relative);
  const rootWithSep = STORAGE_ROOT + path.sep;

  if (!absPath.startsWith(rootWithSep)) return null;
  return absPath;
}

async function detectFileType(buffer) {
  const { fileTypeFromBuffer } = await import("file-type");
  return fileTypeFromBuffer(buffer);
}

async function validateFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) return null;
  if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) return null;

  const detected = await detectFileType(file.buffer);
  if (!detected || !MIME_TO_EXT[detected.mime]) return null;

  return {
    mime: detected.mime,
    extension: MIME_TO_EXT[detected.mime],
    size: file.buffer.length,
    sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
  };
}

async function cargarDocumentoEditable(id, user) {
  if (!isObjectId(id)) return null;
  if (!isPostulante(user)) return null;

  const documento = await AlojamientoDocumento.findById(id);
  if (!documento || documento.activo === false || documento.codigo !== CODIGO) return null;
  if (up(documento.estado) !== "BORRADOR") return null;
  if (!isOwner(documento, user)) return null;
  return documento;
}

async function subirAdjunto({ id, campo, file, user }) {
  const campoNormalizado = normalizarCampo(campo);
  if (!campoValido(campoNormalizado)) return deny();

  const documento = await cargarDocumentoEditable(id, user);
  if (!documento) return deny();

  const fileInfo = await validateFile(file);
  if (!fileInfo) return deny(400, "ARCHIVO_INVALIDO");

  const storageKey = buildStorageKey(documento._id, fileInfo.extension);
  const absPath = resolveStorageKey(storageKey);
  if (!absPath) return deny();

  const previous = getAdjuntos(documento)[campoNormalizado] || null;

  try {
    await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
    await fs.promises.writeFile(absPath, file.buffer, { flag: "wx" });

    const datos = getDatos(documento);
    const adjuntos = { ...getAdjuntos(documento) };
    const metadata = {
      id: crypto.randomUUID(),
      campo: campoNormalizado,
      nombreOriginal: sanitizeOriginalName(file.originalname),
      nombreStorage: path.basename(absPath),
      storageKey,
      mime: fileInfo.mime,
      size: fileInfo.size,
      sha256: fileInfo.sha256,
      fechaSubida: new Date(),
      subidoPor: user._id,
    };

    adjuntos[campoNormalizado] = metadata;
    documento.datos = { ...datos, adjuntos };
    documento.actualizadoPor = user._id;
    documento.markModified("datos");
    await documento.save();

    if (previous?.storageKey) {
      const previousPath = resolveStorageKey(previous.storageKey);
      if (previousPath) {
        try {
          await fs.promises.unlink(previousPath);
        } catch {}
      }
    }

    return { ok: true, status: 200, adjunto: serializarAdjuntoPublico(metadata) };
  } catch (err) {
    try {
      await fs.promises.unlink(absPath);
    } catch {}
    return deny(500, "ERROR_ARCHIVO");
  }
}

async function eliminarAdjunto({ id, campo, user }) {
  const campoNormalizado = normalizarCampo(campo);
  if (!campoValido(campoNormalizado)) return deny();

  const documento = await cargarDocumentoEditable(id, user);
  if (!documento) return deny();

  const datos = getDatos(documento);
  const adjuntos = { ...getAdjuntos(documento) };
  const current = adjuntos[campoNormalizado] || null;

  if (!current) return { ok: true, status: 200 };

  delete adjuntos[campoNormalizado];
  documento.datos = { ...datos, adjuntos };
  documento.actualizadoPor = user._id;
  documento.markModified("datos");
  await documento.save();

  if (current.storageKey) {
    const absPath = resolveStorageKey(current.storageKey);
    if (absPath) {
      try {
        await fs.promises.unlink(absPath);
      } catch {}
    }
  }

  return { ok: true, status: 200 };
}

async function obtenerAdjuntoDescarga({ id, campo, user }) {
  const campoNormalizado = normalizarCampo(campo);
  if (!isObjectId(id) || !campoValido(campoNormalizado)) return deny();

  const documento = await AlojamientoDocumento.findById(id).lean();
  if (!documento || documento.activo === false || documento.codigo !== CODIGO) return deny();
  if (!puedeVerDocumento(user, documento)) return deny();

  const adjunto = getAdjuntos(documento)[campoNormalizado] || null;
  if (!adjunto?.storageKey) return deny();

  const absPath = resolveStorageKey(adjunto.storageKey);
  if (!absPath) return deny();

  try {
    await fs.promises.access(absPath, fs.constants.R_OK);
  } catch {
    return deny();
  }

  return {
    ok: true,
    status: 200,
    adjunto,
    absPath,
  };
}

async function streamAdjunto({ res, download }) {
  const nombre = sanitizeOriginalName(download.adjunto.nombreOriginal || "archivo");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type(download.adjunto.mime || "application/octet-stream");
  await pipeline(fs.createReadStream(download.absPath), res);
}

module.exports = {
  subirAdjunto,
  eliminarAdjunto,
  obtenerAdjuntoDescarga,
  streamAdjunto,
};
