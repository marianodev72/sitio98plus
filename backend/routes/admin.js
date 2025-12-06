// backend/routes/admin.js

const express = require("express");
const router = express.Router();

// El control de authRequired + requireRole(ADMIN) 
// YA está aplicado en server.js, no se repite acá.

const userController = require("../controllers/userController");

// ---------------------------------------------------------------------------
//  GET /api/admin/postulantes
// ---------------------------------------------------------------------------
router.get("/postulantes", async (req, res) => {
  try {
    console.log("[ADMIN] GET /postulantes OK");
    res.json([]); // más adelante devolvemos datos reales
  } catch (err) {
    console.error("[ADMIN] Error:", err);
    res.status(500).json({ ok: false, msg: "Error obteniendo postulantes" });
  }
});

// ---------------------------------------------------------------------------
//  GET /api/admin/users
// ---------------------------------------------------------------------------
router.get("/users", async (req, res) => {
  try {
    console.log("[ADMIN] GET /users OK");
    const data = await userController.getUsersRaw();
    res.json(data);
  } catch (err) {
    console.error("[ADMIN] Error /users:", err);
    res.status(500).json({ ok: false, msg: "Error obteniendo usuarios" });
  }
});

// ---------------------------------------------------------------------------
//  GET /api/admin/viviendas
// ---------------------------------------------------------------------------
router.get("/viviendas", async (req, res) => {
  try {
    console.log("[ADMIN] GET /viviendas OK");
    res.json([]); // más adelante lo conectamos a Mongo
  } catch (err) {
    console.error("[ADMIN] Error /viviendas:", err);
    res.status(500).json({ ok: false, msg: "Error obteniendo viviendas" });
  }
});

module.exports = router;
