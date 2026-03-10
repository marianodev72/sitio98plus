// backend/routes/liquidacionRoutes.js
// Rutas de liquidaciones — Sistema ZN98

const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  previewCarga,
  confirmarCarga,
  cargarParticular,
  getUltimaMia,
  getHistorialMio,
  getAdmin,
  getPendientes,
} = require("../controllers/liquidacionController");

const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);

// ─────────────────────────────
// Multer (CSV) — carpeta existente: /uploads/csv (server.js la crea)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "csv"));
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const periodo = String(req.params.periodo || "NA");
    const tipo = String(req.params.tipo || "NA");
    cb(null, `liq_${tipo}_${periodo}_${ts}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    if (!String(file.originalname || "").toLowerCase().endsWith(".csv")) {
      return cb(new Error("Solo CSV"));
    }
    return cb(null, true);
  },
});

// ─────────────────────────────
// ADMIN_GENERAL: preview + confirmar por tipo
// Se monta en server.js como: /api/liquidaciones
router.post("/:periodo/:tipo/preview", upload.single("file"), previewCarga);
router.post("/confirmar", express.json(), confirmarCarga);

// ADMIN_GENERAL: cargas particulares (manual)
router.post("/particulares", express.json(), cargarParticular);

// ADMIN_GENERAL: ver pendientes del período (quién no recibió)
router.get("/pendientes", getPendientes);

// ADMIN/ADMIN_GENERAL: lectura global
router.get("/admin", getAdmin);

// PERMISIONARIO / ALOJADO: mis liquidaciones
// IMPORTANTE: quedan bajo /api/liquidaciones/... (consistente con el mount)
router.get("/mis/ultima", getUltimaMia);
router.get("/mis", getHistorialMio);

module.exports = router;
