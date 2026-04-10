const crypto = require("crypto");

const ALGO = "aes-256-gcm";

// 🔐 clave desde ENV
function getKey() {
  const raw = process.env.MFA_SECRET_KEY;
  if (!raw) throw new Error("Missing MFA_SECRET_KEY env");

  // debe ser 32 bytes
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptMfaSecret(secret) {
  const iv = crypto.randomBytes(12);
  const key = getKey();

  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptMfaSecret(enc) {
  if (!enc?.data || !enc?.iv || !enc?.tag) return "";

  const key = getKey();

  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(enc.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(enc.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encryptMfaSecret,
  decryptMfaSecret,
};