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

function formularioBarrioPipeline(match, barrio = "") {
  const pipeline = [
    { $match: match },
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
                  $ifNull: [
                    "$datos.barrio",
                    {
                      $ifNull: [
                        "$datos.barrioAsignado",
                        {
                          $ifNull: [
                            "$datos.inspectorBarrio",
                            {
                              $ifNull: [
                                "$datos.localidad",
                                {
                                  $ifNull: ["$viviendaObj.barrio", "SIN_BARRIO"],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  ];

  const barrioFiltro = String(barrio || "").trim();
  if (barrioFiltro && up(barrioFiltro) !== "TODOS" && up(barrioFiltro) !== "OTROS") {
    pipeline.push({ $match: { barrioResolved: barrioFiltro } });
  }

  return pipeline;
}

function monthRows(rows) {
  const map = new Map((rows || []).map((r) => [Number(r._id), Number(r.cantidad || 0)]));
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    cantidad: map.get(i + 1) || 0,
  }));
}

function recientePersonaLabel(item) {
  const d = item?.datos || {};
  const usuario = item?.usuarioObj || {};
  const fromDatos =
    d.apellidoNombres ||
    d.permisionarioNombre ||
    d.postulanteLabel ||
    d.postulanteNombre ||
    d.titularNombre ||
    d.inspectorNombre ||
    "";
  const fromUser = `${usuario.apellido || ""} ${usuario.nombre || ""}`.trim();
  return String(fromDatos || fromUser || usuario.email || "—").trim();
}

function recienteViviendaLabel(item) {
  const d = item?.datos || {};
  return String(
    d.viviendaCodigo ||
      d.viviendaLabel ||
      d.unidadHabitacional ||
      d.casa ||
      item?.viviendaObj?.codigo ||
      "—"
  ).trim();
}

async function buildFormularioDocumentalStats(req) {
  const year = getRequestedYear(req);
  const desde = new Date(year, 0, 1);
  const hasta = new Date(year + 1, 0, 1);
  const codigo = up(req.query?.codigo);
  const estado = up(req.query?.estado);
  const barrio = String(req.query?.barrio || "").trim();

  const match = {
    createdAt: { $gte: desde, $lt: hasta },
  };

  if (codigo && codigo !== "TODOS") match.codigo = codigo;
  if (estado && estado !== "TODOS") match.estado = estado;

  const basePipeline = formularioBarrioPipeline(match, barrio);

  const [stats] = await FormSubmission.aggregate([
    ...basePipeline,
    {
      $facet: {
        total: [{ $count: "cantidad" }],
        porTipo: [
          { $group: { _id: "$codigo", cantidad: { $sum: 1 } } },
          { $sort: { cantidad: -1, _id: 1 } },
        ],
        porEstado: [
          {
            $group: {
              _id: { $ifNull: ["$estado", "SIN_ESTADO"] },
              cantidad: { $sum: 1 },
            },
          },
          { $sort: { cantidad: -1, _id: 1 } },
        ],
        tipoEstado: [
          {
            $group: {
              _id: {
                codigo: "$codigo",
                estado: { $ifNull: ["$estado", "SIN_ESTADO"] },
              },
              cantidad: { $sum: 1 },
            },
          },
          { $sort: { "_id.codigo": 1, "_id.estado": 1 } },
        ],
        evolucionMensual: [
          {
            $group: {
              _id: { $month: "$createdAt" },
              cantidad: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        recientes: [
          { $sort: { updatedAt: -1, createdAt: -1, _id: -1 } },
          { $limit: 15 },
          {
            $lookup: {
              from: "users",
              localField: "usuario",
              foreignField: "_id",
              as: "usuarioObj",
            },
          },
          {
            $unwind: {
              path: "$usuarioObj",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              codigo: 1,
              estado: 1,
              estadoInstitucional: 1,
              createdAt: 1,
              updatedAt: 1,
              barrioResolved: 1,
              datos: {
                apellidoNombres: "$datos.apellidoNombres",
                permisionarioNombre: "$datos.permisionarioNombre",
                postulanteLabel: "$datos.postulanteLabel",
                postulanteNombre: "$datos.postulanteNombre",
                titularNombre: "$datos.titularNombre",
                inspectorNombre: "$datos.inspectorNombre",
                viviendaCodigo: "$datos.viviendaCodigo",
                viviendaLabel: "$datos.viviendaLabel",
                unidadHabitacional: "$datos.unidadHabitacional",
                casa: "$datos.casa",
              },
              "viviendaObj.codigo": 1,
              "usuarioObj.nombre": 1,
              "usuarioObj.apellido": 1,
              "usuarioObj.email": 1,
            },
          },
        ],
      },
    },
  ]);

  const recientes = (stats?.recientes || []).map((item) => ({
    _id: String(item._id),
    codigo: item.codigo || "SIN_TIPO",
    estado: item.estado || "SIN_ESTADO",
    estadoInstitucional: item.estadoInstitucional || null,
    barrio: item.barrioResolved || "SIN_BARRIO",
    vivienda: recienteViviendaLabel(item),
    persona: recientePersonaLabel(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return {
    year,
    filtros: {
      barrio: barrio || "TODOS",
      codigo: codigo || "TODOS",
      estado: estado || "TODOS",
    },
    total: Number(stats?.total?.[0]?.cantidad || 0),
    porTipo: (stats?.porTipo || []).map((x) => ({
      _id: x._id || "SIN_TIPO",
      cantidad: Number(x.cantidad || 0),
    })),
    porEstado: (stats?.porEstado || []).map((x) => ({
      _id: x._id || "SIN_ESTADO",
      cantidad: Number(x.cantidad || 0),
    })),
    tipoEstado: (stats?.tipoEstado || []).map((x) => ({
      codigo: x?._id?.codigo || "SIN_TIPO",
      estado: x?._id?.estado || "SIN_ESTADO",
      cantidad: Number(x.cantidad || 0),
    })),
    evolucionMensual: monthRows(stats?.evolucionMensual),
    recientes,
  };
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

exports.getFormularioStats = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const data = await buildFormularioDocumentalStats(req);
    return res.json(data);
  } catch (e) {
    console.error("[STATS] formularios", e);
    return deny(res);
  }
};
