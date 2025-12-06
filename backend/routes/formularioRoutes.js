// routes/formularioRoutes.js
// Rutas de formularios / ANEXOS — Sistema ZN98

const express = require('express');
const router = express.Router();

const {
  crearAnexo,
  getMisAnexos,
  listarAnexosPorCodigo,
  actualizarEstadoAnexo,
} = require('../controllers/formularioController');

const { authRequired } = require('../middleware/auth');

// Crear un anexo (según código) — ej: POST /api/formularios/ANEXO_04
router.post('/:codigo', authRequired, crearAnexo);

// Obtener MIS anexos (usuario logueado), opcional ?codigo=ANEXO_04
router.get('/mios', authRequired, getMisAnexos);

// Listar anexos por código (según permisos / barrio, etc.)
router.get('/anexo/:codigo', authRequired, listarAnexosPorCodigo);

// Cambiar estado de un anexo (ADMIN / ADMIN_GENERAL / INSPECTOR / JEFE_DE_BARRIO)
router.patch('/:id/estado', authRequired, actualizarEstadoAnexo);

module.exports = router;
