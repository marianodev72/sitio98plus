// routes/anexo21Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo21Create } = require('../validators/anexo21Validator');

const anexo21Controller = require('../controllers/anexo21Controller');

/**
 * Crear ANEXO 21
 * Puede ser creado por el propio POSTULANTE,
 * o por ADMIN / ADMIN_GENERAL.
 */
router.post(
  '/',
  authRequired,
  requireRole('POSTULANTE', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo21Create,
  anexo21Controller.crearAnexo21
);

/** Obtener ANEXO 21 */
router.get('/:id', authRequired, anexo21Controller.obtenerPorId);

/** Listar ANEXO 21 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo21Controller.listar
);

/** Cambiar estado */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo21Controller.cambiarEstado
);

module.exports = router;
