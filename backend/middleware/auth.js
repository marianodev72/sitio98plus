// backend/middleware/auth.js
// Auth ZN98 (RSA) — estable y retrocompatible
// - JWT RS256 con private.pem/public.pem
// - Token por cookie (default: "token") o Authorization: Bearer <token>
// - Retrocompat: soporta payload {user:{...}} y payload directo {...}

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

function readKeySafe(p) {
  try {
    if (p && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch (_) {}
  return null;
}

const ROOT = path.join(__dirname, ".."); // backend/

const PRIVATE_CANDIDATES = [
  process.env.JWT_PRIVATE_KEY_PATH,
  path.join(ROOT, "private.pem"),
  path.join(ROOT, "keys", "private.pem"),
  path.join(ROOT, "config", "private.pem"),
].filter(Boolean);

const PUBLIC_CANDIDATES = [
  process.env.JWT_PUBLIC_KEY_PATH,
  path.join(ROOT, "public.pem"),
  path.join(ROOT, "keys", "public.pem"),
  path.join(ROOT, "config", "public.pem"),
].filter(Boolean);

const PRIVATE_KEY = PRIVATE_CANDIDATES.map(readKeySafe).find(Boolean);
const PUBLIC_KEY = PUBLIC_CANDIDATES.map(readKeySafe).find(Boolean);

if (PRIVATE_KEY && PUBLIC_KEY) console.log("[auth] Claves JWT cargadas");
else console.warn("[auth] ⚠️ No se pudieron cargar private.pem/public.pem");

function signToken(user) {
  if (!PRIVATE_KEY) throw new Error("JWT private key no cargada (private.pem).");

  // ✅ CONTRATO ÚNICO: guardamos SIEMPRE dentro de "user"
  const payload = {
    user: {
      _id: String(user._id),
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      dni: user.dni,
      matricula: user.matricula,
      role: user.role,
      activo: user.activo,
      barrioAsignado: user.barrioAsignado ?? null,
      viviendaAsignada: user.viviendaAsignada ?? null,
      alojamientoAsignado: user.alojamientoAsignado ?? null,
    },
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: "RS256", expiresIn });
}

function verifyToken(token) {
  if (!PUBLIC_KEY) throw new Error("JWT public key no cargada (public.pem).");
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
}

function setAuthCookie(res, token) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "token";
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "token";
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);

  const cookieName = process.env.AUTH_COOKIE_NAME || "token";
  if (req.cookies && req.cookies[cookieName]) return req.cookies[cookieName];

  return null;
}

// ✅ NORMALIZADOR: garantiza req.user con el objeto usuario (no el payload crudo)
function normalizeUserFromPayload(payload) {
  // caso actual
  if (payload && payload.user && payload.user._id) return payload.user;
  // caso viejo (si alguna vez firmaste directo con campos)
  if (payload && payload._id && payload.role) return payload;
  // caso rarísimo (payload.user.user)
  if (payload && payload.user && payload.user.user && payload.user.user._id) return payload.user.user;
  return null;
}

function authRequired(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "No autenticado" });

    const payload = verifyToken(token);
    const u = normalizeUserFromPayload(payload);

    if (!u) return res.status(401).json({ message: "No autenticado" });

    req.user = u;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "No autenticado" });
  }
}

function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase());
  return (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (!role) return res.status(403).json({ message: "No autorizado" });
    if (!allowed.includes(role)) return res.status(403).json({ message: "No autorizado" });
    return next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  authRequired,
  requireRole,
};
