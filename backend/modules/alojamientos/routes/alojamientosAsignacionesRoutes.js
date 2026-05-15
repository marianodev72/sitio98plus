const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientoAsignacionController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.post("/dry-run", controller.dryRun);

module.exports = router;
