// backend/routes/adminRoutes.js
/**
 * Router montado en /api/admin (ver backend/server.js)
 * Uso: acciones administrativas críticas + módulo Auditoría Institucional (SOLO LECTURA)
 */
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");

// Controllers críticos
const { asignarInspector } = require("../controllers/rolesController");

// ✅ Auditoría institucional (SOLO LECTURA)
const {
  listAuditEvents,
  listAuditByRequestId,
  exportAuditPdf,
  getAuditOptions,
} = require("../controllers/adminAuditInstitutionalController");

// Helpers para auditoría A6 (no escribe por sí solo)
router.use(attachAuditHelpers);

// Defensa en profundidad (server-side)
router.use(authRequired, refreshUserPrivileges);

// ✅ Acceso exclusivo ADMIN_GENERAL con respuesta OPACA
router.use((req, res, next) => {
  const role = String(req.user?.role || "");
  if (role !== "ADMIN_GENERAL") return res.status(404).json({ error: "Recurso no disponible" });
  return next();
});

// -------------------------
// AUDITORÍA INSTITUCIONAL — SOLO LECTURA
// -------------------------

// Opciones para dropdowns
router.get("/audit/options", getAuditOptions);

// Listado con filtros canónicos
router.get("/audit", listAuditEvents);

// Correlación por requestId
router.get("/audit/request/:requestId", listAuditByRequestId);

// Export PDF institucional (máx 1000)
router.get("/audit/export/pdf", exportAuditPdf);

// -------------------------
// ADMIN CRÍTICO (existente)
// -------------------------

router.post(
  "/roles/asignar-inspector",
  audit("ADMIN_ASSIGN_INSPECTOR", {
    targetType: "RoleAssignment",
    metaAllowlist: ["body.userId", "body.inspectorId", "body.rol"],
  }),
  asignarInspector
);

module.exports = router;
