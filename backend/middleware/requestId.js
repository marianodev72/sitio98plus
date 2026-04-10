// backend/middleware/requestId.js
const crypto = require("crypto");

function buildRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString("hex");
}

function requestIdMiddleware(req, res, next) {
  try {
    const incoming =
      String(req.headers["x-request-id"] || "").trim() ||
      String(req.headers["x-correlation-id"] || "").trim();

    const requestId = incoming || buildRequestId();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    return next();
  } catch (err) {
    const fallbackId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    req.requestId = fallbackId;
    res.setHeader("x-request-id", fallbackId);
    return next();
  }
}

module.exports = {
  requestIdMiddleware,
};