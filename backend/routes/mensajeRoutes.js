// backend/routes/mensajeRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const uploadMensajes = require("../middleware/uploadMensajes");

const {
  getAgenda,
  getEntrada,
  getEnviados,
  getMensaje,
  marcarLeido,
  descargarAdjunto,
  enviarMensaje,
} = require("../controllers/mensajeController");

router.use(authRequired, refreshUserPrivileges);

// agenda institucional (territorial o completa según rol)
router.get("/agenda", getAgenda);

// bandejas
router.get("/entrada", getEntrada);
router.get("/enviados", getEnviados);

// detalle + leído
router.get("/:id/adjuntos/:fileId", descargarAdjunto);
router.get("/:id", getMensaje);
router.patch("/:id/leido", marcarLeido);

function parseMensajeUpload(req, res, next) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) return next();

  return uploadMensajes(req, res, (err) => {
    if (!err) return next();

    const code = String(err.code || "");
    const message =
      code === "LIMIT_FILE_SIZE"
        ? "El archivo adjunto supera el tamaño permitido"
        : code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE"
        ? "La cantidad de adjuntos no es válida"
        : err.message || "No es posible procesar el archivo adjunto";

    return res.status(400).json({ message });
  });
}

// enviar
router.post("/", parseMensajeUpload, enviarMensaje);

module.exports = router;
