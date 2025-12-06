// routes/viviendaRoutes.js
const express = require('express');
const router = express.Router();

const { authRequired, requireRole } = require('../middlewares/auth');
const {
  validateViviendaCreate,
  validateViviendaUpdate
} = require('../validators/viviendaValidator');

const viviendaController = require('../controllers/viviendaController');

// Listar viviendas
router.get(
  '/',
  authRequired,
  viviendaController.listar
);

// Obtener vivienda por ID
router.get(
  '/:id',
  authRequired,
  viviendaController.obtenerPorId
);

// Crear vivienda (solo ADMIN / ADMIN_GENERAL)
router.post(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  validateViviendaCreate,
  viviendaController.crear
);

// Actualizar vivienda (solo ADMIN / ADMIN_GENERAL)
router.patch(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  validateViviendaUpdate,
  viviendaController.actualizar
);

// Baja lógica de vivienda (solo ADMIN_GENERAL)
router.delete(
  '/:id',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  viviendaController.bajaLogica
);

module.exports = router;
