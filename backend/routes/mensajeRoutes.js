// backend/routes/mensajeRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");

const {
  getAgenda,
  getEntrada,
  getEnviados,
  getMensaje,
  marcarLeido,
  enviarMensaje,
} = require("../controllers/mensajeController");

router.use(authRequired, refreshUserPrivileges);

// agenda institucional (territorial o completa según rol)
router.get("/agenda", getAgenda);

// bandejas
router.get("/entrada", getEntrada);
router.get("/enviados", getEnviados);

// detalle + leído
router.get("/:id", getMensaje);
router.patch("/:id/leido", marcarLeido);

// enviar
router.post("/", enviarMensaje);

module.exports = router;
