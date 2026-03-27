// backend/controllers/statsController.js

const Vivienda = require("../models/vivienda");
const { FormSubmission } = require("../models/FormSubmission");

const MIS_DATOS_COLL = "misdatosdeclaradosupdates";
const STATS_K = 3;

/* ================= ANEXO_11 ================= */

const ANEXO11_APROBADOS_INST = [
  "TAREA_PENDIENTE_PROGRAMACION",
  "TAREA_PENDIENTE_CONFIRMACION_PERM",
  "TAREA_CONFIRMADA",
  "CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM",
  "EN_REVISION_ADMIN_GENERAL",
  "DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL",
  "CERRADO_ADMIN_GENERAL",
];

const ANEXO11_DESAPROBADOS_INST = [
  "RECHAZADO_POR_INSPECTOR",
];

const ANEXO11_ABIERTOS_INST = [
  "TAREA_PENDIENTE_PROGRAMACION",
  "TAREA_PENDIENTE_CONFIRMACION_PERM",
  "TAREA_CONFIRMADA",
  "CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM",
  "EN_REVISION_ADMIN_GENERAL",
  "DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL",
];

const ANEXO11_FINALIZADOS_INST = [
  "CERRADO_ADMIN_GENERAL",
];

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

function getRequestedYear(req) {
  const raw = Number(req.query?.year);
  const currentYear = new Date().getFullYear();

  if (!Number.isInteger(raw)) return currentYear;
  if (raw < 2020 || raw > currentYear + 1) return currentYear;

  return raw;
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

/* ================= ANEXO_11 STATS ================= */

async function buildAnexo11Stats(matchExtra = {}, year = new Date().getFullYear()) {
  const barrioFilter =
    typeof matchExtra?.barrio === "string" ? matchExtra.barrio.trim() : "";

  const desde = new Date(year, 0, 1);
  const hasta = new Date(year + 1, 0, 1);

  const baseMatch = {
    codigo: "ANEXO_11",
    createdAt: { $gte: desde, $lt: hasta },
  };

  const pipelineBase = [
    { $match: baseMatch },

    {
      $lookup: {
        from: "viviendas",
        localField: "vivienda",
        foreignField: "_id",
        as: "viviendaObj",
      },
    },
    {
      $unwind: {
        path: "$viviendaObj",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        barrioResolved: {
          $ifNull: [
            "$barrio",
            {
              $ifNull: [
                "$datos.viviendaBarrio",
                {
                  $ifNull: ["$viviendaObj.barrio", "SIN_BARRIO"],
                },
              ],
            },
          ],
        },
      },
    },
  ];

  if (barrioFilter) {
    pipelineBase.push({
      $match: { barrioResolved: barrioFilter },
    });
  }

  const [
    presentadosAgg,
    aprobadosAgg,
    desaprobadosAgg,
    abiertosAgg,
    finalizadosAgg,
    porBarrioRaw,
  ] = await Promise.all([
    FormSubmission.aggregate([
      ...pipelineBase,
      { $count: "cantidad" },
    ]),

    FormSubmission.aggregate([
      ...pipelineBase,
      {
        $match: {
          estadoInstitucional: { $in: ANEXO11_APROBADOS_INST },
        },
      },
      { $count: "cantidad" },
    ]),

    FormSubmission.aggregate([
      ...pipelineBase,
      {
        $match: {
          estadoInstitucional: { $in: ANEXO11_DESAPROBADOS_INST },
        },
      },
      { $count: "cantidad" },
    ]),

    FormSubmission.aggregate([
      ...pipelineBase,
      {
        $match: {
          estadoInstitucional: { $in: ANEXO11_ABIERTOS_INST },
        },
      },
      { $count: "cantidad" },
    ]),

    FormSubmission.aggregate([
      ...pipelineBase,
      {
        $match: {
          estadoInstitucional: { $in: ANEXO11_FINALIZADOS_INST },
        },
      },
      { $count: "cantidad" },
    ]),

    FormSubmission.aggregate([
      ...pipelineBase,
      {
        $group: {
          _id: "$barrioResolved",
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { cantidad: -1, _id: 1 } },
    ]),
  ]);

  const presentados = Number(presentadosAgg?.[0]?.cantidad || 0);
  const aprobados = Number(aprobadosAgg?.[0]?.cantidad || 0);
  const desaprobados = Number(desaprobadosAgg?.[0]?.cantidad || 0);
  const abiertos = Number(abiertosAgg?.[0]?.cantidad || 0);
  const finalizados = Number(finalizadosAgg?.[0]?.cantidad || 0);

  const porBarrio = kAnonBucket(
    (porBarrioRaw || []).map((x) => ({
      _id: x._id || "SIN_BARRIO",
      cantidad: Number(x.cantidad || 0),
    })),
    "_id",
    "cantidad"
  );

  return {
    year,
    presentados,
    aprobados,
    desaprobados,
    abiertos,
    finalizados,
    porDecision: [
      { _id: "APROBADO", cantidad: aprobados },
      { _id: "DESAPROBADO", cantidad: desaprobados },
    ],
    porEjecucion: [
      { _id: "ABIERTO", cantidad: abiertos },
      { _id: "FINALIZADO", cantidad: finalizados },
    ],
    porBarrio,
  };
}

/* ================= DEMANDA HABITACIONAL ================= */

async function buildDemandaHabitacionalStats(year = new Date().getFullYear()) {
  const desde = new Date(year, 0, 1);
  const hasta = new Date(year + 1, 0, 1);

  const [anexo01Presentados, anexo02Generados] = await Promise.all([
    FormSubmission.countDocuments({
      codigo: "ANEXO_01",
      createdAt: { $gte: desde, $lt: hasta },
    }),

    FormSubmission.countDocuments({
      codigo: "ANEXO_02",
      createdAt: { $gte: desde, $lt: hasta },
      derivadoDe: { $exists: true, $ne: null },
    }),
  ]);

  const brechaHabitacional = Math.max(0, anexo01Presentados - anexo02Generados);

  const tasaCobertura =
    anexo01Presentados > 0
      ? Math.round((anexo02Generados / anexo01Presentados) * 100)
      : 0;

  return {
    year,
    anexo01Presentados,
    anexo02Generados,
    brechaHabitacional,
    tasaCobertura,
    coberturaRows: [
      { _id: "CUBIERTO", cantidad: anexo02Generados },
      { _id: "NO_CUBIERTO", cantidad: brechaHabitacional },
    ],
  };
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

async function buildResumen(matchExtra = {}, year = new Date().getFullYear()) {
  const viviendasTotal = await Vivienda.countDocuments(matchExtra);

  const viviendasPorEstado = await Vivienda.aggregate([
    { $match: matchExtra },
    { $group: { _id: "$estado", cantidad: { $sum: 1 } } },
  ]);

  const viviendasPorDorm = await Vivienda.aggregate([
    { $match: matchExtra },
    { $group: { _id: "$dormitorios", cantidad: { $sum: 1 } } },
  ]);

  const anexo11Stats = await buildAnexo11Stats(matchExtra, year);
  const pedidosTrabajo = anexo11Stats.porBarrio;

  const demandaHabitacionalStats = await buildDemandaHabitacionalStats(year);

  const hacColor = await Vivienda.aggregate([
    ...hacinamientoPipelineBase(matchExtra),
    { $group: { _id: "$hacinamiento", cantidad: { $sum: 1 } } },
  ]);

  const habDist = await Vivienda.aggregate([
    ...hacinamientoPipelineBase(matchExtra),
    { $group: { _id: "$habBucket", cantidad: { $sum: 1 } } },
  ]);

  return {
    year,
    viviendas: viviendasTotal,
    viviendasPorEstado,
    viviendasPorDorm,
    pedidosTrabajo,
    anexo11Stats,
    demandaHabitacionalStats,
    hacColor,
    habDist,
  };
}

/* ================= ENDPOINTS ================= */

exports.getResumenStats = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const year = getRequestedYear(req);
    const data = await buildResumen({}, year);
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
    const year = getRequestedYear(req);
    const data = await buildResumen({ barrio }, year);
    return res.json(data);
  } catch (e) {
    console.error("[STATS] barrio", e);
    return deny(res);
  }
};