// routes/anexo01Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { validateAnexo01Create } = require('../validators/anexo01Validator');
const anexo01Controller = require('../controllers/anexo01Controller');

/**
 * Crear ANEXO 01
 * - Puede ser iniciado por POSTULANTE o ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  validateAnexo01Create,
  anexo01Controller.crearAnexo01
);

/**
 * Obtener ANEXO 01 por ID
 */
router.get(
  '/:id',
  authRequired,
  anexo01Controller.obtenerPorId
);

/**
 * Listar ANEXO 01
 * Solo ADMIN o ADMIN_GENERAL
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo01Controller.listar
);

/**
 * Cambiar estado del ANEXO 01
 * Solo ADMIN_GENERAL
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo01Controller.cambiarEstado
);

module.exports = router;
