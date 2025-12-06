// routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const { authRequired } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

/**
 * OJO:
 * De momento SOLO usamos authRequired.
 * Más adelante podemos volver a sumar requireRole('ADMIN_GENERAL')
 * cuando ya tengamos todo estable.
 */

// Todas las rutas de este router requieren estar logueado
router.use(authRequired);

// Listar usuarios con filtros
router.get('/usuarios', adminController.listarUsuarios);

// Crear usuario manualmente
router.post('/usuarios', adminController.crearUsuario);

// Editar usuario (datos administrativos)
router.put('/usuarios/:id', adminController.actualizarUsuario);

// Cambiar rol de usuario
router.patch('/usuarios/:id/rol', adminController.cambiarRol);

// Cambiar estado habitacional
router.patch(
  '/usuarios/:id/estado-habitacional',
  adminController.cambiarEstadoHabitacional
);

// Bloquear / desbloquear usuario
router.patch('/usuarios/:id/bloqueo', adminController.cambiarBloqueo);

// Resetear contraseña
router.post(
  '/usuarios/:id/reset-password',
  adminController.resetearPassword
);

// Ver historial de cambios
router.get('/usuarios/:id/historial', adminController.verHistorial);

// Asignar / desasignar vivienda POR ORDEN SUPERIOR
router.post(
  '/usuarios/:id/asignar-vivienda',
  adminController.asignarViviendaPorOrdenSuperior
);
router.post(
  '/usuarios/:id/desasignar-vivienda',
  adminController.desasignarViviendaPorOrdenSuperior
);

// Asignar / desasignar alojamiento POR ORDEN SUPERIOR
router.post(
  '/usuarios/:id/asignar-alojamiento',
  adminController.asignarAlojamientoPorOrdenSuperior
);
router.post(
  '/usuarios/:id/desasignar-alojamiento',
  adminController.desasignarAlojamientoPorOrdenSuperior
);

module.exports = router;
