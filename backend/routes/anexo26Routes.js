// routes/anexo26Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo26Create } = require('../validators/anexo26Validator');
const anexo26Controller = require('../controllers/anexo26Controller');

/**
 * Crear ANEXO 26 – solo puede hacerlo:
 *  - INSPECTOR
 *  - JEFE_DE_BARRIO
 *  - ADMIN
 *  - ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo26Create,
  anexo26Controller.crearAnexo26
);

/** Obtener por ID */
router.get('/:id', authRequired, anexo26Controller.obtenerPorId);

/** Listar */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo26Controller.listar
);

module.exports = router;
