// routes/anexo07Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo07Create } = require('../validators/anexo07Validator');
const anexo07Controller = require('../controllers/anexo07Controller');

/**
 * Crear ANEXO 07
 * Solo personal autorizado
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo07Create,
  anexo07Controller.crearAnexo07
);

/**
 * Obtener por ID
 */
router.get('/:id', authRequired, anexo07Controller.obtenerPorId);

/**
 * Listar
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo07Controller.listar
);

/**
 * Cambiar estado
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo07Controller.cambiarEstado
);

module.exports = router;
