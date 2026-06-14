// backend/routes/formularios.js
// Rutas de formularios y ANEXOS — Sistema ZN98 / Sitio 98

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

function allowAdminOrInspectorForAnexo02(req, res, next) {
  const user = req.user;
  const role = String(user?.role || "").toUpperCase().trim();
  const codigo = String(req.params?.codigo || "").toUpperCase().trim();

  if (role === "ADMIN" || role === "ADMIN_GENERAL") return next();

  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  const permisosUp = permisos.map((p) => String(p || "").toUpperCase().trim());
  const isInspector = role === "PERMISIONARIO" && permisosUp.includes("INSPECTOR");

  if (isInspector && codigo === "ANEXO_02") return next();

  return res.status(403).json({ message: "Forbidden" });
}

const { authRequired, requireRole } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");
const c = require("../controllers/formularioController");
const { validateUploadedFiles } = require("../middleware/validateUploadedFiles");

const {
  actualizarDatosAnexo07,
  cerrarAnexo07AdminGeneral,
} = require("../controllers/anexo07Controller");

let Anexo09CreateSchema = null;

try {
  ({ Anexo09CreateSchema } = require("../validators/anexo09Validator"));
  console.log("[formularios] Validador ANEXO_09 cargado correctamente.");
} catch (e) {
  console.warn(
    "[formularios] No se pudo cargar validators/anexo09Validator.js:",
    e.message
  );
}

const UPLOADS = path.join(process.cwd(), "uploads", "formularios");
fs.mkdirSync(UPLOADS, { recursive: true });

const BASE_ROLES = new Set(["PERMISIONARIO", "ALOJADO", "ADMIN_GENERAL", "ADMIN"]);

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(u, perm) {
  const perms = Array.isArray(u?.permisos) ? u.permisos : [];
  const upPerms = perms.map((p) => String(p || "").toUpperCase().trim());
  return upPerms.includes(String(perm || "").toUpperCase().trim());
}

function requirePermiso(...permisosRequeridos) {
  const required = permisosRequeridos.map((p) =>
    String(p || "").toUpperCase().trim()
  );
  return (req, res, next) => {
    const role = up(req.user?.role);

    if (role !== "PERMISIONARIO") {
      return res.status(403).json({ message: "No autorizado" });
    }

    const ok = required.every((p) => hasPerm(req.user, p));

    if (!ok) {
      return res.status(403).json({ message: "No autorizado" });
    }

    return next();
  };
}

