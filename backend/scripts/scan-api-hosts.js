// scripts/scan-api-hosts.js
// Recorre recursivamente el frontend y busca usos de 127.0.0.1:3000 y localhost:3000

const fs = require("fs");
const path = require("path");

// Ajustá esta ruta si tu frontend está en otra carpeta
const FRONTEND_DIR = path.join(__dirname, "..", "frontend", "src");

// Patrones de host que queremos detectar
const PATTERNS = [
  "127.0.0.1:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "localhost:3000",
  "http://localhost:3000",
  "https://localhost:3000",
];

// Extensiones de archivos que nos interesan
const VALID_EXT = [".js", ".jsx", ".ts", ".tsx", ".json"];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  return VALID_EXT.includes(ext);
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  let hasMatch = false;

  lines.forEach((line, idx) => {
    PATTERNS.forEach((pattern) => {
      if (line.includes(pattern)) {
        if (!hasMatch) {
          console.log("\n────────────────────────────────────────────");
          console.log("Archivo:", filePath);
          hasMatch = true;
        }
        console.log(
          `Línea ${String(idx + 1).padStart(4, " ")} |`,
          line.trim()
        );
      }
    });
  });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && shouldScanFile(fullPath)) {
      scanFile(fullPath);
    }
  }
}

// MAIN
console.log("Escaneando:", FRONTEND_DIR);
if (!fs.existsSync(FRONTEND_DIR)) {
  console.error("❌ No existe la carpeta:", FRONTEND_DIR);
  process.exit(1);
}

walkDir(FRONTEND_DIR);
console.log("\n✔ Escaneo terminado.");
