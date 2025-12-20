// backend/routes/formularios.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { authRequired, requireRole } = require("../middleware/auth");
const c = require("../controllers/formularioController");

const UPLOADS = path.join(process.cwd(), "uploads", "formularios");
fs.mkdirSync(UPLOADS, { recursive: true });

// límites y seguridad
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const tiposPermitidos = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const extensionesPeligrosas = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".js",
  ".ts",
  ".php",
  ".py",
  ".jar",
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const cleanName = String(file.originalname || "archivo").replace(/\s+/g, "_");
    cb(null, `${timestamp}_${cleanName}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (extensionesPeligrosas.includes(ext)) {
    return cb(new Error("Tipo de archivo no permitido por seguridad"), false);
  }
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error("Formato de archivo no permitido"), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ─────────────────────────────
// Bandejas/listados
router.get("/mios", authRequired, c.getMisAnexos);
router.get("/anexo/:codigo", authRequired, requireRole("ADMIN", "ADMIN_GENERAL"), c.listarPorCodigo);

// ✅ Detalle + PDF (control por intervinientes + admin)
router.get("/:id", authRequired, c.getById);
router.get("/:id/pdf", authRequired, c.descargarPdf);

// ✅ NUEVO: Estado institucional (gestión ADMIN_GENERAL)
router.patch(
  "/:id/estado-institucional",
  authRequired,
  requireRole("ADMIN_GENERAL"),
  c.setEstadoInstitucional
);

// ✅ ANEXO_03: actualizar datos (solo INSPECTOR, ENVIADO)
router.patch("/:id/datos", authRequired, c.updateDatosAnexo03);

// ─────────────────────────────
// Crear anexo genérico (01,02,03,...)
router.post("/:codigo", authRequired, upload.any(), c.crearAnexo);

// ─────────────────────────────
// ANEXO_02
router.post("/:id/conformidad", authRequired, requireRole("POSTULANTE"), c.darConformidad);
router.post("/:id/conformidad-admin", authRequired, requireRole("ADMIN_GENERAL"), c.darConformidadAdmin);

// ─────────────────────────────
// ANEXO_03
router.post("/:id/conformidad-permisionario", authRequired, requireRole("PERMISIONARIO"), c.darConformidadPermisionario03);
router.post("/:id/cierre-admin-general", authRequired, requireRole("ADMIN_GENERAL"), c.cerrarAnexo03AdminGeneral);

module.exports = router;
