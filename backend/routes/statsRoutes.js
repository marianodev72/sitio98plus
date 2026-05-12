const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const {
  getResumenStats,
  getFormularioStats,
  getStatsBarrios,
  getStatsPorBarrio,
} = require("../controllers/statsController");

router.get("/resumen", authRequired, getResumenStats);
router.get("/barrios", authRequired, getStatsBarrios);
router.get("/formularios", authRequired, getFormularioStats);
router.get("/barrio/:barrio", authRequired, getStatsPorBarrio);

router.use((req, res) => {
  return res.status(404).json({
    message: "No es posible procesar su solicitud, contacte al Administrador",
  });
});

module.exports = router;
