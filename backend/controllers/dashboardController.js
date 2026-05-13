// backend/controllers/dashboardController.js

const Vivienda = require("../models/vivienda");
const { FormSubmission } = require("../models/FormSubmission");
const User = require("../models/user");
const Mensaje = require("../models/Mensaje");
const { Mantenimiento } = require("../models/Mantenimiento");

const MIS_DATOS_COLL = "misdatosdeclaradosupdates";

const ANEXO11_ABIERTOS_INST = [
  "TAREA_PENDIENTE_PROGRAMACION",
  "TAREA_PENDIENTE_CONFIRMACION_PERM",
  "TAREA_CONFIRMADA",
  "CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM",
  "EN_REVISION_ADMIN_GENERAL",
  "DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL",
];

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

function countByState(rows = []) {
  const map = {};
  for (const row of rows || []) {
    map[up(row?._id) || "SIN_ESTADO"] = Number(row?.cantidad || 0);
  }
  return map;
}

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

function alertItem(tipo, prioridad, cantidad, texto, ruta) {
  return { tipo, prioridad, cantidad: Number(cantidad || 0), texto, ruta };
}

function pendingItem(titulo, cantidad, ruta, detalle = "") {
  return { titulo, cantidad: Number(cantidad || 0), ruta, detalle };
}

