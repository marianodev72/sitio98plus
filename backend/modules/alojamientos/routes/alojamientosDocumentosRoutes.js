const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/documentos/alojamientosDocumentosController");
const anexo21Controller = require("../controllers/documentos/anexo21Controller");
const anexo22Controller = require("../controllers/documentos/anexo22Controller");
const anexo23Controller = require("../controllers/documentos/anexo23Controller");
const anexo24Controller = require("../controllers/documentos/anexo24Controller");
const anexo25Controller = require("../controllers/documentos/anexo25Controller");
const anexo26Controller = require("../controllers/documentos/anexo26Controller");
const anexo28Controller = require("../controllers/documentos/anexo28Controller");
const {
  uploadAlojamientoDocumento,
} = require("../middleware/alojamientoDocumentoUpload");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.post("/anexo-21", anexo21Controller.crear);
router.patch("/anexo-21/:id", anexo21Controller.actualizar);
router.post("/anexo-21/:id/enviar", anexo21Controller.enviar);
router.post("/anexo-21/:id/anular", anexo21Controller.anular);
router.patch("/anexo-23/:id", anexo23Controller.actualizarDatos);
router.post("/anexo-23/:id/enviar", anexo23Controller.enviar);
router.patch("/anexo-24/:id/revision-inspector", anexo24Controller.revisarAnexo24);
router.patch("/anexo-25/:id", anexo25Controller.actualizarDatos);
router.patch("/anexo-26/:id", anexo26Controller.actualizarDatos);
router.post("/anexo-28", anexo28Controller.crearPorInspector);
router.patch("/anexo-28/:id/inspector", anexo28Controller.revisarPorInspector);
router.post("/:id/conformidad-alojado-23", anexo23Controller.conformidadAlojado);
router.post("/:id/cerrar-anexo-23", anexo23Controller.cerrarAnexo23);
router.post("/:id/cerrar-anexo-24", anexo24Controller.cerrarAnexo24);
router.post("/:id/cerrar-anexo-25", anexo25Controller.cerrarAnexo25);
router.post("/:id/cerrar-anexo-26", anexo26Controller.cerrarAnexo26);
router.post("/:id/cerrar-anexo-28", anexo28Controller.cerrarAnexo28);
router.post("/:id/devolver-anexo-28", anexo28Controller.devolverAnexo28);
router.post(
  "/anexo-21/:id/adjuntos/:campo",
  uploadAlojamientoDocumento,
  anexo21Controller.subirAdjunto
);
router.delete("/anexo-21/:id/adjuntos/:campo", anexo21Controller.eliminarAdjunto);
router.get("/:id/adjuntos/:campo", anexo21Controller.descargarAdjunto);
router.get("/:id/pdf", anexo22Controller.descargarPdf);
router.post("/:id/generar-anexo-22", anexo22Controller.generarDesdeAnexo21);
router.post("/:id/generar-anexo-23", anexo23Controller.generarDesdeAnexo22);
router.post("/:id/generar-anexo-25", anexo25Controller.generarDesdeAnexo23);
router.post("/:id/generar-anexo-26", anexo26Controller.generarDesdeAnexo25);
router.post("/:id/conformidad-postulante", anexo22Controller.conformidadPostulante);
router.post("/:id/cerrar-anexo-22", anexo22Controller.cerrarAnexo22);

router.get("/", controller.listar);
router.get("/:id", controller.obtenerPorId);

module.exports = router;
