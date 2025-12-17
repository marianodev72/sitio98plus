// routes/templateRoutes.js
// Rutas de plantillas (FormTemplate) — Sistema ZN98

const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const templateController = require("../controllers/templateController");

// Obtener template activo por código (ej: ANEXO_01)
router.get("/:codigo", authRequired, templateController.getTemplateByCode);

module.exports = router;
