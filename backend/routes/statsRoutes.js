// backend/routes/statsRoutes.js
// Rutas de estadísticas institucionales

const express = require('express');
const router = express.Router();

// Middleware de autenticación
const { authRequired } = require('../middleware/auth');

// Controlador de estadísticas
const { getResumenStats } = require('../controllers/statsController');

// GET /api/stats/resumen
router.get('/resumen', authRequired, getResumenStats);

module.exports = router;
