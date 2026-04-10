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
const { generateSecret, verifyTotp, totp } = require("../security/mfaTotp");
const crypto = require("crypto");
const { AuditLog } = require("../models/AuditLog");

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
    tokenVersion: typeof user.tokenVersion === "number" ? user.tokenVersion : 0,
    mustChangePassword: user.mustChangePassword === true,
    mfaEnabled: user.mfaEnabled === true,
  };
}

function generateChallenge() {
  return crypto.randomBytes(32).toString("hex");
}

function hashChallenge(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const MAX_AUTH_FAILURES = 5;

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    ""
  );
}

function getUserAgent(req) {
  return String(req.headers["user-agent"] || "").slice(0, 500);
}

function hashIp(ip) {
  const value = String(ip || "").trim();
  if (!value) return "";
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function writeAuditEvent(req, user, action) {
  try {
    const requestId =
      String(req.requestId || "").trim() ||
      crypto.randomBytes(12).toString("hex");

    await AuditLog.create({
      actorId: user?._id || null,
      actorRole: user?.role || "SYSTEM",
      action,
      targetType: "AUTH",
      targetId: user?._id ? String(user._id) : null,
      requestId,

      method: req.method || "",
      path: req.originalUrl || "",

      statusCode: 0,
      durationMs: 0,

      ip: getClientIp(req),
      userAgent: getUserAgent(req),

      metadata: {
        source: "auth",
      },
    });
  } catch (err) {
    console.error("[auth.audit] Error:", err);
  }
}

async function registerFailedAuth(req, user, action) {
  try {
    if (user) {
      const current = Number(user.loginFallidos || 0);
      user.loginFallidos = current + 1;
      user.lastIp = getClientIp(req);
      user.lastUserAgent = getUserAgent(req);

      if (user.loginFallidos >= MAX_AUTH_FAILURES) {
        user.bloqueado = true;
      }

      await user.save();

      await writeAuditEvent(req, user, action);

      if (user.bloqueado === true) {
        await writeAuditEvent(req, user, "AUTH_LOCKED");
      }
    } else {
      await writeAuditEvent(req, null, action);
    }
  } catch (err) {
    console.error("[auth.registerFailedAuth] Error:", err);
  }
}

async function clearFailedAuth(req, user) {
  try {
    if (!user) return;
    user.loginFallidos = 0;
    user.lastIp = getClientIp(req);
    user.lastUserAgent = getUserAgent(req);
    await user.save();
  } catch (err) {
    console.error("[auth.clearFailedAuth] Error:", err);
  }
}

// ─────────────────────────────
// Controllers
// ─────────────────────────────
async function login(req, res) {
  try {
    if (!User) return res.status(500).json({ message: "Error interno" });

    const email = safeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const user = await User.findOne({ email }).select(
      "+passwordHash +tokenVersion +mfaEnabled +mustChangePassword +mfaPendingChallengeHash +mfaPendingChallengeExpiresAt +loginFallidos +bloqueado +ultimoLogin +lastIp +lastUserAgent"
    );

    if (!user) {
      await registerFailedAuth(req, null, "LOGIN_FAILED");
      return res.status(401).json({ message: "No autorizado" });
    }

    if (user.activo === false || user.bloqueado === true || user.archivado === true) {
      await writeAuditEvent(req, user, "LOGIN_FAILED");
      return res.status(401).json({ message: "No autorizado" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) {
      await registerFailedAuth(req, user, "LOGIN_FAILED");
      return res.status(401).json({ message: "No autorizado" });
    }

    await clearFailedAuth(req, user);

    if (user.mfaEnabled === true) {
      const mfaToken = generateChallenge();

      user.mfaPendingChallengeHash = hashChallenge(mfaToken);
      user.mfaPendingChallengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      user.lastIp = getClientIp(req);
      user.lastUserAgent = getUserAgent(req);
      await user.save();

      await writeAuditEvent(req, user, "MFA_REQUIRED");

      return res.json({
        ok: true,
        mfaRequired: true,
        mfaToken,
      });
    }

    user.ultimoLogin = new Date();
    user.lastIp = getClientIp(req);
    user.lastUserAgent = getUserAgent(req);
    await user.save();

    const payload = buildUserPayload(user);
    const token = signToken(payload);

    sendAuthCookie(res, token);

    await writeAuditEvent(req, user, "LOGIN_SUCCESS");

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

    const uid = String(req.user?._id || "");
    if (!uid) return res.status(401).json({ message: "No autorizado" });

    const dbUser = await User.findById(uid).select("+tokenVersion +mustChangePassword +mfaEnabled").lean();
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

    const dbUser = await User.findById(u._id).select("+tokenVersion +mustChangePassword +mfaEnabled").lean();
    if (!dbUser || dbUser.activo === false) return res.status(401).json({ message: "No autorizado" });

    const tokenVFromToken = typeof u.tokenVersion === "number" ? u.tokenVersion : 0;
    const tokenVFromDb = typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0;
    if (tokenVFromToken !== tokenVFromDb) return res.status(401).json({ message: "No autorizado" });

    const payload = buildUserPayload(dbUser);
    const newToken = signToken(payload);

    sendAuthCookie(res, newToken);

    return res.json({ user: payload });
  } catch (err) {
    console.error("[auth.refresh] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

async function verifyMfa(req, res) {
  try {
    const email = safeEmail(req.body?.email);
    const mfaToken = String(req.body?.mfaToken || "").trim();
    const code = String(req.body?.code || "").trim();

    if (!email || !mfaToken || !code) {
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    const user = await User.findOne({ email }).select(
      "+tokenVersion +mfaEnabled +mustChangePassword +mfaSecretEnc.iv +mfaSecretEnc.tag +mfaSecretEnc.data +mfaPendingChallengeHash +mfaPendingChallengeExpiresAt +loginFallidos +bloqueado +ultimoLogin +lastIp +lastUserAgent +mfaLastUsedAt"
    );

    if (!user || user.mfaEnabled !== true) {
      await registerFailedAuth(req, null, "MFA_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    if (user.activo === false || user.bloqueado === true || user.archivado === true) {
      await writeAuditEvent(req, user, "MFA_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    if (
      !user.mfaPendingChallengeHash ||
      !user.mfaPendingChallengeExpiresAt ||
      new Date(user.mfaPendingChallengeExpiresAt).getTime() < Date.now()
    ) {
      await registerFailedAuth(req, user, "MFA_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    if (hashChallenge(mfaToken) !== user.mfaPendingChallengeHash) {
      await registerFailedAuth(req, user, "MFA_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    const { decryptMfaSecret } = require("../security/mfaCrypto");

    let secret = "";
    try {
      secret = decryptMfaSecret(user.mfaSecretEnc);
    } catch (_) {
      secret = "";
    }

    if (!secret && user.mfaSecretEnc?.data) {
      secret = user.mfaSecretEnc.data;
    }

    const valid = verifyTotp(secret, code);

    if (!valid) {
      await registerFailedAuth(req, user, "MFA_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud MFA inválida." });
    }

    user.mfaPendingChallengeHash = "";
    user.mfaPendingChallengeExpiresAt = null;
    user.mfaLastUsedAt = new Date();
    user.ultimoLogin = new Date();
    user.lastIp = getClientIp(req);
    user.lastUserAgent = getUserAgent(req);
    await user.save();

    await clearFailedAuth(req, user);

    const payload = buildUserPayload(user);
    const token = signToken(payload);
    sendAuthCookie(res, token);

    await writeAuditEvent(req, user, "MFA_SUCCESS");

    return res.json({ ok: true, user: payload });
  } catch (err) {
    console.error("[auth.verifyMfa] Error:", err);
    return res.status(500).json({ ok: false, message: "No se pudo verificar MFA." });
  }
}

async function changePassword(req, res) {
  try {
    if (!User) return res.status(500).json({ message: "Error interno" });

    const uid = String(req.user?._id || "");
    if (!uid) return res.status(401).json({ message: "No autorizado" });

    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "La nueva contraseña y su confirmación no coinciden" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "La nueva contraseña debe ser distinta de la actual" });
    }

    const user = await User.findById(uid).select("+passwordHash +tokenVersion +mustChangePassword");
    if (!user || user.activo === false || user.bloqueado === true || user.archivado === true) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash || "");
    if (!ok) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });
    }

    await user.setPassword(newPassword);
    user.mustChangePassword = false;

    const currentTokenVersion = Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0;
    user.tokenVersion = currentTokenVersion + 1;

    await user.save();

    const payload = buildUserPayload(user);
    const token = signToken(payload);
    sendAuthCookie(res, token);

    return res.json({
      ok: true,
      message: "Contraseña actualizada correctamente",
      user: payload,
    });
  } catch (err) {
    console.error("[auth.changePassword] Error:", err);
    return res.status(500).json({ message: "No se ha podido procesar su solicitud." });
  }
}

async function registerPostulante(req, res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

const { encryptMfaSecret, decryptMfaSecret } = require("../security/mfaCrypto");

async function startMfaEnroll(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const user = await User.findById(userId).select("+mfaEnabled");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ message: "MFA ya está activo" });
    }

    const secret = generateSecret();
    const enc = encryptMfaSecret(secret);

    user.mfaPendingSecretEnc = enc;
    user.mfaPendingSecretExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    const issuer = encodeURIComponent("Alcaldia ZN98");
    const email = encodeURIComponent(user.email);

    const otpauth = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;

    return res.json({
      qrUrl,
      secret,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error iniciando MFA" });
  }
}

async function confirmMfaEnroll(req, res) {
  try {
    const userId = req.user?._id;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const user = await User.findById(userId).select(
      "+mfaPendingSecretEnc.iv +mfaPendingSecretEnc.tag +mfaPendingSecretEnc.data +mfaPendingSecretExpiresAt +mfaEnabled +mfaEnabledAt +mfaRecoveryCodesHash"
    );

    if (!user || !user.mfaPendingSecretEnc) {
      return res.status(400).json({ message: "No hay enrolamiento pendiente" });
    }

    if (user.mfaPendingSecretExpiresAt < new Date()) {
      return res.status(400).json({ message: "El código expiró" });
    }

    const secret = decryptMfaSecret(user.mfaPendingSecretEnc);
    const ok = verifyTotp(secret, code);

    if (!ok) {
      return res.status(400).json({ message: "Código inválido" });
    }

    const finalEnc = encryptMfaSecret(secret);

    const recoveryCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(-8).toUpperCase()
    );

    user.mfaRecoveryCodesHash = await Promise.all(
      recoveryCodes.map((c) => bcrypt.hash(c, 10))
    );

    user.mfaSecretEnc = finalEnc;
    user.mfaEnabled = true;
    user.mfaEnabledAt = new Date();

    user.mfaPendingSecretEnc = undefined;
    user.mfaPendingSecretExpiresAt = undefined;

    await user.save();

    return res.json({
      ok: true,
      recoveryCodes,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error confirmando MFA" });
  }
}

async function verifyMfaRecovery(req, res) {
  try {
    const email = safeEmail(req.body?.email);
    const mfaToken = String(req.body?.mfaToken || "").trim();
    const recoveryCode = String(req.body?.recoveryCode || "").trim();

    if (!email || !mfaToken || !recoveryCode) {
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    const user = await User.findOne({ email }).select(
      "+tokenVersion +mfaEnabled +mfaRecoveryCodesHash +mfaPendingChallengeHash +mfaPendingChallengeExpiresAt +loginFallidos +bloqueado +ultimoLogin +lastIp +lastUserAgent"
    );

    if (!user || user.mfaEnabled !== true) {
      await registerFailedAuth(req, null, "RECOVERY_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    if (user.activo === false || user.bloqueado === true || user.archivado === true) {
      await writeAuditEvent(req, user, "RECOVERY_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    if (
      !user.mfaPendingChallengeHash ||
      !user.mfaPendingChallengeExpiresAt ||
      new Date(user.mfaPendingChallengeExpiresAt).getTime() < Date.now()
    ) {
      await registerFailedAuth(req, user, "RECOVERY_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    if (hashChallenge(mfaToken) !== user.mfaPendingChallengeHash) {
      await registerFailedAuth(req, user, "RECOVERY_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    let validIndex = -1;

    for (let i = 0; i < user.mfaRecoveryCodesHash.length; i++) {
      const hash = user.mfaRecoveryCodesHash[i];
      const ok = await bcrypt.compare(recoveryCode, hash);
      if (ok) {
        validIndex = i;
        break;
      }
    }

    if (validIndex === -1) {
      await registerFailedAuth(req, user, "RECOVERY_FAILED");
      return res.status(400).json({ ok: false, message: "Solicitud inválida" });
    }

    user.mfaRecoveryCodesHash.splice(validIndex, 1);
    user.mfaPendingChallengeHash = "";
    user.mfaPendingChallengeExpiresAt = null;
    user.ultimoLogin = new Date();
    user.lastIp = getClientIp(req);
    user.lastUserAgent = getUserAgent(req);
    await user.save();

    await clearFailedAuth(req, user);

    const payload = buildUserPayload(user);
    const token = signToken(payload);
    sendAuthCookie(res, token);

    await writeAuditEvent(req, user, "RECOVERY_USED");

    return res.json({ ok: true, user: payload });
  } catch (err) {
    console.error("[auth.verifyMfaRecovery] Error:", err);
    return res.status(500).json({ ok: false, message: "Error recovery MFA" });
  }
}

async function regenerateRecoveryCodes(req, res) {
  try {
    const userId = String(req.user?._id || "");
    const code = String(req.body?.code || "").trim();

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autorizado" });
    }

    if (!code) {
      return res.status(400).json({ ok: false, message: "Debe ingresar el código MFA actual." });
    }

    const user = await User.findById(userId).select(
      "+mfaEnabled +mfaSecretEnc.iv +mfaSecretEnc.tag +mfaSecretEnc.data +mfaRecoveryCodesHash"
    );

    if (!user || user.mfaEnabled !== true) {
      return res.status(400).json({ ok: false, message: "MFA no está activo." });
    }

    let secret = "";
    try {
      secret = decryptMfaSecret(user.mfaSecretEnc);
    } catch (_) {
      secret = "";
    }

    if (!secret && user.mfaSecretEnc?.data) {
      secret = user.mfaSecretEnc.data;
    }

    const valid = verifyTotp(secret, code);
    if (!valid) {
      return res.status(400).json({ ok: false, message: "Código MFA inválido." });
    }

    const recoveryCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(-8).toUpperCase()
    );

    user.mfaRecoveryCodesHash = await Promise.all(
      recoveryCodes.map((c) => bcrypt.hash(c, 10))
    );

    await user.save();

    return res.json({
      ok: true,
      recoveryCodes,
    });
  } catch (err) {
    console.error("[auth.regenerateRecoveryCodes] Error:", err);
    return res.status(500).json({ ok: false, message: "No se pudieron regenerar los códigos." });
  }
}

module.exports = {
  login,
  logout,
  me,
  refresh,
  registerPostulante,
  verifyMfa,
  changePassword,
  startMfaEnroll,
  confirmMfaEnroll,
  verifyMfaRecovery,
  regenerateRecoveryCodes,
};