// backend/controllers/userController.js

const { validationResult } = require("express-validator");
const User = require("../models/user");
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require("../middleware/auth");

const INVALID_MSG = "Credenciales inválidas";

// -----------------------------------------------------------------------------
// LOGIN
// -----------------------------------------------------------------------------
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        message: "Datos inválidos",
        errors: errors.array(),
      });
    }

    const { email, password: bodyPassword, clave: bodyClave } = req.body || {};
    const password = bodyPassword || bodyClave;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Debe indicar email y contraseña." });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    if (user.activo === false) {
      return res.status(403).json({
        ok: false,
        message: "Usuario inactivo. Contacte al administrador.",
      });
    }

    const safeUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      activo: user.activo,
    };

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      ok: true,
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error interno del servidor." });
  }
};

// -----------------------------------------------------------------------------
// REGISTER
// -----------------------------------------------------------------------------
exports.register = async (req, res) => {
  try {
    const { email, password, role, nombre, apellido } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Email y contraseña son obligatorios." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(400)
        .json({ ok: false, message: "Ya existe un usuario con ese email." });
    }

    const user = new User({
      email,
      password,
      role: role || "POSTULANTE",
      nombre: nombre || "",
      apellido: apellido || "",
      activo: true,
    });

    await user.save();

    const safeUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      activo: user.activo,
    };

    return res.status(201).json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("❌ Error en register:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error al registrar usuario." });
  }
};

// -----------------------------------------------------------------------------
// GET /api/users/me
// -----------------------------------------------------------------------------
exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado." });
    }

    const safeUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      activo: user.activo,
    };

    return res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("❌ Error en getMe:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error al obtener el usuario." });
  }
};

// -----------------------------------------------------------------------------
// GET USERS RAW
// -----------------------------------------------------------------------------
exports.getUsersRaw = async () => {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    nombre: u.nombre,
    apellido: u.apellido,
    role: u.role,
    activo: u.activo,
  }));
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
exports.logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en logout:", err);
    res.status(500).json({ ok: false, message: "Error al cerrar sesión" });
  }
};
