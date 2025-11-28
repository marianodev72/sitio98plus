// backend/routes/users.js
const express = require('express');
const router = express.Router();

// Controladores
const {
  login,
  register,
  getMe,
  getUsers,
} = require('../controllers/userController');

// Middleware de autenticación que ya existe en tu proyecto
const auth = require('../middleware/authMiddleware');

// =======================
// Rutas públicas
// =======================

// Login
router.post('/login', login);

// Registro
router.post('/register', register);

// =======================
// Rutas protegidas
// =======================

// Obtener los datos del usuario autenticado
router.get('/me', auth, getMe);

// Listar usuarios (solo autenticado)
router.get('/', auth, getUsers);

module.exports = router;
