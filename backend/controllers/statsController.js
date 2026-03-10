// backend/controllers/statsController.js

const Vivienda = require("../models/vivienda");
const { User } = require("../models/user");
const { FormSubmission } = require("../models/FormSubmission");

const MIS_DATOS_COLL = "misdatosdeclaradosupdates";
const STATS_K = 3;

/* ================= UTILIDADES ================= */

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function deny(res) {
  return res
    .status(404)
    .json({ message: "No es posible procesar su solicitud, contacte al Administrador" });
}

function isAdminGeneral(req) {
  return up(req.user?.role) === "ADMIN_GENERAL";
}

function kAnonBucket(list, labelKey, countKey, k = STATS_K) {
  if (!Array.isArray(list)) return [];
  let otros = 0;
  const out = [];

  for (const it of list) {
    const n = Number(it?.[countKey] || 0);
    if (n > 0 && n < k) otros += n;
    else out.push(it);
  }

  if (otros > 0) out.push({ [labelKey]: "OTROS", [countKey]: otros });
  return out;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/* ================= HACINAMIENTO ================= */

function hacinamientoPipelineBase(matchExtra = {}) {
  return [
    { $match: { ...matchExtra } },
    {
      $lookup: {
        from: MIS_DATOS_COLL,
        let: { uid: "$ocupacionActual.permisionario" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$usuario", "$$uid"] },
                  { $eq: [{ $toString: "$usuario" }, { $toString: "$$uid" }] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { datos: 1 } },
        ],
        as: "md",
      },
    },
    { $addFields: { md: { $arrayElemAt: ["$md", 0] } } },
    {
      $addFields: {
        habitantes: {
          $cond: [
            { $gt: [{ $ifNull: ["$md.datos.cantidadAdultos", 0] }, 0] },
            {
              $add: [
                "$md.datos.cantidadAdultos",
                { $ifNull: ["$md.datos.cantidadHijos", 0] },
              ],
            },
            { $ifNull: ["$cantidadHabitantes", 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        habBucket: {
          $cond: [
            { $gte: ["$habitantes", 7] },
            "7+",
            { $toString: "$habitantes" },
          ],
        },
      },
    },
    {
      $addFields: {
        hacinamiento: {
          $cond: [
            { $lt: ["$dormitorios", "$habitantes"] },
            "ROJO",
            {
              $cond: [
                { $eq: ["$dormitorios", "$habitantes"] },
                "AMARILLO",
                "VERDE",
              ],
            },
          ],
        },
      },
    },
  ];
}

/* ================= BARRIOS DISPONIBLES ================= */

exports.getStatsBarrios = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const raw = await Vivienda.aggregate([
      { $group: { _id: "$barrio", cantidad: { $sum: 1 } } },
    ]);

    let barrios = raw.map((b) => ({
      barrio: b._id || "SIN_BARRIO",
      cantidad: b.cantidad,
    }));

    barrios = kAnonBucket(barrios, "barrio", "cantidad");

    return res.json(barrios.map((b) => b.barrio));
  } catch (e) {
    console.error("[STATS] barrios", e);
    return deny(res);
  }
};

/* ================= RESUMEN GLOBAL ================= */

async function buildResumen(matchExtra = {}) {
  const viviendasTotal = await Vivienda.countDocuments(matchExtra);

  const viviendasPorEstado = await Vivienda.aggregate([
    { $match: matchExtra },
    { $group: { _id: "$estado", cantidad: { $sum: 1 } } },
  ]);

  const viviendasPorDorm = await Vivienda.aggregate([
    { $match: matchExtra },
    { $group: { _id: "$dormitorios", cantidad: { $sum: 1 } } },
  ]);

  const pedidosTrabajo = await FormSubmission.aggregate([
    { $match: { codigo: "ANEXO_11", ...matchExtra } },
    { $group: { _id: "$barrio", cantidad: { $sum: 1 } } },
  ]);

  const hacColor = await Vivienda.aggregate([
    ...hacinamientoPipelineBase(matchExtra),
    { $group: { _id: "$hacinamiento", cantidad: { $sum: 1 } } },
  ]);

  const habDist = await Vivienda.aggregate([
    ...hacinamientoPipelineBase(matchExtra),
    { $group: { _id: "$habBucket", cantidad: { $sum: 1 } } },
  ]);

  return {
    viviendas: viviendasTotal,
    viviendasPorEstado,
    viviendasPorDorm,
    pedidosTrabajo,
    hacColor,
    habDist,
  };
}

/* ================= ENDPOINTS ================= */

exports.getResumenStats = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const data = await buildResumen({});
    return res.json(data);
  } catch (e) {
    console.error("[STATS] resumen", e);
    return deny(res);
  }
};

exports.getStatsPorBarrio = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const barrio = req.params.barrio;
    const data = await buildResumen({ barrio });
    return res.json(data);
  } catch (e) {
    console.error("[STATS] barrio", e);
    return deny(res);
  }
};
