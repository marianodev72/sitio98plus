const multer = require("multer");

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single("archivo");

function uploadAlojamientoDocumento(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: "No es posible procesar el archivo" });
    }
    return next();
  });
}

module.exports = {
  MAX_FILE_SIZE,
  uploadAlojamientoDocumento,
};
