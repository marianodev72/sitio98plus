// backend/routes/anexo2.js

const express = require("express");
const router = express.Router();

const { authRequired, requireRole, ROLES } = require("../middleware/auth");
const anexo2Controller = require("../controllers/anexo2Controller");

// Todas las rutas requieren usuario autenticado
router.use(authRequired);

// ADMIN GENERAL / ADMIN: crea Anexo 02 y lista
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  anexo2Controller.crearAnexo2
);

router.get(
  "/admin/list",
  requireRole(ROLES.ADMIN),
  anexo2Controller.listAnexosAdmin
);

// Permisionario / dueño: ve su Anexo 2 y firma
router.post("/:id/firmar", anexo2Controller.firmarPermisionario);
router.get("/:id", anexo2Controller.getAnexo2);

// ADMIN GENERAL: cierra (firma admin, asigna vivienda, actualiza ocupación)
router.post(
  "/:id/cerrar",
  requireRole(ROLES.ADMIN),
  anexo2Controller.cerrarPorAdmin
);

module.exports = router;
