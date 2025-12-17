// routes/anexo11Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo11Create } = require('../validators/anexo11Validator');
const anexo11Controller = require('../controllers/anexo11Controller');

/**
 * Crear ANEXO 11 – Pedido de Trabajo
 * Puede ser generado por:
 *  - PERMISIONARIO (solicita trabajo)
 *  - INSPECTOR
 *  - JEFE_DE_BARRIO
 *  - ADMIN
 *  - ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('PERMISIONARIO', 'INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo11Create,
  anexo11Controller.crearAnexo11
);

/**
 * Obtener por ID
 */
router.get('/:id', authRequired, anexo11Controller.obtenerPorId);

/**
 * Listar (solo para ADMIN / ADMIN_GENERAL)
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo11Controller.listar
);

/**
 * Cambiar estado
 */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo11Controller.cambiarEstado
);

module.exports = router;
