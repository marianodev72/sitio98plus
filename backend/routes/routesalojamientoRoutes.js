// routes/alojamientoRoutes.js
const express = require('express');
const router = express.Router();

const { authRequired, requireRole } = require('../middlewares/auth');
const {
  validateAlojamientoCreate,
  validateAlojamientoUpdate
} = require('../validators/alojamientoValidator');

const alojamientoController = require('../controllers/alojamientoController');

// Listar alojamientos
router.get(
  '/',
  authRequired,
  alojamientoController.listar
);

// Obtener alojamiento por ID
router.get(
  '/:id',
  authRequired,
  alojamientoController.obtenerPorId
);

// Crear alojamiento (solo ADMIN / ADMIN_GENERAL)
router.post(
  '/',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  validateAlojamientoCreate,
  alojamientoController.crear
);

// Actualizar alojamiento (solo ADMIN / ADMIN_GENERAL)
router.patch(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  validateAlojamientoUpdate,
  alojamientoController.actualizar
);

// Baja lógica de alojamiento (solo ADMIN_GENERAL)
router.delete(
  '/:id',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  alojamientoController.bajaLogica
);

module.exports = router;
