const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/documentos/alojamientosDocumentosController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/", controller.listar);
router.get("/:id", controller.obtenerPorId);

module.exports = router;
