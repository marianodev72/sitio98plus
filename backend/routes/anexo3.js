// backend/routes/anexo3.js
// Rutas para Anexo 3 (Acta de Recepción de Vivienda Fiscal)

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const ROLES = require("../middleware/roles");

const {
  crearAnexo3,
  listarAnexos3Permisionario,
  obtenerAnexo3Detalle,
  permisionarioDaConforme,
  permisionarioPideRevision,
  inspectorReenviaAPermisionario,
  adminCierraAnexo3,
  generarAnexo3PDF,
} = require("../controllers/anexo3Controller");

// Helper de rol
function ensureRole(roleConst) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          ok: false,
          message: "No autenticado.",
        });
      }
      const role = String(req.user.role || "").toUpperCase();
      if (role !== roleConst) {
        return res.status(403).json({
          ok: false,
          message: "No tenés permisos suficientes para esta operación.",
        });
      }
      next();
    } catch (err) {
      console.error("Error en ensureRole:", err);
      return res.status(500).json({
        ok: false,
        message: "Error al validar permisos.",
      });
    }
  };
}

const ensureInspector = ensureRole(ROLES.INSPECTOR);
const ensurePermisionario = ensureRole(ROLES.PERMISIONARIO);
const ensureAdmin = ensureRole(ROLES.ADMIN);

// -----------------------------------------------------------------------------
// POST /api/anexo3        (Inspector crea)
// -----------------------------------------------------------------------------
router.post("/", authMiddleware, ensureInspector, crearAnexo3);

// -----------------------------------------------------------------------------
// GET /api/anexo3/mis     (Permisionario ve sus Anexos 3)
// -----------------------------------------------------------------------------
router.get(
  "/mis",
  authMiddleware,
  ensurePermisionario,
  listarAnexos3Permisionario
);

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id/pdf (Descarga PDF – mismos permisos que el detalle)
// -----------------------------------------------------------------------------
router.get("/:id/pdf", authMiddleware, generarAnexo3PDF);

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id     (Permisionario/Inspector/Admin ven detalle)
// -----------------------------------------------------------------------------
router.get("/:id", authMiddleware, obtenerAnexo3Detalle);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/conforme     (Permisionario da conforme)
// -----------------------------------------------------------------------------
router.patch(
  "/:id/conforme",
  authMiddleware,
  ensurePermisionario,
  permisionarioDaConforme
);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/revision     (Permisionario pide revisión)
// -----------------------------------------------------------------------------
router.patch(
  "/:id/revision",
  authMiddleware,
  ensurePermisionario,
  permisionarioPideRevision
);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/enviar-a-permisionario   (Inspector reenvía)
// -----------------------------------------------------------------------------
router.patch(
  "/:id/enviar-a-permisionario",
  authMiddleware,
  ensureInspector,
  inspectorReenviaAPermisionario
);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/cerrar       (Admin cierra)
// -----------------------------------------------------------------------------
router.patch(
  "/:id/cerrar",
  authMiddleware,
  ensureAdmin,
  adminCierraAnexo3
);

module.exports = router;
