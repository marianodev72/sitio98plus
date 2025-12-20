// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ✅ IMPORT CORRECTO (tu modelo exporta { User: ... })
const { User } = require("../models/User");

// ====== Config ======
const GENERIC_ERROR = "No se ha podido procesar su solicitud, contacte al administrador";
const MAX_FAILS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// ====== RSA Key ======
const PRIVATE_KEY = fs.readFileSync(
  path.join(__dirname, "..", "keys", "private.pem"),
  "utf8"
);

// ====== Cookie helpers ======
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

// ====== Intentos fallidos (memoria) ======
// Nota: en producción lo ideal es Redis, pero esto sirve perfecto para ahora.
const failStore = new Map();
// key -> { count, firstAt }
function keyFor(ip, email) {
  return `${ip || "unknown"}::${String(email || "").toLowerCase()}`;
}
function getFailState(key) {
  const now = Date.now();
  const s = failStore.get(key);
  if (!s) return { count: 0, firstAt: now };

  if (now - s.firstAt > WINDOW_MS) {
    // expiró ventana
    failStore.delete(key);
    return { count: 0, firstAt: now };
  }
  return s;
}
function incFail(key) {
  const now = Date.now();
  const s = getFailState(key);
  const next = { count: (s.count || 0) + 1, firstAt: s.firstAt || now };
  failStore.set(key, next);
  return next;
}
function resetFail(key) {
  failStore.delete(key);
}

// ====== Turnstile verify ======
async function verifyTurnstile(captchaToken) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[AUTH] Falta TURNSTILE_SECRET_KEY en backend/.env");
    return false;
  }
  try {
    const body = new URLSearchParams({
      secret,
      response: captchaToken,
    }).toString();

    const resp = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 7000 }
    );

    return !!resp.data?.success;
  } catch (err) {
    console.error("[AUTH] Error verificando Turnstile:", err?.message || err);
    return false;
  }
}

// ====== Controllers ======

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const captchaToken = String(req.body?.captchaToken || "").trim();

    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip;

    const k = keyFor(ip, email);
    const state = getFailState(k);
    const requireCaptcha = state.count >= MAX_FAILS;

    // Mensaje genérico SIEMPRE
    const deny = (captchaRequiredFlag) =>
      res.status(401).json({
        message: GENERIC_ERROR,
        requireCaptcha: !!captchaRequiredFlag,
      });

    // Si ya requiere captcha, validarlo SIEMPRE
    if (requireCaptcha) {
      if (!captchaToken) return deny(true);
      const ok = await verifyTurnstile(captchaToken);
      if (!ok) return deny(true);
    }

    if (!email || !password) {
      incFail(k);
      return deny(getFailState(k).count >= MAX_FAILS);
    }

    const user = await User.findOne({ email });
    if (!user) {
      incFail(k);
      return deny(getFailState(k).count >= MAX_FAILS);
    }

    // Bloqueo institucional (genérico)
    if (user.activo === false) {
      incFail(k);
      return deny(getFailState(k).count >= MAX_FAILS);
    }

    if (!user.passwordHash) {
      incFail(k);
      return deny(getFailState(k).count >= MAX_FAILS);
    }

    const okPass = await bcrypt.compare(password, user.passwordHash);
    if (!okPass) {
      incFail(k);
      return deny(getFailState(k).count >= MAX_FAILS);
    }

    // ✅ Éxito: resetear contador
    resetFail(k);

    const payload = {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: "RS256",
      expiresIn: "8h",
    });

    setAuthCookie(res, token);
    return res.json({ message: "Login correcto" });
  } catch (err) {
    console.error("[AUTH LOGIN]", err);
    return res.status(500).json({ message: GENERIC_ERROR });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    return res.json({ message: "Logout correcto" });
  } catch (err) {
    console.error("[AUTH LOGOUT]", err);
    return res.status(500).json({ message: GENERIC_ERROR });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "No autenticado" });
    return res.json({ user: req.user });
  } catch (err) {
    console.error("[AUTH ME]", err);
    return res.status(500).json({ message: GENERIC_ERROR });
  }
};
