// backend/middleware/uploadMensajes.js
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// 📁 Carpeta SEGURA (NO pública / NO estática)
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads_private", "mensajes");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Tamaño máximo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ✅ Whitelist MIME + extensiones
const ALLOWED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

// ❌ Denylist por extensión (doble capa)
const DANGEROUS_EXT = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".msi", ".js", ".ts", ".php", ".py", ".jar",
  ".ps1", ".vbs", ".com", ".scr", ".dll", ".cpl", ".hta", ".html", ".htm", ".svg",
]);

function getExt(originalname) {
  return path.extname(originalname || "").toLowerCase();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    // Se guarda temporal; el controller valida por contenido y renombra a ext real
    const id = crypto.randomUUID();
    cb(null, `${id}.tmp`);
  },
});

function fileFilter(req, file, cb) {
  try {
    const ext = getExt(file.originalname);

    if (!ext || DANGEROUS_EXT.has(ext)) {
      return cb(new Error("Tipo de archivo no permitido"), false);
    }

    const allowedExts = ALLOWED[file.mimetype];
    if (!allowedExts || !allowedExts.includes(ext)) {
      return cb(new Error("Tipo de archivo no permitido"), false);
    }

    cb(null, true);
  } catch {
    cb(new Error("Archivo inválido"), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
}).array("adjuntos", 10);

module.exports = upload;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;
module.exports.ALLOWED = ALLOWED;
module.exports.getExt = getExt;
