// backend/routes/anexo11.js
// Rutas para el Anexo 11 (Pedido de trabajo)

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const ROLES = require("../middleware/roles");

const {
  crearAnexo11,
  listarAnexos11Permisionario,
  obtenerAnexo11Detalle,
  generarAnexo11PDF,
} = require("../controllers/anexo11Controller");

// -----------------------------------------------------------------------------
// Helper para obtener el rol del usuario
// -----------------------------------------------------------------------------
function getRole(user) {
  if (!user) return null;

  if (user.role) {
    return String(user.role).trim().toUpperCase();
  }

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return String(user.roles[0]).trim().toUpperCase();
  }

  return null;
}

// -----------------------------------------------------------------------------
// Middleware: asegura que el usuario sea PERMISIONARIO
// -----------------------------------------------------------------------------
function ensurePermisionario(req, res, next) {
  try {
    console.log("[ANEXO11] ensurePermisionario → req.user =", req.user);

    // 1) Si por alguna razón no hay req.user, 401.
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado (req.user vacío en Anexo11).",
      });
    }

    const role = getRole(req.user);
    console.log(
      "[ANEXO11] ensurePermisionario → role resuelto =",
      role,
      " / esperado =",
      ROLES.PERMISIONARIO
    );

    // 2) Si no hay rol, también 401 (usuario mal configurado).
    if (!role) {
      return res.status(401).json({
        ok: false,
        message:
          "Usuario autenticado pero sin rol asignado. Contacte al administrador.",
      });
    }

    // 3) Rol incorrecto → 403 (no 401).
    if (role !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: `Acceso permitido solo para permisionarios. Rol actual: ${role}`,
      });
    }

    // 4) Todo OK → dejamos pasar.
    return next();
  } catch (err) {
    console.error("Error en ensurePermisionario (Anexo11):", err);
    return res.status(500).json({
      ok: false,
      message: "Error al validar permisos de permisionario.",
    });
  }
}

// -----------------------------------------------------------------------------
// Rutas (auth RS256 + permisos de permisionario)
// -----------------------------------------------------------------------------

// Crear Anexo 11
router.post("/", auth, ensurePermisionario, crearAnexo11);

// Listar Anexos 11 del permisionario logueado
router.get("/mis", auth, ensurePermisionario, listarAnexos11Permisionario);

// Generar/obtener PDF de un Anexo 11
router.get("/:id/pdf", auth, ensurePermisionario, generarAnexo11PDF);

// Detalle de un Anexo 11
router.get("/:id", auth, ensurePermisionario, obtenerAnexo11Detalle);

module.exports = router;
