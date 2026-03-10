// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { verifyTurnstile } = require("../middleware/turnstile");
const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

// ✅ Registro postulante (nuevo controller real)
const registerPostulanteController = require("../controllers/registerPostulanteController");

const isProd = process.env.NODE_ENV === "production";
const hasTurnstile = !!(
  process.env.TURNSTILE_SECRET_KEY && String(process.env.TURNSTILE_SECRET_KEY).trim()
);

// En prod: si hay secret -> requerido. Si no hay secret -> NO requerido pero loguea warning.
const turnstileRequired = isProd ? hasTurnstile : false;

router.post("/login", verifyTurnstile({ required: turnstileRequired }), authController.login);

// ✅ Compatibilidad + endpoint institucional correcto
router.post(
  "/register",
  verifyTurnstile({ required: turnstileRequired }),
  registerPostulanteController.registerPostulante
);

router.post(
  "/register-postulante",
  verifyTurnstile({ required: turnstileRequired }),
  registerPostulanteController.registerPostulante
);

router.post("/logout", authController.logout);

// ✅ Uniformidad: /me bajo authRequired (mismo criterio de sesión que el resto)
router.get("/me", authRequired, authController.me);

router.post("/refresh", authController.refresh);

module.exports = router;
