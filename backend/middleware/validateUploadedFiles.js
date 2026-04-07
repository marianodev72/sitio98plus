const fs = require("fs");
const { fileTypeFromFile } = require("file-type");

// Tipos permitidos REALES (no confiamos en mimetype del cliente)
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

async function validateUploadedFiles(req, res, next) {
  try {
    const files = Array.isArray(req.files)
  ? req.files
  : Object.values(req.files || {}).flat();

    for (const file of files) {
      // Solo validamos si existe archivo en disco
      if (!file || !file.path) continue;

      const detected = await fileTypeFromFile(file.path);

      // ❌ No se pudo detectar tipo real
      if (!detected) {
        try {
          fs.unlinkSync(file.path);
        } catch {}

        return res.status(400).json({
          error: "Archivo inválido (no se pudo determinar tipo)",
        });
      }

      // ❌ Tipo no permitido
      if (!ALLOWED_MIME.includes(detected.mime)) {
        try {
          fs.unlinkSync(file.path);
        } catch {}

        return res.status(400).json({
          error: `Tipo de archivo no permitido: ${detected.mime}`,
        });
      }

      // ❌ Inconsistencia MIME declarado vs real (opcional pero recomendable)
      if (file.mimetype && file.mimetype !== detected.mime) {
        try {
          fs.unlinkSync(file.path);
        } catch {}

        return res.status(400).json({
          error: "El tipo de archivo no coincide con su contenido real",
        });
      }
    }

    return next();
  } catch (err) {
    console.error("[validateUploadedFiles] Error:", err);

    return res.status(400).json({
      error: "Error validando archivos",
    });
  }
}

module.exports = { validateUploadedFiles };