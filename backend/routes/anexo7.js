// backend/routes/anexo7.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const ROLES = require("../middleware/roles");
const anexo7Controller = require("../controllers/anexo7Controller");

// Helper
function ensurePermisionario(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: "No autenticado." });
  }
  const role = String(req.user.role || "").trim().toUpperCase();
  if (role !== ROLES.PERMISIONARIO) {
    return res
      .status(403)
      .json({ ok: false, message: "Solo un permisionario puede acceder." });
  }
  next();
}

// Todas protegidas por RS256
router.get("/mios", auth, ensurePermisionario, anexo7Controller.getMisAnexos7);
router.get("/:id", auth, ensurePermisionario, anexo7Controller.getAnexo7ById);
router.post("/", auth, ensurePermisionario, anexo7Controller.crearAnexo7);
router.put("/:id", auth, ensurePermisionario, anexo7Controller.editarAnexo7);
router.post(
  "/:id/enviar-a-inspector",
  auth,
  ensurePermisionario,
  anexo7Controller.enviarAInspector
);

module.exports = router;
