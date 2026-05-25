const express = require("express");
const multer = require("multer");

const { audit } = require("../middleware/audit");
const controller = require("../controllers/basesMaestrasController");

const router = express.Router();

const EXCEL_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (!name.endsWith(".xlsx")) return cb(new Error("Solo se aceptan archivos .xlsx"));
    if (!EXCEL_MIMES.has(mime)) return cb(new Error("MIME de Excel no permitido"));
    return cb(null, true);
  },
});

function uploadExcel(req, res, next) {
  upload.single("archivo")(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      summary: {
        dryRun: true,
        totalFilas: 0,
        validas: 0,
        invalidas: 1,
        nuevos: 0,
        actualizados: 0,
        sinCambios: 0,
        warnings: 0,
        errores: 1,
      },
      nuevos: [],
      actualizados: [],
      sinCambios: [],
      warnings: [],
      errores: [{ message: err.message || "Archivo Excel invalido" }],
    });
  });
}

router.get(
  "/jobs",
  audit("BASES_MAESTRAS_JOBS_LIST", { targetType: "MasterImportJob" }),
  controller.listJobs
);
router.get(
  "/jobs/:id",
  audit("BASES_MAESTRAS_JOB_DETAIL", { targetType: "MasterImportJob" }),
  controller.getJob
);
router.get(
  "/jobs/:id/apply-plan",
  audit("BASES_MAESTRAS_APPLY_PLAN", { targetType: "MasterImportJob" }),
  controller.getApplyPlan
);
router.post(
  "/jobs/:id/cancel",
  audit("BASES_MAESTRAS_JOB_CANCEL", { targetType: "MasterImportJob" }),
  controller.cancelJob
);

router.post(
  "/personal/dry-run",
  uploadExcel,
  audit("BASES_MAESTRAS_DRY_RUN_PERSISTED", { targetType: "MasterImportJob" }),
  controller.personalDryRun
);
router.post(
  "/viviendas/dry-run",
  uploadExcel,
  audit("BASES_MAESTRAS_DRY_RUN_PERSISTED", { targetType: "MasterImportJob" }),
  controller.viviendasDryRun
);

module.exports = router;
