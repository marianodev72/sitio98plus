// backend/routes/serviciosRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  cargarCsv,
  listarPendientesAdmin,
  listarAdminListado, // ✅ NUEVO
  historicoPorViviendaCodigo,
  corregirServicio,
  misServicios,
  marcarLeido,
  pdfServicio,
} = require("../controllers/serviciosController");

// ✅ Middleware real (existe): backend/middleware/auth.js
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// Directorio de uploads CSV (ya se crea en server.js, pero lo aseguramos)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const UPLOADS_CSV_DIR = path.join(UPLOADS_DIR, "csv");
if (!fs.existsSync(UPLOADS_CSV_DIR)) fs.mkdirSync(UPLOADS_CSV_DIR, { recursive: true });

// Storage controlado (NO se sirve como static)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_CSV_DIR),
  filename: (_req, _file, cb) => {
    // nombre interno opaco
    const safe = `servicios_${Date.now()}_${Math.random().toString(16).slice(2)}.csv`;
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  // Fail-closed: solo .csv por nombre (no confiar en mimetype)
  const name = String(file?.originalname || "").toLowerCase();
  if (!name.endsWith(".csv")) return cb(null, false);
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─────────────────────────────
// ADMIN / ADMIN_GENERAL
// ─────────────────────────────
router.post("/cargar-csv", authRequired, upload.single("file"), cargarCsv);

router.get("/admin/pendientes", authRequired, listarPendientesAdmin);

// ✅ listado general con filtros (vivienda + leídos/no leídos)
router.get("/admin/listado", authRequired, listarAdminListado);

router.get("/vivienda/:codigo/historico", authRequired, historicoPorViviendaCodigo);

// controller valida SOLO ADMIN_GENERAL
router.patch("/:id/corregir", authRequired, corregirServicio);

// ─────────────────────────────
// PERMISIONARIO
// ─────────────────────────────
router.get("/mis-servicios", authRequired, misServicios);
router.get("/:id/pdf", authRequired, pdfServicio);
router.patch("/:id/marcar-leido", authRequired, marcarLeido);

module.exports = router;
