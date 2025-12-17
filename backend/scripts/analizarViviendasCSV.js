/**
 * Analizador de viviendas.csv
 * - NO toca MongoDB
 * - Solo lee backend/data/viviendas.csv
 * - Encuentra códigos duplicados (DPTO/CASA)
 */

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "../data/viviendas.csv");

function limpiarTexto(str) {
  if (!str) return "";
  return String(str).trim();
}

function main() {
  console.log("──────────────────────────────────────");
  console.log(" Analizando viviendas.csv (ZN98)");
  console.log("──────────────────────────────────────");
  console.log("Archivo:", CSV_PATH);

  if (!fs.existsSync(CSV_PATH)) {
    console.error("❌ No existe el archivo:", CSV_PATH);
    process.exit(1);
  }

  // El archivo viene en latin1
  const contenido = fs.readFileSync(CSV_PATH, "latin1");
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log("✔ Líneas totales (incluyendo cabecera):", lineas.length);
  if (lineas.length <= 1) {
    console.error("❌ El CSV no tiene datos (solo cabecera o está vacío).");
    process.exit(1);
  }

  const header = lineas[0];
  console.log("🔎 Cabecera:", header);

  let filasDatos = 0;

  // Mapa por código
  // codigos["D-01"] = { count: 2, lineas: [12, 28], barrios: Set(...) }
  const codigos = {};

  // Recorremos desde la segunda línea (i = 1)
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;

    filasDatos++;

    const partes = linea.split(";");
    if (partes.length < 3) {
      console.log(
        `⚠ Fila ${i + 1} ignorada por columnas insuficientes ->`,
        linea
      );
      continue;
    }

    const barrioRaw = limpiarTexto(partes[0]);
    const codigoRaw = limpiarTexto(partes[1]);
    const dormRaw = limpiarTexto(partes[2]);

    if (!codigoRaw) {
      console.log(`⚠ Fila ${i + 1} sin código, se ignora ->`, linea);
      continue;
    }

    const barrio = barrioRaw.replace(/^BARRIO\s*/i, "").trim();
    const codigo = codigoRaw;

    if (!codigos[codigo]) {
      codigos[codigo] = {
        count: 0,
        lineas: [],
        barrios: new Set(),
        dorms: new Set(),
      };
    }

    codigos[codigo].count += 1;
    codigos[codigo].lineas.push(i + 1); // +1 porque las líneas se numeran desde 1
    if (barrio) codigos[codigo].barrios.add(barrio);
    if (dormRaw) codigos[codigo].dorms.add(dormRaw);
  }

  const todosCodigos = Object.keys(codigos);
  const totalCodigosDistintos = todosCodigos.length;

  const duplicados = todosCodigos
    .map((codigo) => ({ codigo, info: codigos[codigo] }))
    .filter((x) => x.info.count > 1)
    .sort((a, b) => b.info.count - a.info.count);

  console.log("──────────────────────────────────────");
  console.log("📊 Resumen del CSV");
  console.log("  Filas de datos (sin cabecera):", filasDatos);
  console.log("  Códigos distintos (DPTO/CASA):", totalCodigosDistintos);
  console.log("  Códigos duplicados:", duplicados.length);
  console.log("──────────────────────────────────────");

  if (duplicados.length === 0) {
    console.log("✅ No se encontraron códigos duplicados. Todo consistente.");
  } else {
    console.log("⚠ Detalle de códigos duplicados:");
    duplicados.forEach(({ codigo, info }) => {
      console.log("────────────────────────────");
      console.log(`Código: ${codigo}`);
      console.log(`  Apariciones: ${info.count}`);
      console.log(`  Líneas: ${info.lineas.join(", ")}`);
      if (info.barrios.size > 0) {
        console.log(
          `  Barrios detectados: ${Array.from(info.barrios).join(" | ")}`
        );
      }
      if (info.dorms.size > 0) {
        console.log(
          `  Valores de DORM. detectados: ${Array.from(info.dorms).join(" | ")}`
        );
      }
    });
  }

  console.log("──────────────────────────────────────");
  console.log(" Fin del análisis de viviendas.csv");
}

main();
