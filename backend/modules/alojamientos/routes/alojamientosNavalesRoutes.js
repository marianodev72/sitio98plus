const express = require("express");
const multer = require("multer");

const { authRequired } = require("../../../middleware/auth");
const { refreshUserPrivileges } = require("../../../middleware/refreshUserPrivileges");
const controller = require("../controllers/alojamientoNavalController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const allowedMime = ["text/csv", "application/vnd.ms-excel", "text/plain"];
    if (!name.endsWith(".csv") && !allowedMime.includes(file.mimetype)) {
      return cb(new Error("Formato de archivo no permitido"));
    }
    return cb(null, true);
  },
});

router.use(authRequired, refreshUserPrivileges);

router.get("/", controller.listar);
router.get("/:id", controller.obtenerPorId);
router.get("/:id/plazas", controller.listarPlazas);
router.post("/import-csv", upload.single("archivo"), controller.importarCsv);

module.exports = router;
