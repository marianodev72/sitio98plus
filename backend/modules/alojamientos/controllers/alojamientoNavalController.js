const mongoose = require("mongoose");

const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const { importAlojamientosCsv } = require("../services/alojamientoImportService");

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isAdminLike(user) {
  const role = up(user?.role);
  return role === "ADMIN_GENERAL" || role === "ADMIN";
}

function parseBoolQuery(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "si", "yes"].includes(String(value).toLowerCase().trim());
}

async function listar(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const filtro = {};
    const { dependencia, lugar, sector, tipo, clase, estado, generoPermitido, activo } =
      req.query || {};

    if (dependencia) filtro.dependencia = String(dependencia).trim();
    if (lugar) filtro.lugar = String(lugar).trim();
    if (sector) filtro.sector = String(sector).trim();
    if (tipo) filtro.tipo = String(tipo).trim();
    if (clase) filtro.clase = up(clase);
    if (estado) filtro.estado = up(estado);
    if (generoPermitido) filtro.generoPermitido = up(generoPermitido);
    if (activo !== undefined) filtro.activo = parseBoolQuery(activo, true);

    const page = Math.max(Number.parseInt(req.query?.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit || "50", 10), 1), 200);

    const [items, total] = await Promise.all([
      AlojamientoNaval.find(filtro)
        .sort({ dependencia: 1, lugar: 1, sector: 1, tipo: 1, numero: 1, codigo: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AlojamientoNaval.countDocuments(filtro),
    ]);

    return res.json({ ok: true, page, limit, total, alojamientos: items });
  } catch (err) {
    console.error("[alojamientos] listar error:", err);
    return res.status(500).json({ message: "Error interno al listar alojamientos navales" });
  }
}

async function obtenerPorId(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const alojamiento = await AlojamientoNaval.findById(id).lean();
    if (!alojamiento) return deny(res);

    return res.json({ ok: true, alojamiento });
  } catch (err) {
    console.error("[alojamientos] obtenerPorId error:", err);
    return res.status(500).json({ message: "Error interno al obtener alojamiento naval" });
  }
}

async function listarTerritorios(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const rows = await AlojamientoNaval.aggregate([
      {
        $match: {
          activo: { $ne: false },
          lugar: { $exists: true, $ne: "" },
        },
      },
      {
        $project: {
          valor: { $trim: { input: "$lugar" } },
        },
      },
      {
        $match: {
          valor: { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$valor",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const territorios = rows.map((row) => ({ tipo: "LUGAR", valor: row._id }));
    return res.json({ ok: true, total: territorios.length, territorios });
  } catch (err) {
    console.error("[alojamientos] listarTerritorios error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar territorios" });
  }
}

async function listarPlazas(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const alojamiento = await AlojamientoNaval.findById(id).select("_id codigo").lean();
    if (!alojamiento) return deny(res);

    const plazas = await AlojamientoPlaza.find({ alojamiento: id })
      .sort({ numeroPlaza: 1 })
      .lean();

    return res.json({ ok: true, alojamiento, plazas });
  } catch (err) {
    console.error("[alojamientos] listarPlazas error:", err);
    return res.status(500).json({ message: "Error interno al listar plazas" });
  }
}

async function importarCsv(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const dryRun = parseBoolQuery(req.body?.dryRun ?? req.query?.dryRun, true);
    const csvContent = req.file?.buffer
      ? req.file.buffer.toString("utf8")
      : String(req.body?.csvContent || "");

    if (!csvContent.trim()) {
      return res.status(400).json({ ok: false, message: "CSV requerido" });
    }

    const result = await importAlojamientosCsv({
      csvContent,
      fileName: req.file?.originalname || req.body?.fileName || "alojamientos_navales.csv",
      dryRun,
    });

    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  } catch (err) {
    console.error("[alojamientos] importarCsv error:", err);
    if (err.code === "CAPACIDAD_INCOMPATIBLE") {
      return res.status(409).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: "Error interno al importar CSV" });
  }
}

module.exports = {
  listar,
  listarTerritorios,
  obtenerPorId,
  listarPlazas,
  importarCsv,
};
