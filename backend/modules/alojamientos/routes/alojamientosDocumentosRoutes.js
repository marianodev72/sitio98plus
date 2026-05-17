const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/documentos/alojamientosDocumentosController");
const anexo21Controller = require("../controllers/documentos/anexo21Controller");
const anexo22Controller = require("../controllers/documentos/anexo22Controller");
const {
  uploadAlojamientoDocumento,
} = require("../middleware/alojamientoDocumentoUpload");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.post("/anexo-21", anexo21Controller.crear);
router.patch("/anexo-21/:id", anexo21Controller.actualizar);
router.post("/anexo-21/:id/enviar", anexo21Controller.enviar);
router.post(
  "/anexo-21/:id/adjuntos/:campo",
  uploadAlojamientoDocumento,
  anexo21Controller.subirAdjunto
);
router.delete("/anexo-21/:id/adjuntos/:campo", anexo21Controller.eliminarAdjunto);
router.get("/:id/adjuntos/:campo", anexo21Controller.descargarAdjunto);
router.post("/:id/generar-anexo-22", anexo22Controller.generarDesdeAnexo21);

router.get("/", controller.listar);
router.get("/:id", controller.obtenerPorId);

module.exports = router;
