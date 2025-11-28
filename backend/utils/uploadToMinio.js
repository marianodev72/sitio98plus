// backend/utils/uploadToMinio.js
// Helper centralizado para subir archivos a MinIO con defaults seguros.

const Minio = require("minio");
const path = require("path");
const crypto = require("crypto");

// ------------------------
// Configuración del cliente
// ------------------------

const endPoint =
  process.env.MINIO_ENDPOINT && process.env.MINIO_ENDPOINT.trim() !== ""
    ? process.env.MINIO_ENDPOINT.trim()
    : "127.0.0.1";

const port = Number(process.env.MINIO_PORT || 9000);

const useSSL =
  String(process.env.MINIO_USE_SSL || "false").toLowerCase() === "true";

const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

const BUCKET_NAME =
  process.env.MINIO_BUCKET_PERMISIONARIOS || "sitio98plus-permisionarios";

// URL base para armar links a los objetos (solo uso interno / debugging)
const PUBLIC_BASE_URL =
  process.env.MINIO_PUBLIC_URL || `http://${endPoint}:${port}`;

const minioClient = new Minio.Client({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

// ------------------------
// Helper: asegurar bucket
// ------------------------
async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(BUCKET_NAME).catch((err) => {
    // Si el error es que no existe, devolvemos false, si no, lo propagamos
    if (err && err.code === "NoSuchBucket") return false;
    throw err;
  });

  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, "");
  }
}

// ---------------------------------------
// Subida de documento de permisionario
// ---------------------------------------
/**
 * Sube un archivo a MinIO dentro del bucket de permisionarios.
 *
 * @param {Buffer} fileBuffer - contenido del archivo
 * @param {string} originalName - nombre original (para la extensión)
 * @param {string} permisionarioId - id del permisionario (para organizar carpetas)
 * @returns {Promise<{ bucket: string, objectName: string, url: string }>}
 */
async function uploadPermisionarioDocumento(
  fileBuffer,
  originalName,
  permisionarioId
) {
  await ensureBucketExists();

  const ext = path.extname(originalName || "").toLowerCase();
  const randomName = crypto.randomBytes(16).toString("hex");
  const objectName = `${permisionarioId}/${Date.now()}_${randomName}${ext}`;

  // putObject(bucket, objectName, data)
  await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer);

  const url = `${PUBLIC_BASE_URL}/${BUCKET_NAME}/${objectName}`;

  return {
    bucket: BUCKET_NAME,
    objectName,
    url,
  };
}

module.exports = {
  minioClient,
  uploadPermisionarioDocumento,
};
