const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/documentos/alojamientosDocumentosController");
const anexo21Controller = require("../controllers/documentos/anexo21Controller");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.post("/anexo-21", anexo21Controller.crear);
router.patch("/anexo-21/:id", anexo21Controller.actualizar);
router.post("/anexo-21/:id/enviar", anexo21Controller.enviar);

router.get("/", controller.listar);
router.get("/:id", controller.obtenerPorId);

module.exports = router;
