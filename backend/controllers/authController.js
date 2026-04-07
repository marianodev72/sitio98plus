// backend/controllers/authController.js

/**
 * FLUJO OFICIAL DE LOGIN / LOGOUT / REFRESH / ME
 * ----------------------------------------------
 * Este controller implementa el flujo institucional endurecido de autenticación.
 *
 * No reemplazar esta lógica por utilidades paralelas.
 * Cualquier mejora futura (ej. MFA) debe integrarse sobre este flujo.
 */
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ✅ path correcto (controllers -> ./models)
let User = null;
try {
  ({ User } = require("../models/user"));
} catch {
  ({ User } = require("../models/user"));
}

// ─────────────────────────────
// Helpers
// ─────────────────────────────
const isProd = process.env.NODE_ENV === "production";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function safeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function parseBool(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normalizeSameSite(v, fallback = "lax") {
  const s = String(v || fallback).trim().toLowerCase();
  if (s === "lax") return "lax";
  if (s === "strict") return "strict";
  if (s === "none") return "none";
  return fallback;
}

// ─────────────────────────────
// JWT KEYS (RS256)
// ─────────────────────────────
let PUBLIC_KEY = null;
let PRIVATE_KEY = null;

const ACTIVE_KID = process.env.JWT_ACTIVE_KID || "key-actual";

function readKeySafe(p) {
  try {
    if (p && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch (_) {}
  return null;
}

// Permite inyectar PEM por env (por ejemplo desde Secret Manager)
function readPemFromEnv(varName) {
  const raw = process.env[varName];
  if (!raw) return null;
  // Soporta PEM con \\n escapados
  if (raw.includes("\\n")) return raw.replace(/\\n/g, "\n");
  return raw;
}

const ROOT = path.join(__dirname, "..");

const PRIVATE_CANDIDATES = [
  process.env.JWT_PRIVATE_KEY_PATH,
  path.join(ROOT, "private.pem"),
  path.join(ROOT, "keys", "private.pem"),
  path.join(ROOT, "config", "private.pem"),
  path.join(ROOT, "security", "jwtRS256.key"),
].filter(Boolean);

const PUBLIC_CANDIDATES = [
  process.env.JWT_PUBLIC_KEY_PATH,
  path.join(ROOT, "public.pem"),
  path.join(ROOT, "keys", "public.pem"),
  path.join(ROOT, "config", "public.pem"),
  path.join(ROOT, "security", "jwtRS256.key.pub"),
].filter(Boolean);

PRIVATE_KEY =
  readPemFromEnv("JWT_PRIVATE_KEY") || PRIVATE_CANDIDATES.map(readKeySafe).find(Boolean);
PUBLIC_KEY =
  readPemFromEnv("JWT_PUBLIC_KEY") || PUBLIC_CANDIDATES.map(readKeySafe).find(Boolean);

const KEYRING_PUBLIC = {
  [ACTIVE_KID]: PUBLIC_KEY,
};

if (PRIVATE_KEY && PUBLIC_KEY) console.log("[auth] Claves JWT cargadas");
else console.warn("[auth] ⚠️ No se pudieron cargar las claves JWT (private/public).");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";

function getCookieConfig() {
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const prod = nodeEnv === "production";

  const sameSiteEnv = normalizeSameSite(process.env.AUTH_COOKIE_SAMESITE || (prod ? "strict" : "lax"));
  const secureEnvRaw = process.env.AUTH_COOKIE_SECURE;
  const secureEnv =
    secureEnvRaw === undefined || secureEnvRaw === null || secureEnvRaw === ""
      ? prod
      : String(secureEnvRaw).toLowerCase() === "true";

  let sameSite = sameSiteEnv;
  let secure = secureEnv;

  if (sameSite === "none" && !secure) {
    console.warn("[auth] ⚠️ SameSite=None sin Secure: forzando Secure=true.");
    secure = true;
  }

  return { secure, sameSite };
}

function getSessionMaxMinutes() {
  const raw = process.env.SESSION_MAX_MINUTES;
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
}

function sendAuthCookie(res, token) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "token";
  const { secure, sameSite } = getCookieConfig();
  const sessionMinutes = getSessionMaxMinutes();

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: sessionMinutes * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "token";
  const { secure, sameSite } = getCookieConfig();
  res.clearCookie(cookieName, { httpOnly: true, secure, sameSite, path: "/" });
}

function signToken(payload) {
  if (!PRIVATE_KEY) throw new Error("JWT private key no cargada.");
  return jwt.sign({ user: payload }, PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: JWT_EXPIRES_IN,
    header: { kid: ACTIVE_KID },
  });
}

function verifyToken(token) {
  if (!PUBLIC_KEY) throw new Error("JWT public key no cargada.");

  let selectedPublicKey = PUBLIC_KEY;
  try {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    if (kid) {
      const key = KEYRING_PUBLIC[kid];
      if (!key) throw new Error("kid desconocido");
      selectedPublicKey = key;
    }
  } catch (_) {
    throw new Error("JWT inválido");
  }

  return jwt.verify(token, selectedPublicKey, { algorithms: ["RS256"] });
}

function buildUserPayload(user) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];

  return {
    _id: String(user._id),
    role: user.role,
    permisos,
    activo: user.activo !== false,
    barrioAsignado: user.barrioAsignado || "",
    viviendaAsignada: user.viviendaAsignada ?? null,
    alojamientoAsignado: user.alojamientoAsignado ?? null,

    // ✅ CRÍTICO: NO usar fallback tipo "|| 0"
    tokenVersion: (typeof user.tokenVersion === "number" ? user.tokenVersion : 0),
  };
}

