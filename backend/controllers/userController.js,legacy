// backend/controllers/userController.js
const { validationResult } = require("express-validator");

// Import robusto del modelo (soporta exports {User} o default)
let UserModel = null;
try {
  ({ User: UserModel } = require("../models/user"));
} catch {
  try {
    UserModel = require("../models/user");
  } catch {
    UserModel = null;
  }
}

const { signToken, setAuthCookie, clearAuthCookie } = require("../middleware/auth");

const INVALID_MSG = "Credenciales inválidas";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

// -----------------------------------------------------------------------------
// POST /api/auth/login (o similar)
// -----------------------------------------------------------------------------
exports.login = async (req, res) => {
  try {
    if (!UserModel) {
      return res.status(500).json({ ok: false, message: "Modelo no disponible." });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        message: "Datos inválidos",
        errors: errors.array(),
      });
    }

    const { email: bodyEmail, password: bodyPassword, clave: bodyClave } = req.body || {};
    const email = normEmail(bodyEmail);
    const password = bodyPassword || bodyClave;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Debe indicar email y contraseña." });
    }

    // Tu modelo usa passwordHash (select:false)
    const user = await UserModel.findOne({ email }).select("+passwordHash +tokenVersion");
    if (!user) {
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    // Compatibilidad con distintos nombres de método
    let isMatch = false;
    if (typeof user.checkPassword === "function") {
      isMatch = await user.checkPassword(password);
    } else if (typeof user.validarPassword === "function") {
      isMatch = await user.validarPassword(password);
    } else if (typeof user.comparePassword === "function") {
      isMatch = await user.comparePassword(password);
    } else {
      return res.status(500).json({ ok: false, message: "Modelo de password no soportado." });
    }

    if (!isMatch) {
      return res.status(400).json({ ok: false, message: INVALID_MSG });
    }

    if (user.activo === false) {
      return res.status(403).json({
        ok: false,
        message: "Usuario inactivo. Contacte al administrador.",
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    const safeUser = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      activo: user.activo,
    };

    return res.json({
      ok: true,
      user: safeUser,
      token, // compat: algunos front esperan token en body
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ ok: false, message: "Error interno del servidor." });
  }
};

// -----------------------------------------------------------------------------
// POST /api/auth/register (o similar)
// -----------------------------------------------------------------------------
exports.register = async (req, res) => {
  try {
    if (!UserModel) {
      return res.status(500).json({ ok: false, message: "Modelo no disponible." });
    }

    const { email: bodyEmail, password, role, nombre, apellido } = req.body || {};
    const email = normEmail(bodyEmail);

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email y contraseña son obligatorios." });
    }

    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ ok: false, message: "Ya existe un usuario con ese email." });
    }

    const user = new UserModel({
      email,
      role: role || "POSTULANTE",
      nombre: nombre || "",
      apellido: apellido || "",
      activo: true,
    });

    if (typeof user.setPassword === "function") {
      await user.setPassword(password);
    } else {
      user.password = password;
    }

    await user.save();

    const safeUser = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      activo: user.activo,
    };

    return res.status(201).json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("❌ Error en register:", err);
    return res.status(500).json({ ok: false, message: "Error al registrar usuario." });
  }
};

// -----------------------------------------------------------------------------
// GET /api/users/me (o /api/auth/me)
// -----------------------------------------------------------------------------
exports.getMe = async (req, res) => {
  try {
    if (!UserModel) {
      return res.status(500).json({ ok: false, message: "Modelo no disponible." });
    }

    const myId = req.user?._id || req.user?.id;
    if (!myId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const user = await UserModel.findById(myId).select("_id email role activo");
    if (!user) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
    }

    return res.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        activo: user.activo,
      },
    });
  } catch (err) {
    console.error("❌ Error en getMe:", err);
    return res.status(500).json({ ok: false, message: "Error al obtener el usuario." });
  }
};

// -----------------------------------------------------------------------------
// POST /api/auth/logout (o similar)
// -----------------------------------------------------------------------------
exports.logout = async (_req, res) => {
  try {
    clearAuthCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en logout:", err);
    return res.status(500).json({ ok: false, message: "Error al cerrar sesión" });
  }
};