function denyNotImplemented(req, res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const tiposPermitidos = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const extensionesPeligrosas = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".js",
  ".ts",
  ".php",
  ".py",
  ".jar",
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const cleanName = String(file.originalname || "archivo").replace(/\s+/g, "_");
    cb(null, `${timestamp}_${cleanName}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (extensionesPeligrosas.includes(ext)) {
    return cb(new Error("Tipo de archivo no permitido por seguridad"), false);
  }

  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error("Formato de archivo no permitido"), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

router.use(authRequired, refreshUserPrivileges, attachAuditHelpers);

// ─────────────────────────────
// Bandejas

router.get("/mios", c.getMisAnexos);
router.get("/propios", c.getAnexosPropios);
router.get("/mis-anexos", c.getMisAnexosPermisionario);

// ─────────────────────────────
// MIS DATOS DECLARADOS

router.post(
  "/mis-datos-declarados/actualizar",
  authRequired,
  c.actualizarMisDatosDeclarados
);

router.get(
  "/mis-datos-declarados/historial",
  authRequired,
  c.historialMisDatosDeclarados
);

router.get("/mis-datos-declarados/:id/pdf/preview", c.verMisDatosDeclaradosPdf);
router.get("/mis-datos-declarados/:id/pdf", c.descargarMisDatosDeclaradosPdf);
router.get("/mis-datos-declarados/:id", c.getMisDatosDeclaradosUpdateById);

// ─────────────────────────────
// Listado por código

router.get(
  "/anexo/:codigo",
  authRequired,
  refreshUserPrivileges,
  allowAdminOrInspectorForAnexo02,
  c.listarPorCodigo
);
// ─────────────────────────────
// Detalle + PDF

router.get("/:id/adjuntos/:fileId", c.descargarAdjuntoFormulario);
router.get("/:id/pdf", c.descargarPdf);
router.get("/:id", c.getById);

// ─────────────────────────────
// Acciones

router.patch(
  "/:id/estado-institucional",
  requireRole("ADMIN_GENERAL"),
  c.setEstadoInstitucional
);

router.patch("/:id/datos", requirePermiso("INSPECTOR"), c.updateDatosAnexo03);

router.patch(
  "/:id/anexo-04/observaciones",
  requirePermiso("JEFE_DE_BARRIO"),
  c.updateObservacionesAnexo04
);

router.post(
  "/:id/conformidad-jefe-04",
  requirePermiso("JEFE_DE_BARRIO"),
  (req, _res, next) => {
    req.audit.addMeta({ actorEffectiveRole: "JEFE_DE_BARRIO" });
    next();
  },
  audit("FORM_CONFORMIDAD_JEFE_BARRIO_04", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadJefeBarrio04
);

// ─────────────────────────────
// ANEXO_07

router.patch(
  "/:id/anexo-07/datos",
  requirePermiso("INSPECTOR"),
  actualizarDatosAnexo07
);

// ─────────────────────────────
// Crear anexos

// 🔥 1. ANEXO 02 → SACAR upload (seguro)
router.post(
  "/:id/generar-anexo-02",
  requireRole("ADMIN_GENERAL"),
  c.generarAnexo02DesdeAnexo01
);

router.post(
  "/:id/aprobar-postulacion",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_APROBAR_POSTULACION_01", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.aprobarPostulacionAnexo01
);

router.post(
  "/:id/rechazar-postulacion",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_RECHAZAR_POSTULACION_01", {
    targetType: "FORM",
    metaAllowlist: ["params.id", "body.motivo"],
  }),
  c.rechazarPostulacionAnexo01
);

// 🔥 2. CREAR ANEXOS → agregar validación REAL
router.post(
  "/:codigo",
  upload.fields([
    { name: "adjuntos", maxCount: 10 },
    { name: "adj_fidofac", maxCount: 1 },
    { name: "adj_vacunacion", maxCount: 1 },
    { name: "adj_recibo_haberes", maxCount: 1 },
    { name: "adj_escrituras_contratos", maxCount: 1 },
    { name: "adj_oficio_socio", maxCount: 1 },
  ]),
  validateUploadedFiles,
  c.crearAnexo
);
// ─────────────────────────────
// ANEXO_02

router.post(
  "/:id/conformidad",
  audit("FORM_CONFORMIDAD", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidad
);

router.post(
  "/:id/conformidad-admin",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_CONFORMIDAD_ADMIN", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadAdmin
);

// ─────────────────────────────
// ANEXO_03

router.post(
  "/:id/conformidad-permisionario-03",
  requireRole("PERMISIONARIO"),
  audit("FORM_CONFORMIDAD_PERMISIONARIO_03", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadPermisionario03
);

router.post(
  "/:id/cierre-admin-general",
  requireRole("ADMIN_GENERAL"),
  c.cerrarAnexo03AdminGeneral
);

router.post(
  "/:id/enviar",
  requirePermiso("INSPECTOR"),
  (req, _res, next) => {
    req.audit.addMeta({ actorEffectiveRole: "INSPECTOR" });
    next();
  },
  audit("FORM_ENVIO_INSPECTOR_03", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.enviarAnexo03
);

router.post(
  "/:id/cerrar-admin-03",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_CIERRE_ADMIN_03", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.cerrarAnexo03AdminGeneral
);

// ─────────────────────────────
// ANEXO_07

router.post(
  "/:id/cerrar-admin-07",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_CIERRE_ADMIN_07", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  cerrarAnexo07AdminGeneral
);

// ─────────────────────────────
// ANEXO_08

router.post(
  "/:id/conformidad-permisionario-08",
  requireRole("PERMISIONARIO"),
  audit("FORM_CONFORMIDAD_PERMISIONARIO_08", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadPermisionario08
);

router.post(
  "/:id/cerrar-admin-08",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_CIERRE_ADMIN_08", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.cerrarAnexo08AdminGeneral
);

router.post(
  "/:id/anexo-08/datos",
  requirePermiso("INSPECTOR"),
  c.actualizarDatosAnexo08
);

// ─────────────────────────────
// ANEXO_09

router.post(
  "/:id/conformidad-permisionario-09",
  requireRole("PERMISIONARIO"),
  audit("FORM_CONFORMIDAD_PERMISIONARIO_09", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadPermisionario09
);

router.post(
  "/:id/cerrar-admin-09",
  requireRole("ADMIN_GENERAL"),
  audit("FORM_CIERRE_ADMIN_09", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.cerrarAnexo09AdminGeneral
);

// ─────────────────────────────
// ANEXO_11

router.post(
  "/:id/gestion-admin-11",
  requireRole("ADMIN_GENERAL", "ADMIN"),
  audit("FORM_CIERRE_ADMIN_11", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.gestionarAnexo11Admin
);

router.post(
  "/:id/conformidad-permisionario-11",
  requireRole("PERMISIONARIO"),
  audit("FORM_CONFORMIDAD_PERMISIONARIO_11", {
    targetType: "FORM",
    metaAllowlist: ["params.id"],
  }),
  c.darConformidadPermisionario11
);

module.exports = router;
