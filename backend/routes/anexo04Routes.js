// routes/anexo04Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo04Create } = require('../validators/anexo04Validator');
const anexo04Controller = require('../controllers/anexo04Controller');

/**
 * Crear ANEXO 04
 * - Puede ser creado por cualquier usuario autenticado (permisionario),
 *   o por ADMIN / ADMIN_GENERAL en nombre de un permisionario.
 */
router.post(
  '/',
  authRequired,
  validateAnexo04Create,
  anexo04Controller.crearAnexo04
);

/**
 * Obtener ANEXO 04 por ID
 */
router.get(
  '/:id',
  authRequired,
  anexo04Controller.obtenerPorId
);

/**
 * Listar ANEXO 04
 * Solo ADMIN / ADMIN_GENERAL
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo04Controller.listar
);

/**
 * Cambiar estado del ANEXO 04
 * Solo ADMIN_GENERAL
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo04Controller.cambiarEstado
);

module.exports = router;
