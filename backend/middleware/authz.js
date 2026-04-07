"use strict";

function normalizeRolesInput(roles) {
  const flat = Array.isArray(roles) ? roles.flat(Infinity) : [roles];
  return flat
    .map((r) => String(r || "").toUpperCase().trim())
    .filter(Boolean);
}

function requireRole(...roles) {
  const allowed = normalizeRolesInput(roles);

  return (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase().trim();

    if (!role) {
      return res.status(403).json({ message: "No autorizado" });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    return next();
  };
}

module.exports = {
  requireRole,
};