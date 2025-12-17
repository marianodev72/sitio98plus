const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authRequired, requireRole } = require("../middleware/auth");
const c = require("../controllers/formularioController");

const UPLOADS = path.join(process.cwd(), "uploads", "formularios");
fs.mkdirSync(UPLOADS, { recursive: true });

const upload = multer({ dest: UPLOADS });

router.post("/:codigo", authRequired, upload.any(), c.crearAnexo);
router.get("/mios", authRequired, c.getMisAnexos);
router.get("/anexo/:codigo", authRequired, requireRole("ADMIN", "ADMIN_GENERAL"), c.listarPorCodigo);
router.post("/:id/conformidad", authRequired, requireRole("POSTULANTE"), c.darConformidad);
router.post("/:id/conformidad-admin", authRequired, requireRole("ADMIN", "ADMIN_GENERAL"), c.darConformidadAdmin);

module.exports = router;
