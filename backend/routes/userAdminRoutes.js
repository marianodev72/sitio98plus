// routes/userAdminRoutes.js
const express = require('express');
const router = express.Router();

const { authRequired, requireRole } = require('../middlewares/auth');
const {
  validateActualizarRolEstado,
  validateActualizarBloqueo
} = require('../validators/userAdminValidator');

const userAdminController = require('../controllers/userAdminController');

/**
 * IMPORTANTE:
 * Todas estas rutas están protegidas con requireRole('ADMIN_GENERAL')
 * para que solo el administrador general pueda usarlas.
 */

// Listar usuarios con filtros
router.get(
  '/',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  userAdminController.listarUsuarios
);

// Obtener detalle de un usuario
router.get(
  '/:id',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  userAdminController.obtenerUsuario
);

// Actualizar rol + estadoHabitacional
router.patch(
  '/:id/rol-estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateActualizarRolEstado,
  userAdminController.actualizarRolEstado
);

// Bloquear / desbloquear usuario
router.patch(
  '/:id/bloqueo',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateActualizarBloqueo,
  userAdminController.actualizarBloqueo
);

module.exports = router;
