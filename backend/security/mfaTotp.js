const crypto = require("crypto");

const MFA_WINDOW = 1;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  let bits = "";

  const clean = String(input || "")
    .replace(/=+$/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return out;
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret, counter) {
  // ✅ Acá el secreto se interpreta como BASE32
  const key = base32Decode(secret);

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, "0");
}

function totp(secret, time = Date.now()) {
  const step = 30;
  const counter = Math.floor(time / 1000 / step);
  return hotp(secret, counter);
}

function verifyTotp(secret, token) {
  const step = 30;
  const current = Math.floor(Date.now() / 1000 / step);
  const candidate = String(token || "").trim();

  for (let i = -MFA_WINDOW; i <= MFA_WINDOW; i++) {
    if (hotp(secret, current + i) === candidate) return true;
  }

  return false;
}

module.exports = {
  generateSecret,
  verifyTotp,
  totp,
};