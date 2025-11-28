// backend/routes/anexo11.js
// Rutas para el Anexo 11 (Pedido de trabajo)

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const ROLES = require("../middleware/roles");

const {
  crearAnexo11,
  listarAnexos11Permisionario,
  obtenerAnexo11Detalle,
  generarAnexo11PDF,
} = require("../controllers/anexo11Controller");

// -----------------------------------------------------------------------------
// Middleware local: asegura que el usuario logueado sea PERMISIONARIO
// (segunda llave de seguridad, además del uso del token)
// -----------------------------------------------------------------------------
function ensurePermisionario(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const role = String(req.user.role || "").toUpperCase();

    if (role !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: "Acceso permitido solo para permisionarios.",
      });
    }

    next();
  } catch (err) {
    console.error("Error en ensurePermisionario (Anexo11):", err);
    return res.status(500).json({
      ok: false,
      message: "Error al validar permisos de permisionario.",
    });
  }
}

// -----------------------------------------------------------------------------
// POST /api/anexo11
// Crea un nuevo Anexo 11
// -----------------------------------------------------------------------------
router.post(
  "/",
  authMiddleware,
  ensurePermisionario,
  crearAnexo11
);

// -----------------------------------------------------------------------------
// GET /api/anexo11/mis
// Lista los Anexo 11 del permisionario logueado
// -----------------------------------------------------------------------------
router.get(
  "/mis",
  authMiddleware,
  ensurePermisionario,
  listarAnexos11Permisionario
);

// -----------------------------------------------------------------------------
// GET /api/anexo11/:id/pdf
// Descarga el PDF del Anexo 11 (permisionario sólo si es suyo).
// -----------------------------------------------------------------------------
router.get(
  "/:id/pdf",
  authMiddleware,
  ensurePermisionario,
  generarAnexo11PDF
);

// -----------------------------------------------------------------------------
// GET /api/anexo11/:id
// Detalle de un Anexo 11 (permisionario lo ve sólo si es suyo).
// -----------------------------------------------------------------------------
router.get(
  "/:id",
  authMiddleware,
  ensurePermisionario,
  obtenerAnexo11Detalle
);

module.exports = router;
