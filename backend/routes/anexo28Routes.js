// routes/anexo28Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo28Create } = require('../validators/anexo28Validator');
const anexo28Controller = require('../controllers/anexo28Controller');

/**
 * Crear ANEXO 28 – Pedido de trabajo de alojamiento
 * Puede generarlo:
 *  - ALOJADO (huésped)
 *  - INSPECTOR
 *  - JEFE_DE_BARRIO
 *  - ADMIN
 *  - ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('ALOJADO', 'INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo28Create,
  anexo28Controller.crearAnexo28
);

/** Obtener por ID */
router.get('/:id', authRequired, anexo28Controller.obtenerPorId);

/** Listar (ADMIN / ADMIN_GENERAL) */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo28Controller.listar
);

/** Cambiar estado (solo ADMIN_GENERAL) */
router.patch(
  '/:id/estado',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo28Controller.cambiarEstado
);

module.exports = router;
