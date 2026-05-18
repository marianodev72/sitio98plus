const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientosMiController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/ocupacion-actual", controller.ocupacionActual);

module.exports = router;
