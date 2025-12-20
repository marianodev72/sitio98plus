// backend/routes/viviendaRoutes.js
const express = require("express");
const router = express.Router();

const viviendaController = require("../controllers/viviendaController");
const { authRequired } = require("../middleware/auth");

// IMPORTANTE: este es el middleware correcto que:
// - extrae token de cookie o Authorization Bearer
// - verifica JWT RS256
// - setea req.user normalizado
router.use(authRequired);

// PDF antes de rutas parametrizadas (buena práctica)
router.get("/pdf", viviendaController.generarPdf);

router.get("/", viviendaController.listar);
router.patch("/:id/estado", viviendaController.cambiarEstado);

module.exports = router;