function toDate(v) {
  const d = new Date(v || 0);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function formTitle(f) {
  const codigo = String(f?.codigo || "Formulario");
  const estado = String(f?.estado || "SIN_ESTADO");
  return `${codigo} - ${estado}`;
}

function formDetail(f) {
  const d = f?.datos || {};
  return String(
    d.permisionarioNombre ||
      d.postulanteNombre ||
      d.postulanteLabel ||
      d.viviendaCodigo ||
      d.viviendaLabel ||
      d.unidadHabitacional ||
      "Gestion documental"
  ).trim();
}

exports.getAdminGeneralDashboard = async (req, res) => {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const userId = req.user?._id;

    const [
      viviendasTotal,
      viviendasPorEstado,
      hacRojoRows,
      anexo11Abiertos,
      gestionesPendientes,
      mantenimientosAbiertos,
      mantenimientosPendientesAdmin,
      usuariosPendientes,
      mensajesNoLeidos,
      formulariosRecientes,
      mantenimientosRecientes,
      mensajesRecientes,
    ] = await Promise.all([
      Vivienda.countDocuments({}),
      Vivienda.aggregate([{ $group: { _id: "$estado", cantidad: { $sum: 1 } } }]),
      Vivienda.aggregate([
        ...hacinamientoPipelineBase({}),
        { $match: { hacinamiento: "ROJO" } },
        { $count: "cantidad" },
      ]),
      FormSubmission.countDocuments({
        codigo: "ANEXO_11",
        $or: [
          { estadoInstitucional: { $in: ANEXO11_ABIERTOS_INST } },
          { estado: { $in: ["ENVIADO", "EN_REVISION", "ASIGNADO"] } },
        ],
      }),
      FormSubmission.countDocuments({
        estado: { $in: ["ENVIADO", "EN_REVISION", "ASIGNADO"] },
      }),
      Mantenimiento.countDocuments({ isClosed: false }),
      Mantenimiento.countDocuments({ isClosed: false, adminDecision: "PENDIENTE" }),
      User.countDocuments({ role: "PENDIENTE", archivado: { $ne: true } }),
      userId
        ? Mensaje.countDocuments({
            $or: [{ para: userId }, { destinatarios: userId }],
            leidoPor: { $ne: userId },
          })
        : 0,
      FormSubmission.find({})
        .select("codigo estado estadoInstitucional datos updatedAt createdAt")
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .limit(8)
        .lean(),
      Mantenimiento.find({})
        .select(
          "viviendaDisplay permisionarioDisplay tipoMantenimiento adminDecision inspectorDecision isClosed submittedAt updatedAt"
        )
        .sort({ updatedAt: -1, submittedAt: -1, _id: -1 })
        .limit(5)
        .lean(),
      userId
        ? Mensaje.find({ $or: [{ para: userId }, { destinatarios: userId }] })
            .select("asunto creadoEn")
            .sort({ creadoEn: -1, _id: -1 })
            .limit(5)
            .lean()
        : [],
    ]);

    const estados = countByState(viviendasPorEstado);
    const viviendasReparacion = estados.REPARACION || 0;
    const hacinamientoRojo = Number(hacRojoRows?.[0]?.cantidad || 0);

    const resumen = {
      viviendas: {
        total: Number(viviendasTotal || 0),
        disponibles: estados.DISPONIBLE || 0,
        ocupadas: estados.OCUPADA || 0,
        reservadas: estados.RESERVADA || 0,
        reparacion: viviendasReparacion,
        hacinamientoRojo,
      },
      formularios: {
        gestionesPendientes,
        anexo11Abiertos,
      },
      mantenimientos: {
        abiertos: mantenimientosAbiertos,
        pendientesAdmin: mantenimientosPendientesAdmin,
      },
      usuarios: {
        pendientes: usuariosPendientes,
      },
      mensajes: {
        noLeidos: mensajesNoLeidos,
      },
    };

    const alertas = [
      hacinamientoRojo > 0
        ? alertItem(
            "HACINAMIENTO",
            "ALTA",
            hacinamientoRojo,
            "Viviendas con hacinamiento critico requieren seguimiento.",
            "/app/admin-general/viviendas"
          )
        : null,
      viviendasReparacion > 0
        ? alertItem(
            "VIVIENDAS",
            "MEDIA",
            viviendasReparacion,
            "Viviendas en reparacion registradas en stock actual.",
            "/app/admin-general/viviendas"
          )
        : null,
      anexo11Abiertos > 0
        ? alertItem(
            "ANEXO_11",
            "ALTA",
            anexo11Abiertos,
            "Pedidos de trabajo abiertos o en intervencion.",
            "/app/admin-general/gestiones"
          )
        : null,
      gestionesPendientes > 0
        ? alertItem(
            "GESTIONES",
            "MEDIA",
            gestionesPendientes,
            "Gestiones documentales abiertas pendientes de seguimiento.",
            "/app/admin-general/gestiones"
          )
        : null,
      mantenimientosPendientesAdmin > 0
        ? alertItem(
            "MANTENIMIENTOS",
            "MEDIA",
            mantenimientosPendientesAdmin,
            "Solicitudes de mantenimiento pendientes de decision administrativa.",
            "/app/admin-general/mantenimientos"
          )
        : null,
      usuariosPendientes > 0
        ? alertItem(
            "USUARIOS",
            "ALTA",
            usuariosPendientes,
            "Registros de usuarios pendientes de aprobacion.",
            "/app/admin-general/registros"
          )
        : null,
      mensajesNoLeidos > 0
        ? alertItem(
            "MENSAJES",
            "MEDIA",
            mensajesNoLeidos,
            "Mensajes institucionales sin leer.",
            "/app/admin-general/mensajeria"
          )
        : null,
    ].filter(Boolean);

    const pendientes = [
      pendingItem("Gestiones abiertas", gestionesPendientes, "/app/admin-general/gestiones"),
      pendingItem("ANEXO_11 abiertos", anexo11Abiertos, "/app/admin-general/gestiones"),
      pendingItem(
        "Mantenimientos pendientes",
        mantenimientosPendientesAdmin,
        "/app/admin-general/mantenimientos"
      ),
      pendingItem("Registros pendientes", usuariosPendientes, "/app/admin-general/registros"),
      pendingItem("Mensajes sin leer", mensajesNoLeidos, "/app/admin-general/mensajeria"),
    ].filter((item) => item.cantidad > 0);

    const actividadReciente = [
      ...(formulariosRecientes || []).map((f) => ({
        tipo: "FORMULARIO",
        titulo: formTitle(f),
        detalle: formDetail(f),
        fecha: f.updatedAt || f.createdAt,
        ruta: f?._id ? `/app/admin-general/gestiones/${f._id}` : "/app/admin-general/gestiones",
      })),
      ...(mantenimientosRecientes || []).map((m) => ({
        tipo: "MANTENIMIENTO",
        titulo: m.isClosed ? "Mantenimiento cerrado" : "Mantenimiento abierto",
        detalle: `${m.viviendaDisplay || "Vivienda"} - ${m.permisionarioDisplay || "Permisionario"}`,
        fecha: m.updatedAt || m.submittedAt,
        ruta: "/app/admin-general/mantenimientos",
      })),
      ...(mensajesRecientes || []).map((m) => ({
        tipo: "MENSAJE",
        titulo: "Mensaje institucional",
        detalle: m.asunto || "Sin asunto",
        fecha: m.creadoEn,
        ruta: "/app/admin-general/mensajeria",
      })),
    ]
      .sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime())
      .slice(0, 15);

    return res.json({
      generatedAt: new Date().toISOString(),
      resumen,
      alertas,
      pendientes,
      actividadReciente,
    });
  } catch (e) {
    console.error("[DASHBOARD_ADMIN_GENERAL]", e);
    return deny(res);
  }
};
