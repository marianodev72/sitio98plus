// routes/tareasRoutes.js
// Rutas para tareas programadas / procesos periódicos — Sistema ZN98

const express = require('express');
const router = express.Router();

const {
  runRecordatoriosDesocupacion,
} = require('../controllers/tareasController');

const { authRequired, requireRole } = require('../middleware/auth');

// Ejecutar recordatorios de desocupación (90 días antes)
// Pensado para ser llamado por ADMIN_GENERAL o por un job programado
router.post(
  '/recordatorios-desocupacion/run',
  authRequired,
  requireRole('ADMIN_GENERAL'),
  runRecordatoriosDesocupacion
);

module.exports = router;
