const express = require("express");
const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const controller = require("../controllers/alertasController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/post-login/resumen", controller.getPostLoginResumen);

module.exports = router;
