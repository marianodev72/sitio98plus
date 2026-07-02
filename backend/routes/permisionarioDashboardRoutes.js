const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const {
  getPermisionarioDashboardResumen,
} = require("../controllers/permisionarioDashboardController");

router.use(authRequired, refreshUserPrivileges);

router.get("/resumen", getPermisionarioDashboardResumen);

module.exports = router;
