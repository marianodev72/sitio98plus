// backend/controllers/authController.js
const bcrypt = require("bcryptjs");

let User;
try {
  ({ User } = require("../models/user"));
} catch {
  ({ User } = require("../models/User"));
}

const { signToken, setAuthCookie, clearAuthCookie } = require("../middleware/auth");

// LOGIN
async function login(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) return res.status(400).json({ message: "Falta email o password." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas." });
    if (user.activo === false) return res.status(403).json({ message: "Usuario inactivo." });

    if (!user.passwordHash) {
      return res.status(500).json({ message: "Usuario sin passwordHash configurado." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas." });

    const token = signToken(user);
    setAuthCookie(res, token);

    const safe = user.toJSON(); // elimina passwordHash
    return res.json({ message: "Login OK", user: safe, token });
  } catch (err) {
    console.error("[auth.login]", err);
    return res.status(500).json({ message: "Error interno en login." });
  }
}

// LOGOUT
function logout(req, res) {
  clearAuthCookie(res);
  return res.json({ message: "Logout OK" });
}

// ME
function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, logout, me };
