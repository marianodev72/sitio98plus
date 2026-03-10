// backend/routes/mantenimientoRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/mantenimientoController");
const { authRequired } = require("../middleware/auth");
const upload = require("../middleware/upload");

// 🔐 AUTH OBLIGATORIO PARA TODO EL ROUTER
router.use(authRequired);

// PERMISIONARIO
router.get("/", ctrl.listarMis);
router.post("/", upload, ctrl.crear);

router.get("/formulario/blank", ctrl.formularioBlank);

// Alias compat
router.get("/historial", ctrl.listarMis);

// INSPECTOR
router.get("/inspector/barrio", ctrl.listarBarrioInspector);
router.patch("/inspector/:id/decision", ctrl.decisionInspector);

// ADMIN GENERAL
router.get("/admin", ctrl.listarAdminGeneral);
router.patch("/admin/:id/decision", ctrl.decisionAdminGeneral);
router.post("/admin/:id/cierre", ctrl.cierreAdminGeneral);

// Detalle
router.get("/:id", ctrl.detalle);
router.get("/:id/constancia.pdf", ctrl.constanciaPdf);
router.get("/:id/archivos/:fileId/preview", ctrl.previewArchivo);
router.get("/:id/archivos/:fileId/download", ctrl.downloadArchivo);

module.exports = router;
