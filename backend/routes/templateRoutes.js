// routes/templateRoutes.js
// Rutas de plantillas (FormTemplate) — Sistema ZN98

const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const templateController = require("../controllers/templateController");

function denyNonInstitutional(req, res, next) {
  const role = String(req.user?.role || "").toUpperCase();
  if (role === "PERMISIONARIO" || role === "ADMIN" || role === "ADMIN_GENERAL") return next();
  return res.status(404).json({ message: "Recurso no disponible" });
}

// Obtener template activo por código (ej: ANEXO_01)
router.get(
  "/:codigo",
  authRequired,
  refreshUserPrivileges,
  denyNonInstitutional,
  templateController.getTemplateByCode
);

module.exports = router;
