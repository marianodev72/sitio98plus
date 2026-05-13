// backend/routes/dashboardRoutes.js

const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { getAdminGeneralDashboard } = require("../controllers/dashboardController");

router.get("/admin-general", authRequired, refreshUserPrivileges, getAdminGeneralDashboard);

router.use((_req, res) => {
  return res.status(404).json({
    message: "No es posible procesar su solicitud, contacte al Administrador",
  });
});

module.exports = router;
