const multer = require("multer");

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const uploadAnexo15 = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE,
  },
}).single("archivo");

module.exports = {
  uploadAnexo15,
  MAX_FILE_SIZE,
};
