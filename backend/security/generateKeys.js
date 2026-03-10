const fs = require("fs");
const path = require("path");
const { generateKeyPairSync } = require("crypto");

const securityPath = __dirname;

if (!fs.existsSync(securityPath)) {
  fs.mkdirSync(securityPath, { recursive: true });
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

const defaultPrivOut = path.join(securityPath, "jwtRS256.key");
const defaultPubOut = path.join(securityPath, "jwtRS256.key.pub");

const privOut = process.env.JWT_PRIVATE_KEY_PATH || defaultPrivOut;
const pubOut = process.env.JWT_PUBLIC_KEY_PATH || defaultPubOut;

// Asegura carpetas destino (por si apuntás a un mount/secret path)
try {
  fs.mkdirSync(path.dirname(privOut), { recursive: true });
} catch (_) {}
try {
  fs.mkdirSync(path.dirname(pubOut), { recursive: true });
} catch (_) {}

fs.writeFileSync(privOut, privateKey);
fs.writeFileSync(pubOut, publicKey);

console.log(`🔐 Claves RSA creadas en:
 - private: ${privOut}
 - public : ${pubOut}`);
