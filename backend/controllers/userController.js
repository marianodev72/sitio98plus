// backend/controllers/userController.js
const { validationResult } = require('express-validator');
const User = require('../models/user');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/auth');

const INVALID_MSG = 'Credenciales inválidas';

// POST /api/users/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ ok: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscamos por email (el frontend manda "email")
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // No revelamos si el email existe o no
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    const safeUser = user.toSafeObject();
    const token = signToken(safeUser);

    // Cookie HTTP-only (por seguridad) + token en el body
    setAuthCookie(res, token);

    return res.json({
      ok: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Error en login:', err);
    next(err);
  }
};

// POST /api/users/register  (registro de postulante)
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ ok: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const { email, password, nombre, apellido } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ ok: false, message: 'Ya existe un usuario con ese correo' });
    }

    const user = new User({
      email,
      username: email, // opcional: dejamos el email como username
      nombre,
      apellido,
      role: 'POSTULANTE',
      activo: true,
    });

    await user.setPassword(password);
    await user.save();

    const safeUser = user.toSafeObject();
    const token = signToken(safeUser);
    setAuthCookie(res, token);

    return res.status(201).json({
      ok: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Error en register:', err);
    next(err);
  }
};

// GET /api/users/me
exports.getMe = async (req, res, next) => {
  try {
    // authMiddleware ya puso req.user
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'No autenticado' });
    }

    return res.json({ ok: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// GET /api/users  (solo ADMIN)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const safe = users.map((u) => u.toSafeObject());
    res.json({ ok: true, users: safe });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/logout
exports.logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
