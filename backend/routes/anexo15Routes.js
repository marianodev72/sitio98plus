const express = require("express");

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { uploadAnexo15 } = require("../middleware/anexo15Upload");
const controller = require("../controllers/anexo15Controller");

const router = express.Router();

router.use(authRequired, refreshUserPrivileges);

router.get("/mis", controller.listarMis);
router.get("/inspector", controller.listarInspector);
router.get("/admin", controller.listarAdmin);
router.post("/", controller.crear);
router.get("/:token", controller.obtener);
router.patch("/:token", controller.actualizar);
router.post("/:token/enviar", controller.enviar);
router.post("/:token/anular", controller.anular);
router.post("/:token/inspector/devolver", controller.inspectorDevolver);
router.post("/:token/inspector/aprobar", controller.inspectorAprobar);
router.post("/:token/admin/devolver", controller.adminDevolver);
router.post("/:token/admin/aprobar", controller.adminAprobar);
router.post("/:token/adjuntos/:campo", uploadAnexo15, controller.subirAdjunto);
router.delete("/:token/adjuntos/:adjuntoId", controller.eliminarAdjunto);
router.get("/:token/adjuntos/:adjuntoId", controller.descargarAdjunto);
router.get("/:token/pdf/preview", controller.pdf);
router.get("/:token/pdf", controller.pdf);

module.exports = router;
