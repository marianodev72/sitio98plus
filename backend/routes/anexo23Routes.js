// routes/anexo23Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAnexo23Create } = require('../validators/anexo23Validator');

const anexo23Controller = require('../controllers/anexo23Controller');

/**
 * Crear ANEXO 23
 * Puede ser hecho por INSPECTOR, JEFE_DE_BARRIO, ADMIN, ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo23Create,
  anexo23Controller.crearAnexo23
);

/**
 * Obtener por ID
 */
router.get('/:id', authRequired, anexo23Controller.obtenerPorId);

/**
 * Listar
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo23Controller.listar
);

module.exports = router;
