// backend/routes/anexo3.js
// Rutas para Anexo 3 (Acta de Recepción de Vivienda Fiscal)

const express = require("express");
const router = express.Router();

// Tomamos ROLES y requireRole desde el middleware de auth central
const { ROLES, requireRole } = require("../middleware/auth");

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

// NOTA IMPORTANTE:
// En server.js/app.js tiene que existir algo así:
//   const auth = require("./middleware/auth");
//   const anexo3Routes = require("./routes/anexo3");
//   app.use("/api/anexo3", auth, anexo3Routes);
// Es decir: auth SE APLICA antes de estas rutas.

// Middlewares de rol usando la función centralizada
const ensureInspector = requireRole(ROLES.INSPECTOR);
const ensurePermisionario = requireRole(ROLES.PERMISIONARIO);
const ensureAdmin = requireRole(ROLES.ADMIN);

// -----------------------------------------------------------------------------
// POST /api/anexo3
// Crea un nuevo Anexo 3 (lo inicia el INSPECTOR)
// -----------------------------------------------------------------------------
router.post("/", ensureInspector, crearAnexo3);

// -----------------------------------------------------------------------------
// GET /api/anexo3/mis
// Lista los Anexos 3 del permisionario logueado
// -----------------------------------------------------------------------------
router.get("/mis", ensurePermisionario, listarAnexos3Permisionario);

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id/pdf
// Genera y descarga el PDF del Anexo 3
// (permisionario dueño / inspector asignado / admin)
// -----------------------------------------------------------------------------
router.get("/:id/pdf", generarAnexo3PDF);

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id
// Detalle del Anexo 3 (permisionario dueño / inspector asignado / admin)
// -----------------------------------------------------------------------------
router.get("/:id", obtenerAnexo3Detalle);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/conforme
// Permisionario da CONFORME -> PENDIENTE_CIERRE_ADMIN
// -----------------------------------------------------------------------------
router.patch("/:id/conforme", ensurePermisionario, permisionarioDaConforme);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/revision
// Permisionario NO está de acuerdo -> EN_REVISION_INSPECTOR
// -----------------------------------------------------------------------------
router.patch("/:id/revision", ensurePermisionario, permisionarioPideRevision);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/enviar-a-permisionario
// Inspector reenvía luego de revisar -> PENDIENTE_CONFORME_PERMISIONARIO
// -----------------------------------------------------------------------------
router.patch(
  "/:id/enviar-a-permisionario",
  ensureInspector,
  inspectorReenviaAPermisionario
);

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/cerrar
// Admin General cierra el trámite -> CERRADO
// -----------------------------------------------------------------------------
router.patch("/:id/cerrar", ensureAdmin, adminCierraAnexo3);

module.exports = router;
