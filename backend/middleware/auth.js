// backend/middleware/auth.js
/**
 * AUTORIDAD OFICIAL DE AUTENTICACIÓN
 * ----------------------------------
 * Este archivo define la política JWT/cookie vigente del sistema.
 *
 * Fuente de verdad operativa:
 * - firma y verificación de JWT
 * - cookie de sesión
 * - authRequired
 * - exports oficiales consumibles por compatibilidad
 *
 * No duplicar esta lógica en otros módulos.
 * Si se requieren mejoras, deben sumarse aquí sin degradar el hardening vigente.
 */
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { User } = require("../models/user");
const { requireRole } = require("./authz");

const ACTIVE_KID = "key-actual";

function readKeySafe(p) {
  try {
    if (p && fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  } catch (_) {}
  return null;
}

function readPemFromEnv(varName) {
  const raw = process.env[varName];
  if (!raw) return null;
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

const PRIVATE_KEY =
  readPemFromEnv("JWT_PRIVATE_KEY") ||
  PRIVATE_CANDIDATES.map(readKeySafe).find(Boolean);
const PUBLIC_KEY =
  readPemFromEnv("JWT_PUBLIC_KEY") ||
  PUBLIC_CANDIDATES.map(readKeySafe).find(Boolean);

const KEYRING_PUBLIC = {
  [ACTIVE_KID]: PUBLIC_KEY,
};

if (PRIVATE_KEY && PUBLIC_KEY) console.log("[auth] Claves JWT cargadas");
else
  console.warn(
    "[auth] ⚠️ No se pudieron cargar las claves JWT (private/public)."
  );

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";

function getSessionMaxMinutes() {
  const raw = process.env.SESSION_MAX_MINUTES;
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
}

function signToken(user) {
  if (!PRIVATE_KEY) throw new Error("JWT private key no cargada.");

  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  const tokenVersion = typeof user?.tokenVersion === "number" ? user.tokenVersion : 0;

  // ✅ A5 Minimización: NO incluir PII en el JWT
  // Solo: id, role, permisos, tokenVersion (control de sesión)
  const payload = {
    user: {
      _id: String(user._id),
      role: user.role,
      permisos,
      tokenVersion,
    },
  };

  return jwt.sign(payload, PRIVATE_KEY, {
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

function getCookieConfig() {
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const isProd = nodeEnv === "production";

  const sameSiteEnv = String(
    process.env.AUTH_COOKIE_SAMESITE || (isProd ? "strict" : "lax")
  ).toLowerCase();

  const secureEnvRaw = process.env.AUTH_COOKIE_SECURE;
  const secureEnv =
    secureEnvRaw === undefined || secureEnvRaw === null || secureEnvRaw === ""
      ? isProd
      : String(secureEnvRaw).toLowerCase() === "true";

  let sameSite;
  if (sameSiteEnv === "none") sameSite = "none";
  else if (sameSiteEnv === "strict") sameSite = "strict";
  else sameSite = "lax";

  if (sameSite === "none" && !secureEnv) {
    console.warn("[auth] ⚠️ SameSite=None sin Secure: forzando Secure=true.");
    return { secure: true, sameSite: "none" };
  }

  return { secure: secureEnv, sameSite };
}

function setAuthCookie(res, token) {
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

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure,
    sameSite,
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

function normalizeUserFromPayload(payload) {
  if (payload?.user?._id) return payload.user;
  if (payload?._id && payload?.role) return payload;
  if (payload?.user?.user?._id) return payload.user.user;
  return null;
}

async function authRequired(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "No autenticado" });

    const payload = verifyToken(token);
    const rawUser = normalizeUserFromPayload(payload);

    if (!rawUser?._id) return res.status(401).json({ message: "No autenticado" });

    // ✅ Cargar desde DB lo necesario para estado + autorización + territorial (sin PII sensible)
    const dbUser = await User.findById(rawUser._id).select(
      "_id role permisos activo bloqueado archivado tokenVersion barrioAsignado viviendaAsignada alojamientoAsignado"
    );

    if (!dbUser) return res.status(401).json({ message: "No autenticado" });

    if (dbUser.activo === false || dbUser.bloqueado === true || dbUser.archivado === true) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const tokenVersionFromToken =
      typeof rawUser.tokenVersion === "number" ? rawUser.tokenVersion : 0;
    const tokenVersionFromDb =
      typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0;

    // ✅ Fail-closed: mismatch => 401
    if (tokenVersionFromToken !== tokenVersionFromDb) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // ✅ req.user con campos mínimos necesarios para el resto del pipeline (incluye tokenVersion)
    req.user = {
     _id: String(dbUser._id),
     id: String(dbUser._id), // alias compat
     role: dbUser.role,
     permisos: Array.isArray(dbUser.permisos) ? dbUser.permisos : [],
     activo: dbUser.activo,
     tokenVersion: typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0,
     barrioAsignado: dbUser.barrioAsignado || "",
     viviendaAsignada: dbUser.viviendaAsignada ?? null,
     alojamientoAsignado: dbUser.alojamientoAsignado ?? null,
   };

    return next();
  } catch (err) {
    console.error("[authRequired] error", err);
    return res.status(401).json({ message: "No autenticado" });
  }
}

module.exports = {
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  authRequired,
  requireRole,
};
