// backend/controllers/statsController.js

const Vivienda = require("../models/vivienda");
const { FormSubmission } = require("../models/FormSubmission");
const AlojamientoNaval = require("../modules/alojamientos/models/AlojamientoNaval");
const AlojamientoPlaza = require("../modules/alojamientos/models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");
const AlojamientoDocumento = require("../modules/alojamientos/models/AlojamientoDocumento");

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

function cleanFiltroTexto(value) {
  const raw = String(value || "").trim();
  if (!raw || up(raw) === "TODOS") return "";
  return raw;
}

function alojamientoStatsFilters(query = {}) {
  return {
    lugar: cleanFiltroTexto(query.lugar),
    dependencia: cleanFiltroTexto(query.dependencia),
    sector: cleanFiltroTexto(query.sector),
  };
}

function applyAlojamientoFiltros(match, filtros) {
  const out = { ...match };
  if (filtros.lugar) out.lugar = filtros.lugar;
  if (filtros.dependencia) out.dependencia = filtros.dependencia;
  if (filtros.sector) out.sector = filtros.sector;
  return out;
}

function countFrom(rows, key) {
  const target = up(key);
  const row = (rows || []).find((item) => up(item?._id) === target);
  return Number(row?.cantidad || 0);
}

function pct(part, total) {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Number(((p / t) * 100).toFixed(1));
}

function alojamientoPlazasBasePipeline(filtros = {}) {
  const alojamientoMatch = {
    "alojamientoObj.activo": { $ne: false },
    "alojamientoObj.estado": { $ne: "BAJA" },
  };
  if (filtros.lugar) alojamientoMatch["alojamientoObj.lugar"] = filtros.lugar;
  if (filtros.dependencia) alojamientoMatch["alojamientoObj.dependencia"] = filtros.dependencia;
  if (filtros.sector) alojamientoMatch["alojamientoObj.sector"] = filtros.sector;

  return [
    {
      $match: {
        activo: { $ne: false },
        estado: { $ne: "BAJA" },
      },
    },
    {
      $lookup: {
        from: "alojamientonavals",
        localField: "alojamiento",
        foreignField: "_id",
        as: "alojamientoObj",
      },
    },
    { $unwind: "$alojamientoObj" },
    { $match: alojamientoMatch },
  ];
}

