// backend/routes/permisionario.js
const express = require("express");
const router = express.Router();

const permController = require("../controllers/permisionarioController");
let comController;
try {
  comController = require("../controllers/permisionarioComunicacionesController");
} catch (err) {
  console.warn(
    "[permisionario] No se pudo cargar permisionarioComunicacionesController:",
    err.message
  );
}
const anexo7 = require("../controllers/anexo7Controller");

// Middleware: valida que req.user exista y sea permisionario
function ensurePermisionario(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, msg: "Token inválido" });
    }

    const role = (req.user.role || "").toUpperCase();
    if (role !== "PERMISIONARIO") {
      return res.status(403).json({ ok: false, msg: "Acceso denegado" });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, msg: "Error validando rol" });
  }
}

// --- Mis Datos
router.get("/mis-datos", ensurePermisionario, permController.getMisDatos);

// -----------------------------------------------------------------------------
// Comunicaciones (solo se crean si las funciones existen)
// -----------------------------------------------------------------------------
if (
  comController &&
  typeof comController.getMisComunicaciones === "function"
) {
  router.get(
    "/comunicaciones",
    ensurePermisionario,
    comController.getMisComunicaciones
  );
} else {
  console.warn(
    "[permisionario] Ruta GET /comunicaciones deshabilitada: getMisComunicaciones no definida."
  );
}

if (comController && typeof comController.crearComunicacion === "function") {
  router.post(
    "/comunicaciones",
    ensurePermisionario,
    comController.crearComunicacion
  );
} else {
  console.warn(
    "[permisionario] Ruta POST /comunicaciones deshabilitada: crearComunicacion no definida."
  );
}

// -----------------------------------------------------------------------------
// Anexo 7
// -----------------------------------------------------------------------------
router.get("/anexos7/mios", ensurePermisionario, anexo7.getMisAnexos7);
router.get("/anexos7/:id", ensurePermisionario, anexo7.getAnexo7ById);
router.post("/anexos7", ensurePermisionario, anexo7.crearAnexo7);
router.put("/anexos7/:id", ensurePermisionario, anexo7.editarAnexo7);
router.post(
  "/anexos7/:id/enviar-a-inspector",
  ensurePermisionario,
  anexo7.enviarAInspector
);

module.exports = router;
