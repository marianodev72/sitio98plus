const express = require("express");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientosMiController");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/ocupacion-actual", controller.ocupacionActual);
router.get("/ocupaciones", controller.listarOcupaciones);
router.get("/liquidaciones", controller.listarLiquidaciones);
router.get("/liquidaciones/ultima", controller.obtenerUltimaLiquidacion);
router.get("/novedades", controller.listarNovedades);
router.get("/datos-declarados", controller.obtenerDatosDeclarados);
router.post("/datos-declarados/actualizar", controller.actualizarDatosDeclarados);
router.get("/datos-declarados/historial", controller.historialDatosDeclarados);
router.get("/datos-declarados/historial/:token", controller.obtenerDatosDeclaradosUpdate);
router.get("/documentos", controller.listarDocumentos);
router.get("/documentos/:token", controller.obtenerDocumento);
router.get("/documentos/:token/pdf", controller.descargarDocumentoPdf);
router.post("/documentos/:token/conformidad-anexo-23", controller.conformidadAnexo23);
router.post("/documentos/:token/conformidad-anexo-25", controller.conformidadAnexo25);
router.post("/documentos/:token/generar-anexo-24", controller.generarAnexo24);
router.patch("/documentos/:token/anexo-24", controller.actualizarAnexo24);
router.post("/documentos/:token/enviar-anexo-24", controller.enviarAnexo24);

module.exports = router;
