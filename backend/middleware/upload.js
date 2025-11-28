const multer = require("multer");

const storage = multer.memoryStorage();

module.exports = multer({ storage }).array("documentos", 10);
