// backend/routes/adminCritical.js
/**
 * Acciones administrativas críticas.
 * Todo lo que esté acá debe:
 * - requerir ADMIN_GENERAL (o lo que definas)
 * - auditar con audit(...)
 */
const express = require("express");
const router = express.Router();

const { authRequired, requireRole } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");

const { asignarInspector } = require("../controllers/rolesController");
// Si existen estos controllers en tu repo (según tu búsqueda):
// const { asignarViviendaAdmin } = require("../controllers/adminViviendaAsignacionController");
// const { exportUsersRaw } = require("../controllers/userController"); // o donde corresponda

router.use(attachAuditHelpers);

// Defensa en profundidad (aunque server.js ya proteja por cookies/JWT)
router.use(authRequired, refreshUserPrivileges, requireRole("ADMIN_GENERAL"));

// ----------------------
// Roles (crítico)
// ----------------------
router.post(
  "/roles/asignar-inspector",
  audit("ADMIN_ASSIGN_INSPECTOR", {
    targetType: "RoleAssignment",
    metaAllowlist: ["body.userId", "body.inspectorId", "body.rol"],
  }),
  asignarInspector
);

// ----------------------
// Viviendas por orden superior (crítico)
// (Descomentá si existe el controller y la ruta real que usás)
// ----------------------
// router.post(
//   "/viviendas/:viviendaId/asignar",
//   audit("ADMIN_ASSIGN_HOUSE_OVERRIDE", {
//     targetType: "ViviendaAssignment",
//     metaAllowlist: ["params.viviendaId", "body.userId"],
//   }),
//   asignarViviendaAdmin
// );

module.exports = router;
