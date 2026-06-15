const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientosTransitoriosBrController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/", controller.listar);
router.post("/", controller.crear);
router.get("/:id", controller.obtenerPorId);
router.patch("/:id", controller.actualizar);
router.post("/:id/finalizar", controller.finalizar);

module.exports = router;
