// errorHandler.js
const { AuditLog } = require("./models/AuditLog");

function safeErrorShape(err) {
  return {
    name: err?.name ? String(err.name) : "Error",
    message: err?.message ? String(err.message).slice(0, 500) : "Unknown error",
    code: err?.code ? String(err.code) : "",
  };
}

function persistFailAudit(req, err) {
  try {
    const ctx = req?._auditContext;
    if (!ctx || !ctx.action) return;

    // Evitar doble log FAIL si ya se registró
    if (req._auditFailLogged) return;
    req._auditFailLogged = true;

    const actor = req.user || req.admin || {};
    const requestId = req.requestId || ctx.requestId || "";
    const ip =
      (typeof req.headers?.["x-forwarded-for"] === "string" && req.headers["x-forwarded-for"].split(",")[0].trim()) ||
      req.ip ||
      "";

    const entityId = (req.params?.id && String(req.params.id)) || "";

    const event = {
      timestamp: new Date(),
      requestId,

      actor: {
        id: actor._id || null,
        email: actor.email || "",
        role: actor.role || actor.rol || "",
      },

      action: ctx.action,
      entity: { type: ctx.options?.targetType || "", id: entityId },

      result: "FAIL",
      meta: {
        params: req.params || {},
        query: req.query || {},
        // No body aquí para evitar fuga (si querés body, usá metaAllowlist en middleware/audit)
      },

      ip,
      userAgent: req.headers?.["user-agent"] || "",

      error: safeErrorShape(err),

      // Legacy
      actorId: actor._id || null,
      actorRole: actor.role || actor.rol || "",
      targetType: ctx.options?.targetType || "",
      targetId: entityId,
      metadata: { params: req.params || {}, query: req.query || {} },

      // Compat viejo
      usuario: actor._id || null,
      rolEnMomento: actor.role || actor.rol || "",
      accion: ctx.action,
      recursoTipo: ctx.options?.targetType || "UNKNOWN",
      recursoId: entityId,
      detalle: "",
    };

    setImmediate(() => {
      AuditLog.create(event).catch((e) => {
        console.error("[AUDIT] FAIL log error:", e?.message || e);
      });
    });
  } catch (e) {
    console.error("[AUDIT] persistFailAudit error:", e?.message || e);
  }
}

module.exports = function errorHandler(err, req, res, _next) {
  // Auditoría de fallos (sin romper respuesta)
  persistFailAudit(req, err);

  const status = err.status || err.statusCode || 500;
  const payload = {
    ok: false,
    requestId: req?.requestId || req?.headers?.["x-request-id"] || undefined,
    message: status === 500 ? "Error interno del servidor" : err.message,
  };

  // Solo dev: stack
  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
};
