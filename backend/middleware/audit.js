// backend/middleware/audit.js
const { AuditLog } = require("../models/AuditLog");

/**
 * Helpers para controllers (opcional)
 * - req.audit.setTarget(type, id)
 * - req.audit.addMeta(obj)
 */
function attachAuditHelpers(req, _res, next) {
  req.audit = req.audit || {};
  req.audit._targetType = req.audit._targetType || "";
  req.audit._targetId = req.audit._targetId || "";
  req.audit._metaExtra = req.audit._metaExtra || {};

  req.audit.setTarget = (targetType, targetId) => {
    req.audit._targetType = String(targetType || "");
    req.audit._targetId = String(targetId || "");
  };

  req.audit.addMeta = (obj) => {
    if (!obj || typeof obj !== "object") return;
    req.audit._metaExtra = { ...req.audit._metaExtra, ...obj };
  };

  next();
}

// -------------------------
// Utilidades
// -------------------------

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "nuevapassword",
  "temppassword",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "set-cookie",
  "dni",
  "matricula",
  "mr",
]);

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeString(v, max = 300) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function redactValue(key, value) {
  const k = String(key || "").toLowerCase();
  if (SENSITIVE_KEYS.has(k)) return "[REDACTED]";
  if (typeof value === "string" && value.length > 80) return "[REDACTED]";
  if (typeof value === "string") return safeString(value, 300);
  return value;
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 3) return "[TRUNCATED]";
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj.slice(0, 30).map((x) => sanitizeObject(x, depth + 1));
  }

  if (!isPlainObject(obj)) {
    if (typeof obj === "string") return safeString(obj, 300);
    return obj;
  }

  const out = {};
  const keys = Object.keys(obj).slice(0, 60);
  for (const key of keys) {
    const val = obj[key];
    if (val && (Array.isArray(val) || isPlainObject(val))) {
      out[key] = sanitizeObject(val, depth + 1);
    } else {
      out[key] = redactValue(key, val);
    }
  }
  return out;
}

function getByPath(root, dotted) {
  const parts = String(dotted || "").split(".").filter(Boolean);
  let cur = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function pickAllowlist(req, allowlist) {
  const base = {};
  if (req?.params?.id) base["params.id"] = req.params.id;

  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    return {
      ...base,
      query: sanitizeObject(req.query || {}),
      params: sanitizeObject(req.params || {}),
    };
  }

  const picked = { ...base };
  for (const path of allowlist.slice(0, 40)) {
    const val = getByPath(req, path);
    if (typeof val === "undefined") continue;
    picked[path] = sanitizeObject(val);
  }
  return picked;
}

function getRequestId(req) {
  const hdr = req?.headers?.["x-request-id"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  if (typeof req?.requestId === "string" && req.requestId.trim()) return req.requestId.trim();
  return "";
}

// -------------------------
// Middleware principal
// -------------------------

/**
 * audit("ADMIN_RESET_PASSWORD", { targetType: "User", metaAllowlist: ["params.id"] })
 */
function audit(action, options = {}) {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      (async () => {
        try {
          if (res.statusCode >= 400) return;

          const actor = req.user || {};
          const durationMs = Date.now() - start;

          const targetType = String(req.audit?._targetType || options.targetType || "");
          const targetId = String(req.audit?._targetId || options.targetId || req.params?.id || "");

          const metaPicked = pickAllowlist(req, options.metaAllowlist);
          const metaExtra =
            req.audit?._metaExtra && typeof req.audit._metaExtra === "object"
              ? sanitizeObject(req.audit._metaExtra)
              : {};

          await AuditLog.create({
            actorId: actor._id || null,
            actorRole: actor.role || "",

            action: String(action),

            targetType,
            targetId,

            // ✅ CANÓNICO (si existe)
            requestId: getRequestId(req),

            method: String(req.method || ""),
            path: String(req.originalUrl || req.url || ""),

            statusCode: res.statusCode,
            durationMs,

            ip: String(req.ip || ""),
            userAgent: safeString(req.headers["user-agent"] || "", 300),

            metadata: {
              ...sanitizeObject(metaPicked),
              ...metaExtra,
            },
          });
        } catch (err) {
          console.error("[AUDIT] Error:", err?.message || err);
        }
      })();
    });

    next();
  };
}

module.exports = { audit, attachAuditHelpers };
