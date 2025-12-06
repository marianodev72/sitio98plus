// backend/routes/pedidosTrabajo.js
// NOTA: módulo legacy. Actualmente NO está montado en server.js.
// Si en el futuro se decide usar este flujo en lugar de Anexo 11,
// se deberá importar y montar explícitamente en backend/server.js.

const express = require("express");
const router = express.Router();

const {
  listarMisPedidos,
  crearPedido,
  editarPedido,
  enviarPedido,
} = require("../controllers/pedidosTrabajoController");

// Usamos el middleware de autenticación estándar RS256
const auth = require("../middleware/auth");

// Protege todas las rutas de este router
router.use(auth);

// LISTAR MIS PEDIDOS
router.get("/mios", listarMisPedidos);

// CREAR BORRADOR
router.post("/", crearPedido);

// EDITAR BORRADOR
router.put("/:id", editarPedido);

// ENVIAR AL INSPECTOR
router.post("/:id/enviar", enviarPedido);

module.exports = router;
