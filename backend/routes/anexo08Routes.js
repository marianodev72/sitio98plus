// routes/anexo08Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo08Create } = require('../validators/anexo08Validator');
const anexo08Controller = require('../controllers/anexo08Controller');

/**
 * Crear ANEXO 08
 * Solo personal autorizado
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo08Create,
  anexo08Controller.crearAnexo08
);

/**
 * Obtener por ID
 */
router.get(
  '/:id',
  authRequired,
  anexo08Controller.obtenerPorId
);

/**
 * Listar
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo08Controller.listar
);

/**
 * Cambiar estado
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo08Controller.cambiarEstado
);

module.exports = router;
