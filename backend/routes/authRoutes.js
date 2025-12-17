// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

// LOGIN
router.post("/login", authController.login);

// LOGOUT
router.post("/logout", authController.logout);

// ✅ ME (contrato frontend)
router.get("/me", authRequired, authController.me);

module.exports = router;
