// backend/routes/mensajeRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const uploadMensajes = require("../middleware/uploadMensajes");
const mensajeController = require("../controllers/mensajeController");

// Enviar mensaje con adjuntos
router.post(
  "/",
  authRequired,
  uploadMensajes,
  mensajeController.enviarMensaje
);

// Bandeja de entrada
router.get("/entrada", authRequired, mensajeController.listarEntrada);

// Enviados
router.get("/enviados", authRequired, mensajeController.listarEnviados);

// Obtener mensaje
router.get("/:id", authRequired, mensajeController.obtenerMensaje);

// Marcar leído
router.patch("/:id/leido", authRequired, mensajeController.marcarComoLeido);

// Auditoría
router.get("/", authRequired, mensajeController.listarTodos);

module.exports = router;
