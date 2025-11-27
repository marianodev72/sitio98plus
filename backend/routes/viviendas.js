// backend/routes/viviendas.js
// API de viviendas para panel administrativo ZN98

const express = require("express");
const fs = require("fs");
const path = require("path");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers de rol (similar a rutas/postulaciones)
// ---------------------------------------------------------------------------
const ROLES_ADMIN_STRONG = ["ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"];

function requireAdminLike(req, res, next) {
  const role = req.user && req.user.role;
  if (!role || !ROLES_ADMIN_STRONG.includes(role)) {
    return res
      .status(403)
      .json({ message: "Acceso restringido a administración de viviendas." });
  }
  next();
}

// ---------------------------------------------------------------------------
// Carga de CSV de viviendas
// ---------------------------------------------------------------------------

const VIVIENDAS_CSV_PATH = path.join(__dirname, "..", "data", "viviendas.csv");

function parseViviendasCSV() {
  let content;
  try {
    content = fs.readFileSync(VIVIENDAS_CSV_PATH, "utf8");
  } catch (err) {
    console.error("[VIVIENDAS] Error leyendo CSV:", err.message);
    return [];
  }

  const lines = content.split(/\r?\n/);
  const viviendas = [];
  let inData = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split(",");

    // Encontrar fila de cabeceras: BARRIOS,DPTO/CASA,DORM...
    if (!inData) {
      if (cols[0] && cols[0].toUpperCase().includes("BARRIOS")) {
        inData = true;
      }
      continue;
    }

    if (cols.length < 2) continue;

    const [
      barrioRaw,
      unidadRaw,
      dormRaw,
      titularRaw,
      ingresoRaw,
      egresoRaw,
      cantConvRaw,
    ] = cols;

    const cleanText = (v) =>
      (v || "")
        .replace(/^"+|"+$/g, "") // quita comillas externas
        .replace(/""/g, '"') // normaliza comillas dobles internas
        .trim();

    const barrio = cleanText(barrioRaw);
    const unidad = cleanText(unidadRaw);
    const dormitorios = dormRaw ? parseInt(dormRaw, 10) || null : null;
    const titular = cleanText(titularRaw) || null;
    const ingreso = cleanText(ingresoRaw) || null;
    const egreso = cleanText(egresoRaw) || null;
    const capacidad = cantConvRaw
      ? parseInt(cantConvRaw, 10) || null
      : null;

    const estadoOperativo = titular ? "OCUPADA" : "DISPONIBLE";

    // Código artificial basado en la unidad
    const codigo = `ZN98-${unidad || ""}`.trim();

    viviendas.push({
      codigo,
      barrio,
      unidad,
      dormitorios,
      titular,
      ingreso,
      egreso,
      capacidad,
      estadoOperativo,
      importedAt: new Date().toISOString(),
    });
  }

  console.log(`[VIVIENDAS] CSV cargado. Registros: ${viviendas.length}`);
  return viviendas;
}

// Cache en memoria
let VIVIENDAS_CACHE = parseViviendasCSV();

// ---------------------------------------------------------------------------
// GET /api/viviendas/admin/list
// ---------------------------------------------------------------------------

router.get("/admin/list", requireAuth, requireAdminLike, async (req, res) => {
  try {
    let { search, estado, barrio, page, limit } = req.query;

    search = (search || "").toString().trim().toLowerCase();
    barrio = (barrio || "").toString().trim().toLowerCase();
    estado = (estado || "TODOS").toString().toUpperCase();
    page = parseInt(page || "1", 10);
    limit = parseInt(limit || "5000", 10);

    let lista = VIVIENDAS_CACHE;

    // Filtro por estado operativo
    if (estado && estado !== "TODOS") {
      lista = lista.filter(
        (v) =>
          (v.estadoOperativo || "").toUpperCase() === estado.toUpperCase()
      );
    }

    // Filtro por barrio (NUEVO)
    if (barrio) {
      lista = lista.filter((v) =>
        (v.barrio || "").toLowerCase().includes(barrio)
      );
    }

    // Filtro por búsqueda libre
    if (search) {
      lista = lista.filter((v) => {
        const hay = (val) =>
          val && val.toString().toLowerCase().includes(search);

        return (
          hay(v.codigo) ||
          hay(v.barrio) ||
          hay(v.unidad) ||
          hay(v.titular)
        );
      });
    }

    const total = lista.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = lista.slice(start, end);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      viviendas: paginated,
    });
  } catch (err) {
    console.error("[VIVIENDAS] Error en /admin/list:", err);
    return res
      .status(500)
      .json({ message: "Error al obtener listado de viviendas" });
  }
});

module.exports = router;
