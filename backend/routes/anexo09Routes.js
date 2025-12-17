// routes/anexo09Routes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const {
  validateAnexo09Create,
} = require('../validators/anexo09Validator');

const anexo09Controller = require('../controllers/anexo09Controller');

/**
 * Crear ANEXO 09 – Acta de entrega
 * Normalmente INSPECTOR / JEFE_DE_BARRIO / ADMIN / ADMIN_GENERAL
 */
router.post(
  '/',
  authRequired,
  requireRole('INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN', 'ADMIN_GENERAL'),
  validateAnexo09Create,
  anexo09Controller.crearAnexo09
);

/**
 * Obtener por ID
 */
router.get('/:id', authRequired, anexo09Controller.obtenerPorId);

/**
 * Listar
 */
router.get(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  anexo09Controller.listar
);

module.exports = router;
