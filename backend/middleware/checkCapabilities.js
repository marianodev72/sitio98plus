// middlewares/checkCapabilities.js
const ROLE_CAPABILITIES = require('../config/roleCapabilities');

/**
 * Middleware de autorización declarativa.
 * Verifica si el rol del usuario tiene la capacidad requerida.
 * 
 * @param {string} action - La capacidad que el endpoint necesita.
 */
function checkCapabilities(action) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const role = req.user.role;
      const caps = ROLE_CAPABILITIES[role];

      if (!caps) {
        return res.status(403).json({ error: 'Rol no reconocido por el sistema' });
      }

      // Casos especiales de acceso total
      if (caps.puedeVer.includes('TODO')) {
        return next();
      }

      // Verificación de permisos por acción requerida
      const tienePermiso =
        caps.puedeVer.includes(action) ||
        caps.puedeIniciarAnexos.includes(action);

      if (!tienePermiso) {
        return res.status(403).json({
          error: `El rol ${role} no tiene permiso para realizar la acción: ${action}`
        });
      }

      return next();
    } catch (err) {
      console.error('Error en checkCapabilities:', err);
      return res.status(500).json({ error: 'Error interno en autorización' });
    }
  };
}

module.exports = checkCapabilities;
