const Minio = require("minio");

// ⚠️ NO SUBAS ESTAS KEYS A GITHUB ⚠️
const minioClient = new Minio.Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD
});

const BUCKET = "sitio98plus-permisionarios";

async function ensureBucket() {
    const exists = await minioClient.bucketExists(BUCKET).catch(() => false);

    if (!exists) {
        console.log(`[MinIO] Creando bucket: ${BUCKET}`);
        await minioClient.makeBucket(BUCKET, "us-east-1");
    } else {
        console.log(`[MinIO] Bucket ya existe: ${BUCKET}`);
    }
}

ensureBucket().catch(err => console.error("[MinIO] Error:", err));

module.exports = {
    minioClient,
    BUCKET
};
