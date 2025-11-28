// backend/middleware/auth.js
// Punto único de autenticación y compatibilidad hacia atrás

const jwt = require("jsonwebtoken");
const ROLES = require("./roles");
const requireRole = require("./requireRole"); // para compatibilidad

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Genera un JWT con los datos mínimos necesarios.
 */
function signToken(user) {
  const payload = {
    id: user._id,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Middleware principal de autenticación.
 * - Lee el token desde Authorization: Bearer <token> o cookie "token".
 * - Verifica el JWT y carga req.user = { id, role }.
 */
function authRequired(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers["authorization"] || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Compatibilidad: también permite token en cookie "token"
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error("Error en authRequired:", err);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/**
 * Helpers para setear / limpiar la cookie de auth (si se usan cookies).
 */
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token");
}

/**
 * Función principal que exportamos por default.
 * Esto permite:
 *   const authMiddleware = require("../middleware/auth");
 * y usarlo directamente como middleware.
 */
function authMiddleware(req, res, next) {
  return authRequired(req, res, next);
}

// =============================
// EXPORTS (compatibilidad total)
// =============================

// default: middleware de auth
module.exports = authMiddleware;

// named exports para destructuring:
//   const { requireAuth, requireRole } = require("../middleware/auth");
module.exports.authRequired = authRequired;
module.exports.requireAuth = authRequired;

// helpers de JWT
module.exports.signToken = signToken;
module.exports.setAuthCookie = setAuthCookie;
module.exports.clearAuthCookie = clearAuthCookie;

// reexport de requireRole y ROLES para código legacy
module.exports.requireRole = requireRole;
module.exports.ROLES = ROLES;
