// routes/alojamientos.js
// Catálogo de tipos de alojamiento (para ALOJADOS)

const express = require("express");
const fs = require("fs");
const path = require("path");

const Alojamiento = require("../models/Alojamiento");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Helper muy simple de roles "admin-like".
 * Usamos el mismo criterio que en otras rutas:
 * - ADMIN
 * - ADMINISTRACION
 * - ENCARGADO_GENERAL (si querés, podes quitarlo)
 */
function esAdminLike(user) {
  if (!user) return false;
  return (
    user.role === "ADMIN" ||
    user.role === "ADMINISTRACION" ||
    user.role === "ENCARGADO_GENERAL"
  );
}

/**
 * Parsear alojamientos.csv
 *
 * Formato real que compartiste:
 *   ALOJAMIENTO;TIPO;LUGAR
 *   CAMAROTE;1;BNUS
 *   CAMAROTE;2;BNUS
 *   CUSO;50;BNUS
 *
 * Tolerante a:
 *   - BOM inicial
 *   - "ALOJAMIENTO" o "ALOJAMIENTOS"
 */
function parsearAlojamientosDesdeCSV() {
  const filePath = path.join(__dirname, "..", "data", "alojamientos.csv");

  if (!fs.existsSync(filePath)) {
    throw new Error("No se encontró data/alojamientos.csv");
  }

  const raw = fs.readFileSync(filePath, "utf8");

  const lineas = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length < 2) {
    throw new Error("data/alojamientos.csv no tiene datos suficientes");
  }

  // Quitamos posible BOM al inicio de la primera línea
  const primera = lineas[0].replace(/^\uFEFF/, "");
  const header = primera.split(";").map((h) => h.trim().toUpperCase());

  // Aceptamos ALOJAMIENTO o ALOJAMIENTOS
  let idxAloj = header.indexOf("ALOJAMIENTO");
  if (idxAloj === -1) {
    idxAloj = header.indexOf("ALOJAMIENTOS");
  }
  const idxTipo = header.indexOf("TIPO");
  const idxLugar = header.indexOf("LUGAR");

  if (idxAloj === -1 || idxTipo === -1 || idxLugar === -1) {
    throw new Error(
      "Cabeceras inesperadas en alojamientos.csv. Esperado algo como: ALOJAMIENTO;TIPO;LUGAR"
    );
  }

  const registros = [];

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    const cols = linea.split(";");

    if (cols.length <= Math.max(idxAloj, idxTipo, idxLugar)) continue;

    const alojamiento = (cols[idxAloj] || "").trim();
    const tipo = (cols[idxTipo] || "").trim();
    const lugar = (cols[idxLugar] || "").trim();

    if (!alojamiento || !tipo || !lugar) continue;

    const codigo = `${alojamiento} ${tipo} ${lugar}`.trim();

    registros.push({
      alojamiento,
      tipo,
      lugar,
      codigo,
      activo: true,
    });
  }

  return registros;
}

// ---------------------------------------------------------------------------
// 1) Importar catálogo desde CSV (ADMIN / ADMINISTRACION / ENCARGADO_GENERAL)
//
//    POST /api/alojamientos/admin/import-csv
// ---------------------------------------------------------------------------
router.post("/admin/import-csv", requireAuth, async (req, res) => {
  try {
    if (!esAdminLike(req.user)) {
      return res
        .status(403)
        .json({ message: "Solo administración puede importar alojamientos" });
    }

    const registros = parsearAlojamientosDesdeCSV();

    // Estrategia simple: limpiamos la colección y la volvemos a cargar
    await Alojamiento.deleteMany({});

    if (registros.length > 0) {
      await Alojamiento.insertMany(registros);
    }

    console.log(
      `📥 Alojamiento: importados ${registros.length} registros desde data/alojamientos.csv`
    );

    return res.json({
      ok: true,
      message: "Alojamientos importados correctamente",
      total: registros.length,
    });
  } catch (err) {
    console.error("POST /api/alojamientos/admin/import-csv", err);
    return res.status(500).json({
      message: "Error importando alojamientos desde CSV",
      error:
        process.env.NODE_ENV === "development" ? String(err) : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// 2) Listar alojamientos (catálogo)
//    GET /api/alojamientos
//    Filtros opcionales:
//      ?lugar=BNUS
//      ?alojamiento=CAMAROTE
//      ?search=CAMAROTE
//      ?page=1&limit=50
// ---------------------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const { lugar, alojamiento, search } = req.query;
    const pageNum = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);

    const query = { activo: true };

    if (lugar) {
      query.lugar = String(lugar).trim();
    }

    if (alojamiento) {
      query.alojamiento = String(alojamiento).trim();
    }

    if (search) {
      const s = String(search).trim();
      query.$or = [
        { codigo: { $regex: s, $options: "i" } },
        { alojamiento: { $regex: s, $options: "i" } },
        { lugar: { $regex: s, $options: "i" } },
        { tipo: { $regex: s, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Alojamiento.find(query)
        .sort({ lugar: 1, alojamiento: 1, tipo: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Alojamiento.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      page: pageNum,
      limit: limitNum,
      total,
      alojamientos: items,
    });
  } catch (err) {
    console.error("GET /api/alojamientos", err);
    return res
      .status(500)
      .json({ message: "Error obteniendo alojamientos" });
  }
});

module.exports = router;
