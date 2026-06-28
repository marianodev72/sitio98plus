// backend/routes/viviendaRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");

// ✅ Import robusto (si falla, dejamos objeto vacío y lo detectamos)
let viviendaController = {};
try {
  viviendaController = require("../controllers/viviendaController");
} catch (e) {
  console.error("[VIVIENDAS][routes] No se pudo cargar viviendaController:", e);
  viviendaController = {};
}

// Todas las rutas /api/viviendas requieren auth + refresh
router.use(authRequired, refreshUserPrivileges);

// A6: helpers para auditoría
router.use(attachAuditHelpers);

// Helper: valida handler antes de registrar rutas (evita crash por Undefined)
function h(name) {
  const fn = viviendaController?.[name];
  if (typeof fn !== "function") {
    console.error(`[VIVIENDAS][routes] Handler faltante o inválido: viviendaController.${name}`);
    // handler fail-closed (no expone nada)
    return (_req, res) => res.status(404).json({ message: "Recurso no disponible" });
  }
  return fn;
}

// ✅ LISTADO principal (ADMIN_GENERAL / ADMIN / territoriales con scope)
// (Lectura sensible en panel admin → auditar acceso)
router.get(
  "/",
  audit("ADMIN_HOUSES_LIST", {
    targetType: "Vivienda",
    // solo query (filtros) + params vacío
    metaAllowlist: [
      "query.codigo",
      "query.barrio",
      "query.estado",
      "query.dormitorios",
      "query.permisionario",
      "query.personasMin",
      "query.personasMax",
      "query.hacinamiento",
      "query.sortBy",
      "query.sortDir",
      "query.page",
      "query.limit",
    ],
  }),
  h("listar")
);

// ✅ Auxiliares (también se consultan desde el panel)
router.get(
  "/barrios",
  audit("ADMIN_HOUSES_BARRIOS", { targetType: "Vivienda" }),
  h("listarBarrios")
);

router.get(
  "/codigos",
  audit("ADMIN_HOUSES_CODIGOS", {
    targetType: "Vivienda",
    metaAllowlist: ["query.barrio"],
  }),
  h("listarCodigos")
);

router.get(
  "/elegibles-asignacion",
  audit("ADMIN_HOUSES_ELIGIBLE_ASSIGNMENT", {
    targetType: "Vivienda",
    metaAllowlist: ["query.anexo01Id"],
  }),
  h("listarElegiblesAsignacion")
);

// ✅ PDF respetando filtros actuales (lectura/export sensible → auditar)
router.get(
  "/pdf",
  audit("ADMIN_HOUSES_EXPORT_PDF", {
    targetType: "Vivienda",
    metaAllowlist: [
      "query.codigo",
      "query.barrio",
      "query.estado",
      "query.dormitorios",
      "query.permisionario",
      "query.personasMin",
      "query.personasMax",
      "query.hacinamiento",
      "query.sortBy",
      "query.sortDir",
    ],
  }),
  h("generarPdf")
);

// ✅ Cambiar estado (mutación crítica → auditar)
// Nota: NO incluimos body completo, solo campos mínimos habituales.
router.patch(
  "/:id/estado",
  audit("ADMIN_HOUSES_CHANGE_STATUS", {
    targetType: "Vivienda",
    metaAllowlist: ["params.id", "body.estado", "body.nuevoEstado"],
  }),
  h("cambiarEstado")
);

module.exports = router;
