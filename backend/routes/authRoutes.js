// backend/routes/authRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const authController = require("../controllers/authController");
const registerPostulanteController = require("../controllers/registerPostulanteController");
const { authRequired } = require("../middleware/auth");

// 🔒 Rate limit ESPECÍFICO para registro
const registroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      message: "No es posible procesar el registro en este momento.",
    });
  },
});

// LOGIN / LOGOUT / ME
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authRequired, authController.me);

// REGISTRO POSTULANTE (PÚBLICO + HARDENING)
router.post(
  "/register-postulante",
  registroLimiter,
  registerPostulanteController.registrarPostulante
);

module.exports = router;
