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

fs.writeFileSync(path.join(securityPath, "jwtRS256.key"), privateKey);
fs.writeFileSync(path.join(securityPath, "jwtRS256.key.pub"), publicKey);

console.log("🔐 Claves RSA creadas en /backend/security/");
