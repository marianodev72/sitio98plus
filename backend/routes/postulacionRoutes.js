// routes/postulacionRoutes.js
// Rutas de postulaciones y asignaciones para ZN98

const express = require('express');
const router = express.Router();

const {
  crearPostulacion,
  listarMisPostulaciones,
  listarPostulacionesAdmin,
  obtenerPostulacion,
  asignarVivienda,
  asignarAlojamiento,
} = require('../controllers/postulacionController');

const { authMiddleware, requireAuth } = require('../middleware/auth');

// Todas las rutas de este módulo requieren estar autenticado
router.use(authMiddleware, requireAuth);

// Crear una nueva postulación (POSTULANTE / PERMISIONARIO / ALOJADO)
router.post('/', crearPostulacion);

// Ver mis propias postulaciones
router.get('/mias', listarMisPostulaciones);

// Listado general para ADMIN / ADMIN_GENERAL
router.get('/', listarPostulacionesAdmin);

// Detalle de una postulación
router.get('/:id', obtenerPostulacion);

// Asignar una vivienda (ANEXO 2) — solo ADMIN_GENERAL
router.post('/:id/asignar-vivienda', asignarVivienda);

// Asignar un alojamiento (ANEXO 22) — solo ADMIN_GENERAL
router.post('/:id/asignar-alojamiento', asignarAlojamiento);

module.exports = router;
