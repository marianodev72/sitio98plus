// middleware/upload.js
const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const DANGEROUS_EXT = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".msi", ".js", ".ts", ".php", ".py", ".jar",
  ".ps1", ".vbs", ".com", ".scr", ".dll", ".cpl", ".hta", ".html", ".htm", ".svg",
]);

function getExt(originalname) {
  return path.extname(originalname || "").toLowerCase();
}

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = getExt(file.originalname);

  if (!ext || DANGEROUS_EXT.has(ext)) {
    return cb(new Error("Tipo de archivo no permitido"), false);
  }

  const allowedExts = ALLOWED[file.mimetype];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return cb(new Error("Tipo de archivo no permitido"), false);
  }

  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
}).array("documentos", 10);
