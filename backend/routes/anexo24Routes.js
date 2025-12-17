// routes/anexo24Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo24Create } = require('../validators/anexo24Validator');
const anexo24Controller = require('../controllers/anexo24Controller');

/**
 * Crear ANEXO 24
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
  validateAnexo24Create,
  anexo24Controller.crearAnexo24
);

/**
 * Obtener ANEXO 24 por ID
 */
router.get('/:id', authRequired, anexo24Controller.obtenerPorId);

/**
 * Listar ANEXO 24
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo24Controller.listar
);

/**
 * Cambiar estado del ANEXO 24
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo24Controller.cambiarEstado
);

module.exports = router;
