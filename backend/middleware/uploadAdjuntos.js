// middlewares/uploadAdjuntos.js
const multer = require('multer');
const path = require('path');

// Carpeta donde se guardarán adjuntos
const uploadFolder = path.join(__dirname, '..', 'uploads', 'mensajes');

// Tamaño máximo de archivo (5 MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Tipos permitidos
const tiposPermitidos = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain'
];

// Extensiones prohibidas absolutas
const extensionesPeligrosas = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.js', '.ts', '.php', '.py', '.jar'
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${cleanName}`);
  }
});

// Filtro de seguridad
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  // Prohibidos por extensión
  if (extensionesPeligrosas.includes(ext)) {
    return cb(new Error('Tipo de archivo no permitido por seguridad'), false);
  }

  // Prohibidos por MIME
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error('Formato de archivo no permitido'), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

module.exports = upload;
