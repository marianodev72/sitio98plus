// routes/mensajeRoutes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const mensajeController = require('../controllers/mensajeController');

/**
 * IMPORTANTE:
 * De momento NO usamos requireRole ni uploadAdjuntos
 * para evitar el error "Route.post() requires a callback function but got [object Object]".
 * Primero levantamos el servidor estable, después reactivamos filtros de rol y adjuntos.
 */

// Enviar mensaje (sin adjuntos por ahora)
router.post(
  '/',
  authRequired,
  mensajeController.enviarMensaje
);

// Bandeja de entrada
router.get(
  '/entrada',
  authRequired,
  mensajeController.listarEntrada
);

// Enviados
router.get(
  '/enviados',
  authRequired,
  mensajeController.listarEnviados
);

// Ver mensaje por ID
router.get(
  '/:id',
  authRequired,
  mensajeController.obtenerMensaje
);

// Marcar como leído
router.patch(
  '/:id/leido',
  authRequired,
  mensajeController.marcarComoLeido
);

// Auditoría completa (más adelante podemos sumar requireRole('ADMIN_GENERAL'))
router.get(
  '/',
  authRequired,
  mensajeController.listarTodos
);

module.exports = router;
