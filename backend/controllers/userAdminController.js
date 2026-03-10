// routes/userAdminRoutes.js
const express = require('express');
const router = express.Router();

const { authRequired, requireRole } = require('../middleware/auth');
const {
  validateActualizarRolEstado,
  validateActualizarBloqueo
} = require('../validators/userAdminValidator');

const userAdminController = require('../controllers/userAdminController');

/**
 * ADMIN_GENERAL: pleno (con registro en cambios)
 * ADMIN: lectura institucional
 */

router.get(
  '/',
  authRequired,
  requireRole('ADMIN_GENERAL', 'ADMIN'),
  userAdminController.listarUsuarios
);

router.get(
  '/:id',
  authRequired,
  requireRole('ADMIN_GENERAL', 'ADMIN'),
  userAdminController.obtenerUsuario
);

router.patch(
  '/:id/rol-estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateActualizarRolEstado,
  userAdminController.actualizarRolEstado
);

router.patch(
  '/:id/bloqueo',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateActualizarBloqueo,
  userAdminController.actualizarBloqueo
);

module.exports = router;
