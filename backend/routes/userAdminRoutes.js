// routes/userAdminRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired, requireRole } = require("../middleware/auth");
const { audit, attachAuditHelpers } = require("../middleware/audit");
const {
  validateActualizarRolEstado,
  validateActualizarBloqueo,
} = require("../validators/userAdminValidator");

const userAdminController = require("../controllers/userAdminController");

/**
 * IMPORTANTE:
 * - ADMIN_GENERAL: acceso pleno (con registro de intervención)
 * - ADMIN: acceso lectura (institucional)
 *
 * ✅ GET: ADMIN_GENERAL + ADMIN
 * ✅ PATCH: SOLO ADMIN_GENERAL
 */

router.use(attachAuditHelpers);

// Listar usuarios con filtros (lectura) -> auditar acceso
router.get(
  "/",
  authRequired,
  requireRole("ADMIN_GENERAL", "ADMIN"),
  audit("ADMIN_USERADMIN_LIST", { targetType: "User" }),
  userAdminController.listarUsuarios
);

// Obtener detalle de un usuario (lectura) -> auditar acceso
router.get(
  "/:id",
  authRequired,
  requireRole("ADMIN_GENERAL", "ADMIN"),
  audit("ADMIN_USERADMIN_GET", { targetType: "User", metaAllowlist: ["params.id"] }),
  userAdminController.obtenerUsuario
);

// Actualizar rol + estadoHabitacional (escritura) -> auditar (crítico)
router.patch(
  "/:id/rol-estado",
  authRequired,
  requireRole("ADMIN_GENERAL"),
  validateActualizarRolEstado,
  audit("ADMIN_UPDATE_ROLE_STATUS", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.nuevoRol", "body.role", "body.estadoHabitacional"],
  }),
  userAdminController.actualizarRolEstado
);

// Bloquear / desbloquear usuario (escritura) -> auditar (crítico)
router.patch(
  "/:id/bloqueo",
  authRequired,
  requireRole("ADMIN_GENERAL"),
  validateActualizarBloqueo,
  audit("ADMIN_TOGGLE_BLOCK", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.bloqueado"],
  }),
  userAdminController.actualizarBloqueo
);

module.exports = router;