function alojamientoAsignacionesBasePipeline(filtros = {}) {
  const alojamientoMatch = {
    "alojamientoObj.activo": { $ne: false },
    "alojamientoObj.estado": { $ne: "BAJA" },
  };
  if (filtros.lugar) alojamientoMatch["alojamientoObj.lugar"] = filtros.lugar;
  if (filtros.dependencia) alojamientoMatch["alojamientoObj.dependencia"] = filtros.dependencia;
  if (filtros.sector) alojamientoMatch["alojamientoObj.sector"] = filtros.sector;

  return [
    {
      $lookup: {
        from: "alojamientoplazas",
        localField: "plaza",
        foreignField: "_id",
        as: "plazaObj",
      },
    },
    { $unwind: "$plazaObj" },
    {
      $lookup: {
        from: "alojamientonavals",
        localField: "alojamiento",
        foreignField: "_id",
        as: "alojamientoObj",
      },
    },
    { $unwind: "$alojamientoObj" },
    {
      $match: {
        "plazaObj.activo": { $ne: false },
        "plazaObj.estado": { $ne: "BAJA" },
        ...alojamientoMatch,
      },
    },
  ];
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
          $let: {
            vars: {
              adultos: { $ifNull: ["$md.datos.cantidadAdultos", 0] },
              hijos: { $ifNull: ["$md.datos.cantidadHijos", 0] },
              convivientes: "$md.datos.convivientes",
            },
            in: {
              $cond: [
                { $gt: [{ $add: ["$$adultos", "$$hijos"] }, 0] },
                { $add: ["$$adultos", "$$hijos"] },
                {
                  $cond: [
                    { $isArray: "$$convivientes" },
                    { $add: [1, { $size: "$$convivientes" }] },
                    { $ifNull: ["$cantidadHabitantes", 1] },
                  ],
                },
              ],
            },
          },
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

async function buildAlojamientosStats(req) {
  const year = getRequestedYear(req);
  const desde = new Date(year, 0, 1);
  const hasta = new Date(year + 1, 0, 1);
  const filtros = alojamientoStatsFilters(req.query || {});
  const alojamientoMatch = applyAlojamientoFiltros(
    {
      activo: { $ne: false },
      estado: { $ne: "BAJA" },
    },
    filtros
  );

  const plazasPipeline = alojamientoPlazasBasePipeline(filtros);
  const asignacionesPipeline = alojamientoAsignacionesBasePipeline(filtros);

  const [
    alojamientosActivos,
    alojamientosConPlazasRows,
    alojamientosSinPlazasRows,
    plazasStats,
    asignacionStats,
    documentosStats,
    plazasOcupadasSinAsignacionRows,
    asignacionesActivasPlazaNoOcupadaRows,
  ] = await Promise.all([
    AlojamientoNaval.countDocuments(alojamientoMatch),
    AlojamientoPlaza.aggregate([
      ...plazasPipeline,
      { $group: { _id: "$alojamiento" } },
      { $count: "cantidad" },
    ]),
    AlojamientoNaval.aggregate([
      { $match: alojamientoMatch },
      {
        $lookup: {
          from: "alojamientoplazas",
          let: { alojamientoId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$alojamiento", "$$alojamientoId"] },
                activo: { $ne: false },
                estado: { $ne: "BAJA" },
              },
            },
            { $limit: 1 },
          ],
          as: "plazasValidas",
        },
      },
      { $match: { plazasValidas: { $size: 0 } } },
      { $count: "cantidad" },
    ]),
    AlojamientoPlaza.aggregate([
      ...plazasPipeline,
      {
        $facet: {
          total: [{ $count: "cantidad" }],
          porEstado: [
            { $group: { _id: { $ifNull: ["$estado", "SIN_ESTADO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          porLugar: [
            { $group: { _id: { $ifNull: ["$alojamientoObj.lugar", "SIN_DATO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          ocupacionPorLugar: [
            {
              $group: {
                _id: { $ifNull: ["$alojamientoObj.lugar", "SIN_DATO"] },
                plazas: { $sum: 1 },
                libres: { $sum: { $cond: [{ $eq: ["$estado", "LIBRE"] }, 1, 0] } },
                ocupadas: { $sum: { $cond: [{ $eq: ["$estado", "OCUPADA"] }, 1, 0] } },
                reservadas: { $sum: { $cond: [{ $eq: ["$estado", "RESERVADA"] }, 1, 0] } },
                fueraServicio: {
                  $sum: { $cond: [{ $in: ["$estado", ["MANTENIMIENTO", "INHABILITADA"]] }, 1, 0] },
                },
              },
            },
            { $sort: { plazas: -1, _id: 1 } },
          ],
          porDependencia: [
            { $group: { _id: { $ifNull: ["$alojamientoObj.dependencia", "SIN_DATO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          porSector: [
            { $group: { _id: { $ifNull: ["$alojamientoObj.sector", "SIN_DATO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          porTipo: [
            { $group: { _id: { $ifNull: ["$alojamientoObj.tipo", "SIN_DATO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          porClase: [
            { $group: { _id: { $ifNull: ["$alojamientoObj.clase", "SIN_DATO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
        },
      },
    ]),
    AsignacionAlojamiento.aggregate([
      ...asignacionesPipeline,
      {
        $facet: {
          activas: [{ $match: { estado: "ACTIVA" } }, { $count: "cantidad" }],
          reservadas: [{ $match: { estado: "RESERVADA" } }, { $count: "cantidad" }],
          finalizadasYear: [
            { $match: { estado: "FINALIZADA", updatedAt: { $gte: desde, $lt: hasta } } },
            { $count: "cantidad" },
          ],
          anuladasYear: [
            { $match: { estado: "ANULADA", updatedAt: { $gte: desde, $lt: hasta } } },
            { $count: "cantidad" },
          ],
          evolucionMensual: [
            { $match: { createdAt: { $gte: desde, $lt: hasta } } },
            { $group: { _id: { $month: "$createdAt" }, cantidad: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),
    AlojamientoDocumento.aggregate([
      {
        $match: {
          activo: { $ne: false },
          codigo: { $in: ["ANEXO_21", "ANEXO_22"] },
          createdAt: { $gte: desde, $lt: hasta },
        },
      },
      {
        $facet: {
          anexo21Presentados: [
            { $match: { codigo: "ANEXO_21", estado: { $ne: "BORRADOR" } } },
            { $count: "cantidad" },
          ],
          anexo22Generados: [
            { $match: { codigo: "ANEXO_22" } },
            { $count: "cantidad" },
          ],
          porTipo: [
            { $group: { _id: "$codigo", cantidad: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          porEstado: [
            { $group: { _id: { $ifNull: ["$estado", "SIN_ESTADO"] }, cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1, _id: 1 } },
          ],
          evolucionMensual: [
            { $group: { _id: { $month: "$createdAt" }, cantidad: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),
    AlojamientoPlaza.aggregate([
      ...plazasPipeline,
      { $match: { estado: "OCUPADA" } },
      {
        $lookup: {
          from: "asignacionalojamientos",
          let: { plazaId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$plaza", "$$plazaId"] }, estado: "ACTIVA" } },
            { $limit: 1 },
          ],
          as: "asignacionActiva",
        },
      },
      { $match: { asignacionActiva: { $size: 0 } } },
      { $count: "cantidad" },
    ]),
    AsignacionAlojamiento.aggregate([
      ...asignacionesPipeline,
      { $match: { estado: "ACTIVA", "plazaObj.estado": { $ne: "OCUPADA" } } },
      { $count: "cantidad" },
    ]),
  ]);

  const plazaFacet = plazasStats?.[0] || {};
  const asignacionFacet = asignacionStats?.[0] || {};
  const documentoFacet = documentosStats?.[0] || {};
  const plazasPorEstado = plazaFacet.porEstado || [];
  const plazasLibres = countFrom(plazasPorEstado, "LIBRE");
  const plazasOcupadas = countFrom(plazasPorEstado, "OCUPADA");
  const plazasReservadas = countFrom(plazasPorEstado, "RESERVADA");
  const plazasMantenimiento = countFrom(plazasPorEstado, "MANTENIMIENTO");
  const plazasInhabilitadas = countFrom(plazasPorEstado, "INHABILITADA");
  const plazasFueraServicio = plazasMantenimiento + plazasInhabilitadas;
  const plazasTotal = Number(plazaFacet.total?.[0]?.cantidad || 0);
  const plazasUtiles = plazasLibres + plazasOcupadas + plazasReservadas;
  const anexo21Presentados = Number(documentoFacet.anexo21Presentados?.[0]?.cantidad || 0);
  const anexo22Generados = Number(documentoFacet.anexo22Generados?.[0]?.cantidad || 0);
  const brecha = Math.max(0, anexo21Presentados - anexo22Generados);

  return {
    year,
    filtros: {
      lugar: filtros.lugar || "TODOS",
      dependencia: filtros.dependencia || "TODOS",
      sector: filtros.sector || "TODOS",
    },
    resumen: {
      alojamientosActivos: Number(alojamientosActivos || 0),
      alojamientosConPlazas: Number(alojamientosConPlazasRows?.[0]?.cantidad || 0),
      alojamientosActivosSinPlazas: Number(alojamientosSinPlazasRows?.[0]?.cantidad || 0),
      plazasTotal,
      plazasLibres,
      plazasOcupadas,
      plazasReservadas,
      plazasMantenimiento,
      plazasInhabilitadas,
      plazasFueraServicio,
      plazasUtiles,
      ocupacionPct: pct(plazasOcupadas, plazasUtiles),
      disponibilidadPct: pct(plazasLibres, plazasUtiles),
    },
    plazasPorEstado,
    plazasPorLugar: plazaFacet.porLugar || [],
    ocupacionPorLugar: (plazaFacet.ocupacionPorLugar || []).map((row) => ({
      _id: row._id || "SIN_DATO",
      plazas: Number(row.plazas || 0),
      libres: Number(row.libres || 0),
      ocupadas: Number(row.ocupadas || 0),
      reservadas: Number(row.reservadas || 0),
      fueraServicio: Number(row.fueraServicio || 0),
      ocupacionPct: pct(row.ocupadas, Number(row.libres || 0) + Number(row.ocupadas || 0) + Number(row.reservadas || 0)),
    })),
    plazasPorDependencia: plazaFacet.porDependencia || [],
    plazasPorSector: plazaFacet.porSector || [],
    plazasPorTipo: plazaFacet.porTipo || [],
    plazasPorClase: plazaFacet.porClase || [],
    asignaciones: {
      activas: Number(asignacionFacet.activas?.[0]?.cantidad || 0),
      reservadas: Number(asignacionFacet.reservadas?.[0]?.cantidad || 0),
      finalizadasYear: Number(asignacionFacet.finalizadasYear?.[0]?.cantidad || 0),
      anuladasYear: Number(asignacionFacet.anuladasYear?.[0]?.cantidad || 0),
      evolucionMensual: monthRows(asignacionFacet.evolucionMensual),
    },
    documentos: {
      anexo21Presentados,
      anexo22Generados,
      brecha,
      tasaDerivacion: pct(anexo22Generados, anexo21Presentados),
      porTipo: documentoFacet.porTipo || [],
      porEstado: documentoFacet.porEstado || [],
      evolucionMensual: monthRows(documentoFacet.evolucionMensual),
    },
    inconsistencias: {
      plazasOcupadasSinAsignacionActiva: Number(plazasOcupadasSinAsignacionRows?.[0]?.cantidad || 0),
      asignacionesActivasSobrePlazaNoOcupada: Number(asignacionesActivasPlazaNoOcupadaRows?.[0]?.cantidad || 0),
      alojamientosActivosSinPlazas: Number(alojamientosSinPlazasRows?.[0]?.cantidad || 0),
    },
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

exports.getAlojamientosStats = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const data = await buildAlojamientosStats(req);
    return res.json(data);
  } catch (e) {
    console.error("[STATS] alojamientos", e);
    return deny(res);
  }
};
