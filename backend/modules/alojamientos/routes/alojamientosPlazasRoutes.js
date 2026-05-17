const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientoPlazaController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/elegibles-asignacion", controller.listarElegibles);

module.exports = router;
