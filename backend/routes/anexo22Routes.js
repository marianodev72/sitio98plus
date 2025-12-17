// routes/anexo22Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateGenerarAnexo22 } = require('../validators/anexo22Validator');

const anexo22Controller = require('../controllers/anexo22Controller');

/**
 * GENERAR ANEXO 22 desde ANEXO 21
 */
router.post(
  '/generar-desde-anexo21/:anexo21Id',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  validateGenerarAnexo22,
  anexo22Controller.generarDesdeAnexo21
);

/**
 * CONFIRMAR ASIGNACIÓN (efecto institucional)
 */
router.patch(
  '/:id/confirmar',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  anexo22Controller.confirmarAsignacion
);

module.exports = router;
