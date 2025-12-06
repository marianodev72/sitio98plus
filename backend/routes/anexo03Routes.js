// routes/anexo03Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { validateAnexo03Create } = require('../validators/anexo03Validator');
const anexo03Controller = require('../controllers/anexo03Controller');

/**
 * Crear ANEXO 03
 * Normalmente creado por INSPECTOR / JEFE_DE_BARRIO / ADMIN / ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo03Create,
  anexo03Controller.crearAnexo03
);

/**
 * Obtener ANEXO 03 por ID
 */
router.get(
  '/:id',
  authRequired,
  anexo03Controller.obtenerPorId
);

/**
 * Listar ANEXO 03
 * Solo ADMIN / ADMIN_GENERAL
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo03Controller.listar
);

/**
 * Cambiar estado del ANEXO 03
 * Solo ADMIN_GENERAL
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo03Controller.cambiarEstado
);

module.exports = router;
