// routes/anexo25Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo25Create } = require('../validators/anexo25Validator');
const anexo25Controller = require('../controllers/anexo25Controller');

/**
 * Crear ANEXO 25
 * Puede ser creado por:
 *  - INSPECTOR
 *  - JEFE_DE_BARRIO
 *  - ADMIN
 *  - ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo25Create,
  anexo25Controller.crearAnexo25
);

/**
 * Obtener ANEXO 25 por ID
 */
router.get('/:id', authRequired, anexo25Controller.obtenerPorId);

/**
 * Listar ANEXO 25
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo25Controller.listar
);

/**
 * Cambiar estado del ANEXO 25
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo25Controller.cambiarEstado
);

module.exports = router;
