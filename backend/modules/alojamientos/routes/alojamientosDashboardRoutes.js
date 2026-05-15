const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientoDashboardController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/resumen", controller.getResumen);

module.exports = router;
