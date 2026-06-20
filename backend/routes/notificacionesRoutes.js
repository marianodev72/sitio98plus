const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");
const controller = require("../controllers/notificacionesController");

router.use(authRequired, refreshUserPrivileges);
router.use(attachAuditHelpers);

router.get(
  "/pendientes",
  audit("NOTIFICACIONES_PENDIENTES", {
    targetType: "Notificacion",
    metaAllowlist: ["query.limit"],
  }),
  controller.listarPendientes
);

router.get(
  "/",
  audit("NOTIFICACIONES_LIST", {
    targetType: "Notificacion",
    metaAllowlist: ["query.limit"],
  }),
  controller.listarMisNotificaciones
);

router.patch(
  "/:id/leida",
  audit("NOTIFICACION_MARCAR_LEIDA", { targetType: "Notificacion", metaAllowlist: ["params.id"] }),
  controller.marcarLeida
);

router.patch(
  "/:id/confirmar",
  audit("NOTIFICACION_CONFIRMAR", { targetType: "Notificacion", metaAllowlist: ["params.id"] }),
  controller.confirmarNotificacion
);

module.exports = router;
