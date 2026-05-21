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
router.get("/documentos", controller.listarDocumentos);
router.get("/documentos/:token", controller.obtenerDocumento);
router.get("/documentos/:token/pdf", controller.descargarDocumentoPdf);
router.post("/documentos/:token/conformidad-anexo-23", controller.conformidadAnexo23);

module.exports = router;
