// routes/authRoutes.js
// Rutas de autenticación — Sistema ZN98

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');

const { authRequired } = require('../middleware/auth');

// Registro público de postulante
router.post('/register', register);

// Login
router.post('/login', login);

// Logout
router.post('/logout', authRequired, logout);

// Obtener datos del usuario logueado
router.get('/me', authRequired, getMe);

module.exports = router;
