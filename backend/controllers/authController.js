// controllers/authController.js
// Controlador de autenticación — Sistema ZN98

const { User } = require('../models/User');
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../middleware/auth');

// POST /api/auth/register
// Registro de nuevo POSTULANTE (uso público)
async function register(req, res) {
  try {
    const { nombre, apellido, email, dni, matricula, password, telefono } =
      req.body || {};

    if (!nombre || !apellido || !email || !dni || !matricula || !password) {
      return res
        .status(400)
        .json({ message: 'Faltan datos obligatorios para registro.' });
    }

    const emailExistente = await User.findOne({ email: email.toLowerCase() });
    if (emailExistente) {
      return res.status(400).json({ message: 'El email ya está registrado.' });
    }

    const matriculaExistente = await User.findOne({ matricula });
    if (matriculaExistente) {
      return res
        .status(400)
        .json({ message: 'La matrícula ya está registrada.' });
    }

    const user = new User({
      nombre,
      apellido,
      email: email.toLowerCase(),
      dni,
      matricula,
      telefono: telefono || '',
      role: 'POSTULANTE',
      activo: true,
      bloqueado: false,
    });

    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token);

    const userSafe = {
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      dni: user.dni,
      matricula: user.matricula,
      role: user.role,
      activo: user.activo,
    };

    res.status(201).json({
      message: 'Registro exitoso.',
      user: userSafe,
    });
  } catch (err) {
    console.error('[authController.register] Error:', err);
    res.status(500).json({ message: 'Error en registro.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email y contraseña son obligatorios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash'
    );

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    if (!user.activo || user.bloqueado) {
      return res
        .status(403)
        .json({ message: 'Usuario inactivo o bloqueado.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    user.markLogin();
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token);

    const userSafe = {
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      dni: user.dni,
      matricula: user.matricula,
      role: user.role,
      activo: user.activo,
      barrioAsignado: user.barrioAsignado || null,
    };

    res.json({
      message: 'Login exitoso.',
      user: userSafe,
    });
  } catch (err) {
    console.error('[authController.login] Error:', err);
    res.status(500).json({ message: 'Error en login.' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    clearAuthCookie(res);
    res.json({ message: 'Sesión cerrada.' });
  } catch (err) {
    console.error('[authController.logout] Error:', err);
    res.status(500).json({ message: 'Error en logout.' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    // req.user viene seteado por authRequired
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    const userSafe = {
      id: req.user._id,
      nombre: req.user.nombre,
      apellido: req.user.apellido,
      email: req.user.email,
      dni: req.user.dni,
      matricula: req.user.matricula,
      role: req.user.role,
      activo: req.user.activo,
      barrioAsignado: req.user.barrioAsignado || null,
    };

    res.json({
      user: userSafe,
    });
  } catch (err) {
    console.error('[authController.getMe] Error:', err);
    res.status(500).json({ message: 'Error obteniendo datos de usuario.' });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