// ─────────────────────────────
// Controllers
// ─────────────────────────────
async function login(req, res) {
  try {
    if (!User) return res.status(500).json({ message: "Error interno" });

    const email = safeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) return res.status(401).json({ message: "No autorizado" });

    // ✅ Importante: tokenVersion puede estar select:false => traer explícitamente
    const user = await User.findOne({ email }).select("+passwordHash +tokenVersion").lean();
    if (!user) return res.status(401).json({ message: "No autorizado" });

    if (user.activo === false || user.bloqueado === true || user.archivado === true) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ message: "No autorizado" });

    const payload = buildUserPayload(user);
    const token = signToken(payload);

    sendAuthCookie(res, token);

    return res.json({ user: payload });
  } catch (err) {
    console.error("[auth.login] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

async function logout(req, res) {
  try {
    clearAuthCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[auth.logout] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

async function me(req, res) {
  try {
    if (!User) return res.status(500).json({ message: "Error interno" });

    // ✅ Validación uniforme: este endpoint debe estar montado bajo authRequired.
    // Si llegamos acá, la sesión ya fue validada (firma + estado + tokenVersion).
    const uid = String(req.user?._id || "");
    if (!uid) return res.status(401).json({ message: "No autorizado" });

    // Cargamos desde DB para devolver el payload completo requerido por el frontend.
    // Importante: tokenVersion puede estar select:false en el schema.
    const dbUser = await User.findById(uid).select("+tokenVersion").lean();
    if (!dbUser || dbUser.activo === false) return res.status(401).json({ message: "No autorizado" });

    return res.json({ user: buildUserPayload(dbUser) });
  } catch (err) {
    console.error("[auth.me] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

async function refresh(req, res) {
  try {
    if (!User) return res.status(500).json({ message: "Error interno" });

    const cookieName = process.env.AUTH_COOKIE_NAME || "token";
    const token = req.cookies?.[cookieName] || "";
    if (!token) return res.status(401).json({ message: "No autorizado" });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ message: "No autorizado" });
    }

    const u = decoded?.user;
    if (!u?._id) return res.status(401).json({ message: "No autorizado" });

    // ✅ tokenVersion puede estar select:false => traer explícitamente
    const dbUser = await User.findById(u._id).select("+tokenVersion").lean();
    if (!dbUser || dbUser.activo === false) return res.status(401).json({ message: "No autorizado" });

    // ✅ Fail-closed: revocación por tokenVersion (mismo criterio que authRequired)
    const tokenVFromToken = typeof u.tokenVersion === "number" ? u.tokenVersion : 0;
    const tokenVFromDb = typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0;
    if (tokenVFromToken !== tokenVFromDb) return res.status(401).json({ message: "No autorizado" });

    const payload = buildUserPayload(dbUser);
    const newToken = signToken(payload);

    // ✅ renueva cookie
    sendAuthCookie(res, newToken);

    return res.json({ user: payload });
  } catch (err) {
    console.error("[auth.refresh] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

// Si ya lo tenías, dejalo (lo llamás desde authRoutes.js)
async function registerPostulante(req, res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

module.exports = { login, logout, me, refresh, registerPostulante };
