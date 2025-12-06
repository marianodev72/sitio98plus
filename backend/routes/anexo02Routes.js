// routes/anexo02Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { validateAnexo02Generate } = require('../validators/anexo02Validator');
const anexo02Controller = require('../controllers/anexo02Controller');

/**
 * Generar ANEXO 02 desde ANEXO 01
 * Solo ADMIN_GENERAL
 *
 * POST /api/anexos/02/generar-desde-anexo01/:anexo01Id
 */
router.post(
  '/generar-desde-anexo01/:anexo01Id',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateAnexo02Generate,
  anexo02Controller.generarDesdeAnexo01
);

/**
 * Obtener ANEXO 02 por ID
 */
router.get(
  '/:id',
  authRequired,
  anexo02Controller.obtenerPorId
);

/**
 * Listar ANEXO 02
 * Solo ADMIN / ADMIN_GENERAL
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo02Controller.listar
);

/**
 * Confirmar asignación (cierre del ANEXO 02)
 * Solo ADMIN_GENERAL
 */
router.patch(
  '/:id/confirmar',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo02Controller.confirmarAsignacion
);

module.exports = router;
