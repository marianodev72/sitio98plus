// backend/routes/anexo11.js
// Stub temporal para el módulo Anexo 11 (Pedido de trabajo).
// ❗ Este archivo NO implementa todavía la lógica real.
// Sólo garantiza que /api/anexo11 no rompa el servidor
// y devuelva un estado controlado mientras desarrollamos el módulo.

const express = require("express");
const router = express.Router();

// Aplica a cualquier método y cualquier subruta de /api/anexo11
router.all("*", (req, res) => {
  return res.status(503).json({
    ok: false,
    message: "El módulo Anexo 11 está en desarrollo.",
  });
});

module.exports = router;
