// backend/controllers/viviendasController.js
// Controlador de viviendas para panel de administración ZN98

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

let viviendasCache = null; // se carga una sola vez desde CSV

// ---------------------------- Helpers internos ----------------------------

function normalizarBarrio(rawBarrio) {
  if (!rawBarrio) return "";
  return String(rawBarrio)
    .replace(/^"|"$/g, "") // quitar comillas exteriores
    .replace(/""/g, '"') // desdoblar comillas dobles
    .replace(/^BARRIO\s*/i, "") // quitar la palabra BARRIO al inicio
    .trim();
}

function construirCodigo(unidad) {
  if (!unidad) return "";
  const num = String(unidad).trim();
  return `ZN98-${num.padStart(3, "0")}`;
}

function cargarViviendasDesdeCSV() {
  return new Promise((resolve, reject) => {
    if (viviendasCache) {
      return resolve(viviendasCache);
    }

    const results = [];
    const csvPath = path.join(__dirname, "..", "data", "viviendas.csv");

    let rowIndex = 0;

    fs.createReadStream(csvPath)
      .on("error", (err) => {
        console.error("Error leyendo viviendas.csv", err);
        reject(err);
      })
      .pipe(
        csv({
          separator: ",",
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("data", (row) => {
        rowIndex += 1;

        const barrio = normalizarBarrio(row["BARRIOS"]);
        const unidad = row["DPTO/CASA"];
        const dormitoriosRaw = row["DORM."]; // ej: 2
        const convRaw = row["CANTIDAD CONVIVIENTES"]; // ej: 4

        const dormitorios = dormitoriosRaw
          ? Number(String(dormitoriosRaw).replace(",", ".")) || null
          : null;

        const capacidad = convRaw
          ? Number(String(convRaw).replace(",", ".")) || null
          : null;

        const vivienda = {
          _id: String(rowIndex), // ID simple para usar como key en frontend
          codigo: construirCodigo(unidad),
          barrio,
          unidad: unidad ? String(unidad).trim() : "",
          dormitorios,
          capacidad,
          titular: row["TITULAR"] || "",
          ingreso: row["INGRESO"] || "",
          egreso: row["EGRESO"] || "",
          estadoOperativo: "DISPONIBLE", // por ahora fijo, luego podremos derivarlo
          importedAt: new Date().toISOString(),
        };

        results.push(vivienda);
      })
      .on("end", () => {
        viviendasCache = results;
        console.log(`✅ Viviendas cargadas desde CSV: ${results.length}`);
        resolve(viviendasCache);
      });
  });
}

async function obtenerTodasLasViviendas() {
  if (viviendasCache) return viviendasCache;
  return cargarViviendasDesdeCSV();
}

function aplicarFiltros(viviendas, { search, estado }) {
  let filtradas = viviendas;

  if (search) {
    const s = search.toLowerCase();
    filtradas = filtradas.filter((v) => {
      return (
        (v.codigo && v.codigo.toLowerCase().includes(s)) ||
        (v.barrio && v.barrio.toLowerCase().includes(s)) ||
        (v.unidad && String(v.unidad).toLowerCase().includes(s)) ||
        (v.titular && v.titular.toLowerCase().includes(s))
      );
    });
  }

  if (estado && estado !== "TODOS") {
    filtradas = filtradas.filter(
      (v) => v.estadoOperativo === estado || v.estado === estado
    );
  }

  return filtradas;
}

// ---------------------------- Controladores públicos ----------------------------

// GET /api/viviendas/admin/list
exports.listAdminViviendas = async (req, res) => {
  try {
    const { search = "", estado = "TODOS", page = "1", limit = "5000" } =
      req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 50, 1);

    const todas = await obtenerTodasLasViviendas();
    const filtradas = aplicarFiltros(todas, {
      search: search.trim(),
      estado: estado.toUpperCase(),
    });

    const total = filtradas.length;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const items = filtradas.slice(start, end);

    res.json({
      ok: true,
      page: pageNum,
      limit: limitNum,
      total,
      items,
    });
  } catch (err) {
    console.error("Error en listAdminViviendas", err);
    res
      .status(500)
      .json({ ok: false, message: "Error obteniendo viviendas" });
  }
};

// GET /api/viviendas
exports.listAllViviendas = async (req, res) => {
  try {
    const todas = await obtenerTodasLasViviendas();
    res.json({
      ok: true,
      total: todas.length,
      items: todas,
    });
  } catch (err) {
    console.error("Error en listAllViviendas", err);
    res
      .status(500)
      .json({ ok: false, message: "Error obteniendo viviendas" });
  }
};
