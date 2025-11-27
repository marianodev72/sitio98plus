// backend/middleware/requireRole.js
// Middleware genérico para validar roles

const ROLES = require("./roles");

// función principal
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "No tiene permisos para acceder a este recurso.",
      });
    }

    next();
  };
}

// compatibilidad con distintos estilos de import
module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.ROLES = ROLES;
