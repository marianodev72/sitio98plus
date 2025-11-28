// backend/routes/permisionario.js

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();

// Controlador de permisionario (mis datos, documentos, etc.)
const controller = require("../controllers/permisionarioController");

// Controlador específico de comunicaciones del permisionario
const comunicacionesController = require("../controllers/permisionarioComunicacionesController");

// -----------------------------------------------------------------------------
// Middleware local: asegura que el usuario logueado sea PERMISIONARIO
// (1ª llave: authMiddleware se aplica en server.js para /api/permisionario)
// -----------------------------------------------------------------------------
function ensurePermisionario(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      return res
        .status(401)
        .json({ ok: false, msg: "No autenticado o usuario inválido" });
    }

    const role = String(req.user.role).toUpperCase();

    if (role !== "PERMISIONARIO") {
      return res.status(403).json({
        ok: false,
        msg: "Acceso permitido solo para permisionarios",
      });
    }

    next();
  } catch (err) {
    console.error("Error en ensurePermisionario:", err);
    return res.status(500).json({
      ok: false,
      msg: "Error al validar permisos de permisionario",
    });
  }
}

// -----------------------------------------------------------------------------
// Configuración de subida de archivos para COMUNICACIONES
// Carpeta: backend/uploads/comunicaciones
// Sólo permite PDF / JPG / PNG – máx. 5 archivos de 5 MB
// -----------------------------------------------------------------------------
const comunicacionesUploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "comunicaciones"
);

fs.mkdirSync(comunicacionesUploadDir, { recursive: true });

const storageComunicaciones = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, comunicacionesUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_.]/g, "_");
    cb(null, `${timestamp}-${sanitized}`);
  },
});

function fileFilterComunicaciones(req, file, cb) {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido (solo PDF/JPG/PNG)."), false);
  }
}

const uploadComunicaciones = multer({
  storage: storageComunicaciones,
  fileFilter: fileFilterComunicaciones,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5, // máximo 5 adjuntos
  },
}).array("adjuntos", 5);

// Wrapper para manejar errores de multer y devolver JSON limpio
function manejarUploadComunicaciones(req, res, next) {
  uploadComunicaciones(req, res, (err) => {
    if (err) {
      console.error("Error al subir adjuntos de comunicación:", err);
      return res.status(400).json({
        ok: false,
        msg: err.message || "Error al subir archivos adjuntos.",
      });
    }
    next();
  });
}

// -----------------------------------------------------------------------------
// RUTAS EXISTENTES (no tocamos la lógica que ya funcionaba)
// -----------------------------------------------------------------------------

// GET – Obtener mis datos
router.get("/mis-datos", ensurePermisionario, controller.getMisDatos);

// PUT – Actualizar mis datos
router.put("/mis-datos", ensurePermisionario, controller.actualizarMisDatos);

// POST – Subir documentos
router.post("/documentos", ensurePermisionario, controller.subirDocumento);

// -----------------------------------------------------------------------------
// RUTAS DE COMUNICACIONES DEL PERMISIONARIO
// -----------------------------------------------------------------------------
// GET /api/permisionario/comunicaciones
router.get(
  "/comunicaciones",
  ensurePermisionario,
  comunicacionesController.listarMisComunicaciones
);

// POST /api/permisionario/comunicaciones
router.post(
  "/comunicaciones",
  ensurePermisionario,
  manejarUploadComunicaciones,
  comunicacionesController.crearComunicacion
);

module.exports = router;
