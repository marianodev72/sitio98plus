// backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

// 🔒 sanity check inmediato (evita server caído por undefined)
if (typeof auth.authRequired !== "function") {
  throw new Error("[adminRoutes] authRequired no es función. Revisa ../middleware/auth exports.");
}
if (typeof auth.requireRole !== "function") {
  throw new Error("[adminRoutes] requireRole no es función. Revisa ../middleware/auth exports.");
}

const { authRequired, requireRole } = auth;

// ✅ endpoint admin/admin_general
router.get(
  "/ping",
  authRequired,
  requireRole("ADMIN", "ADMIN_GENERAL"),
  (req, res) => {
    res.json({ ok: true, role: req.user?.role, userId: req.user?._id });
  }
);

module.exports = router;
