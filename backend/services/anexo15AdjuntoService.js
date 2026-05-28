const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

const {
  ANEXO15_ADJUNTO_MIMES,
} = require("../constants/anexo15Constants");
const { MAX_FILE_SIZE } = require("../middleware/anexo15Upload");
const {
  loadByToken,
  canView,
  toPublic,
  actorSnapshot,
  nombreUsuario,
  deny,
  up,
} = require("./anexo15Service");
const { User } = require("../models/user");

const CAMPOS_ADJUNTOS = new Set(["comprobantes", "pdf", "imagenes"]);
const MIME_TO_EXT = Object.freeze({
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
});

function resolveStorageRoot() {
  const configured = String(process.env.ANEXO15_STORAGE_ROOT || "").trim();
  if (configured) return path.resolve(configured);
  return path.resolve(__dirname, "../storage/anexo-15");
}

const STORAGE_ROOT = resolveStorageRoot();

function isEditable(doc, user) {
  return (
    doc &&
    String(doc.solicitante || "") === String(user?._id || "") &&
    ["BORRADOR", "DEVUELTO_A_SOLICITANTE"].includes(up(doc.estado))
  );
}

function normalizeCampo(campo) {
  return String(campo || "").trim().toLowerCase();
}

function safeName(value) {
  return path.basename(String(value || "archivo")).replace(/["\r\n]/g, "").slice(0, 180);
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

function buildStorageKey(token, extension) {
  return `${String(token).replace(/[^A-Za-z0-9-]/g, "")}/${crypto.randomUUID()}.${extension}`;
}

function resolveStorageKey(storageKey) {
  const clean = String(storageKey || "").replace(/\\/g, "/");
  if (clean.includes("..")) return null;
  const absPath = path.resolve(STORAGE_ROOT, clean);
  const rootWithSep = STORAGE_ROOT + path.sep;
  if (!absPath.startsWith(rootWithSep)) return null;
  return absPath;
}

async function detectFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) return null;
  if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) return null;
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ANEXO15_ADJUNTO_MIMES.includes(detected.mime)) return null;
  return {
    mime: detected.mime,
    extension: MIME_TO_EXT[detected.mime],
    size: file.buffer.length,
    sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
  };
}

async function subir({ token, campo, file, user }) {
  const campoNormalizado = normalizeCampo(campo);
  if (!CAMPOS_ADJUNTOS.has(campoNormalizado)) return deny();

  const doc = await loadByToken(token, true);
  if (!doc || !isEditable(doc, user)) return deny();

  const fileInfo = await detectFile(file);
  if (!fileInfo) return deny(400, "ARCHIVO_INVALIDO");

  const storageKey = buildStorageKey(doc.publicToken, fileInfo.extension);
  const absPath = resolveStorageKey(storageKey);
  if (!absPath) return deny();

  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  const metadata = {
    id: crypto.randomUUID(),
    campo: campoNormalizado,
    nombreOriginal: safeName(file.originalname),
    mime: fileInfo.mime,
    size: fileInfo.size,
    sha256: fileInfo.sha256,
    fechaSubida: new Date(),
    subidoPor: user._id,
    subidoPorSnapshot: actorSnapshot(dbUser, user.role),
    storageKey,
    path: absPath,
  };

  try {
    await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
    await fs.promises.writeFile(absPath, file.buffer, { flag: "wx" });
    doc.adjuntos.push(metadata);
    doc.intervenciones.push({
      tipo: "ADJUNTO_ALTA",
      resultado: "OK",
      observacion: `Adjunto ${campoNormalizado}: ${metadata.nombreOriginal}`,
      actor: user._id,
      actorSnapshot: actorSnapshot(dbUser, user.role),
    });
    doc.actualizadoPor = user._id;
    await doc.save();
    return { ok: true, status: 200, adjunto: publicAdjunto(metadata), documento: toPublic(doc) };
  } catch {
    try {
      await fs.promises.unlink(absPath);
    } catch {}
    return deny(500, "ERROR_ARCHIVO");
  }
}

async function eliminar({ token, adjuntoId, user }) {
  const doc = await loadByToken(token, true);
  if (!doc || !isEditable(doc, user)) return deny();
  const index = doc.adjuntos.findIndex((item) => String(item.id) === String(adjuntoId));
  if (index < 0) return deny();

  const [adjunto] = doc.adjuntos.splice(index, 1);
  const dbUser = await User.findById(user._id).select("nombre apellido role").lean();
  doc.intervenciones.push({
    tipo: "ADJUNTO_BAJA",
    resultado: "OK",
    observacion: `Adjunto eliminado: ${adjunto.nombreOriginal}`,
    actor: user._id,
    actorSnapshot: actorSnapshot(dbUser, user.role),
  });
  doc.actualizadoPor = user._id;
  await doc.save();

  const absPath = resolveStorageKey(adjunto.storageKey);
  if (absPath) {
    try {
      await fs.promises.unlink(absPath);
    } catch {}
  }

  return { ok: true, status: 200, documento: toPublic(doc) };
}

async function obtenerDescarga({ token, adjuntoId, user }) {
  const doc = await loadByToken(token, true);
  if (!doc || !canView(user, doc)) return deny();
  const adjunto = doc.adjuntos.find((item) => String(item.id) === String(adjuntoId));
  if (!adjunto) return deny();
  const absPath = resolveStorageKey(adjunto.storageKey);
  if (!absPath) return deny();
  try {
    await fs.promises.access(absPath, fs.constants.R_OK);
  } catch {
    return deny();
  }
  return { ok: true, status: 200, adjunto, absPath };
}

async function stream({ res, download, disposition = "attachment" }) {
  res.setHeader("Content-Disposition", `${disposition}; filename="${safeName(download.adjunto.nombreOriginal)}"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type(download.adjunto.mime || "application/octet-stream");
  await pipeline(fs.createReadStream(download.absPath), res);
}

module.exports = {
  subir,
  eliminar,
  obtenerDescarga,
  stream,
};
