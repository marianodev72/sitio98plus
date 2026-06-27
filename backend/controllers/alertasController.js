const { FormSubmission } = require("../models/FormSubmission");
const { Liquidacion } = require("../models/Liquidacion");
const { Mantenimiento } = require("../models/Mantenimiento");
const Mensaje = require("../models/Mensaje");
const { MasterImportJob } = require("../models/MasterImportJob");
const { Notificacion } = require("../models/Notificacion");
const { ServicioVivienda } = require("../models/ServicioVivienda");
const { User } = require("../models/user");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isRole(user, role) {
  return up(user?.role) === role;
}

function hasPermiso(user, permiso) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map(up).includes(up(permiso));
}

function hasTerritorioLugar(user) {
  const list = Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento
    : [];
  return list.some((item) => up(item?.tipo) === "LUGAR" && String(item?.valor || "").trim());
}

function mensajeriaUrl(user) {
  const role = up(user?.role);

  if (role === "ADMIN_GENERAL") return "/app/admin-general/mensajeria";
  if (role === "ADMIN") return "/app/admin/mensajeria";
  if (role === "ALOJADO") return "/app/alojado/comunicaciones";

  if (role === "INSPECTOR_ALOJAMIENTOS" || hasPermiso(user, "INSPECTOR_ALOJAMIENTOS")) {
    return hasTerritorioLugar(user)
      ? "/app/permisionario/alojamientos-inspector/comunicaciones"
      : null;
  }

  if (role === "PERMISIONARIO") {
    if (hasPermiso(user, "JEFE_DE_BARRIO")) return "/app/permisionario/mi-barrio-jefe/mensajeria";
    if (hasPermiso(user, "INSPECTOR")) return "/app/permisionario/mi-barrio-inspector/mensajeria";
    return "/app/permisionario/comunicaciones";
  }

  return null;
}

function prioridadNotificacion(value) {
  const p = up(value);
  if (p === "CRITICA") return "CRITICA";
  if (p === "IMPORTANTE") return "ALTA";
  return "INFO";
}

function alerta({
  id,
  tipo,
  modulo,
  prioridad,
  titulo,
  descripcion,
  accionUrl = null,
  entidadTipo = null,
  entidadId = null,
  cantidad = 1,
  requiereAccion = false,
  requiereLectura = false,
  requiereConfirmacion = false,
  metadata = {},
}) {
  return {
    id: String(id),
    tipo,
    modulo,
    prioridad,
    titulo,
    descripcion,
    accionUrl: accionUrl || null,
    entidadTipo,
    entidadId: entidadId ? String(entidadId) : null,
    cantidad: Number(cantidad || 0),
    requiereAccion: Boolean(requiereAccion),
    requiereLectura: Boolean(requiereLectura),
    requiereConfirmacion: Boolean(requiereConfirmacion),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };
}

function isTerminalEstado(estado) {
  return ["CERRADO", "ASIGNADO", "RECHAZADO"].includes(up(estado));
}

function isAnexo01Aprobado(anexo) {
  const estado = up(anexo?.estado);
  const estadoInstitucional = up(anexo?.estadoInstitucional);
  const resultado = up(anexo?.datos?.resultadoPostulacion);
  return (
    estado === "APROBADO" ||
    estadoInstitucional === "APROBADO_ADMIN_GENERAL" ||
    resultado === "APROBADO"
  );
}

function isAnexo01Rechazado(anexo) {
  const estado = up(anexo?.estado);
  const estadoInstitucional = up(anexo?.estadoInstitucional);
  const resultado = up(anexo?.datos?.resultadoPostulacion);
  return (
    estado === "RECHAZADO" ||
    estadoInstitucional === "RECHAZADO_ADMIN_GENERAL" ||
    resultado === "RECHAZADO"
  );
}

async function anexo01IdsConAnexo02Derivado(anexo01Ids) {
  const ids = Array.isArray(anexo01Ids) ? anexo01Ids.filter(Boolean) : [];
  if (!ids.length) return new Set();

  const idsAsString = ids.map((id) => String(id));
  const derivados = await FormSubmission.find({
    codigo: "ANEXO_02",
    $or: [
      { derivadoDe: { $in: ids } },
      { "datos.anexo01Id": { $in: idsAsString } },
    ],
  })
    .select("derivadoDe datos.anexo01Id")
    .lean();

  const set = new Set();
  for (const item of derivados) {
    if (item?.derivadoDe) set.add(String(item.derivadoDe));
    if (item?.datos?.anexo01Id) set.add(String(item.datos.anexo01Id));
  }
  return set;
}

async function countAnexo01ByPredicate(predicate) {
  const anexos = await FormSubmission.find({ codigo: "ANEXO_01" })
    .select("_id estado estadoInstitucional datos.resultadoPostulacion")
    .lean();

  const derivados = await anexo01IdsConAnexo02Derivado(anexos.map((item) => item._id));
  return anexos.filter((item) => predicate(item, derivados)).length;
}

function adminGeneralGestionAlerta({ id, titulo, descripcion, cantidad, prioridad = "ALTA", accionTexto }) {
  if (cantidad <= 0) return null;
  return alerta({
    id,
    tipo: "ACCION",
    modulo: "GESTIONES",
    prioridad,
    titulo,
    descripcion,
    accionUrl: "/app/admin-general/gestiones",
    entidadTipo: "FormSubmission",
    cantidad,
    requiereAccion: true,
    metadata: { accionTexto },
  });
}

async function collectGestionesAdminGeneral() {
  const [
    anexo01Decision,
    anexo01GenerarAnexo02,
    anexo02Cierre,
    anexo03Cierre,
    anexo07Cierre,
    anexo08Cierre,
    anexo09Cierre,
    anexo11Revision,
  ] = await Promise.all([
    countAnexo01ByPredicate((item, derivados) => {
      if (derivados.has(String(item._id))) return false;
      if (isTerminalEstado(item.estado)) return false;
      if (isAnexo01Aprobado(item) || isAnexo01Rechazado(item)) return false;
      return true;
    }),
    countAnexo01ByPredicate((item, derivados) => {
      if (derivados.has(String(item._id))) return false;
      if (isTerminalEstado(item.estado)) return false;
      return isAnexo01Aprobado(item);
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_02",
      estado: "EN_REVISION",
      $or: [
        { "conformidadPostulante.ok": true },
        { "datos.conformidadPostulante.ok": true },
      ],
      "datos.conformidadAdminGeneral.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_03",
      estado: "EN_REVISION",
      "datos.conformidadPermisionario.ok": true,
      "datos.conformidadAdminGeneral.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_07",
      estado: { $in: ["ENVIADO", "EN_REVISION"] },
      "datos.conformidadAdminGeneral.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_08",
      estado: "EN_REVISION",
      "datos.conformidadPermisionario.ok": true,
      "datos.conformidadAdminGeneral.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_09",
      estado: "EN_REVISION",
      "datos.conformidadPermisionario.ok": true,
      "datos.conformidadAdminGeneral.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      estadoInstitucional: "EN_REVISION_ADMIN_GENERAL",
    }),
  ]);

  return [
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-01-decision",
      titulo: "ANEXO_01 pendientes de decision",
      descripcion: "Hay postulaciones ANEXO_01 sin decision administrativa y sin ANEXO_02 derivado.",
      cantidad: anexo01Decision,
      accionTexto: "Revisar",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-01-generar-anexo-02",
      titulo: "ANEXO_01 aprobados sin ANEXO_02",
      descripcion: "Hay postulaciones aprobadas que todavia no tienen ANEXO_02 generado.",
      cantidad: anexo01GenerarAnexo02,
      prioridad: "MEDIA",
      accionTexto: "Generar ANEXO_02",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-02-cierre",
      titulo: "ANEXO_02 listos para cierre admin",
      descripcion: "Hay ANEXO_02 con conformidad del postulante y cierre administrativo pendiente.",
      cantidad: anexo02Cierre,
      accionTexto: "Revisar cierre",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-03-cierre",
      titulo: "ANEXO_03 listos para cierre admin",
      descripcion: "Hay ANEXO_03 con conformidades previas registradas y cierre administrativo pendiente.",
      cantidad: anexo03Cierre,
      accionTexto: "Revisar cierre",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-07-cierre",
      titulo: "ANEXO_07 pendientes de revision admin",
      descripcion: "Hay ANEXO_07 enviados por el flujo inspector y pendientes de cierre administrativo.",
      cantidad: anexo07Cierre,
      prioridad: "MEDIA",
      accionTexto: "Revisar",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-08-cierre",
      titulo: "ANEXO_08 listos para cierre admin",
      descripcion: "Hay ANEXO_08 con conformidad del permisionario y cierre administrativo pendiente.",
      cantidad: anexo08Cierre,
      accionTexto: "Revisar cierre",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-09-cierre",
      titulo: "ANEXO_09 listos para cierre admin",
      descripcion: "Hay ANEXO_09 con conformidad del permisionario y cierre administrativo pendiente.",
      cantidad: anexo09Cierre,
      accionTexto: "Revisar cierre",
    }),
    adminGeneralGestionAlerta({
      id: "admin-general:anexo-11-revision-admin",
      titulo: "ANEXO_11 en revision administrativa",
      descripcion: "Hay pedidos de trabajo ANEXO_11 cuyo actor esperado es ADMIN_GENERAL.",
      cantidad: anexo11Revision,
      prioridad: "MEDIA",
      accionTexto: "Revisar",
    }),
  ].filter(Boolean);
}

async function collectGestionesAdmin() {
  const anexo11Seguimiento = await FormSubmission.countDocuments({
    codigo: "ANEXO_11",
    estadoInstitucional: "EN_REVISION_ADMIN_GENERAL",
  });

  if (anexo11Seguimiento <= 0) return [];
  return [
    alerta({
      id: "admin:gestiones-seguimiento-anexo-11",
      tipo: "SEGUIMIENTO",
      modulo: "GESTIONES",
      prioridad: "INFO",
      titulo: "Gestiones ANEXO_11 para seguimiento",
      descripcion: "Hay ANEXO_11 en revision administrativa disponibles para seguimiento institucional.",
      accionUrl: "/app/admin/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: anexo11Seguimiento,
      requiereAccion: false,
      metadata: { accionTexto: "Ver" },
    }),
  ];
}
async function collectNotificaciones(user) {
  const uid = user?._id;
  if (!uid) return [];

  const items = await Notificacion.find({
    usuario: uid,
    $or: [
      { leida: { $ne: true } },
      { requiereConfirmacion: true, confirmada: { $ne: true } },
    ],
  })
    .sort({
      prioridad: -1,
      requiereConfirmacion: -1,
      createdAt: -1,
    })
    .limit(20)
    .lean();

  return items.map((item) =>
    alerta({
      id: `notificacion:${item._id}`,
      tipo: "NOTIFICACION",
      modulo: "NOTIFICACIONES",
      prioridad: prioridadNotificacion(item.prioridad),
      titulo: item.titulo || "Notificacion pendiente",
      descripcion: item.mensaje || "Tiene una notificacion institucional pendiente.",
      accionUrl: item.accionUrl || null,
      entidadTipo: item.entidadTipo || "Notificacion",
      entidadId: item.entidadId || item._id,
      cantidad: 1,
      requiereAccion: Boolean(item.accionUrl),
      requiereLectura: true,
      requiereConfirmacion: Boolean(item.requiereConfirmacion || item.prioridad === "CRITICA"),
      metadata: {
        notificacionId: String(item._id),
        accionTexto: item.accionTexto || "Ver",
        prioridadOriginal: item.prioridad || "INFO",
        tipoOriginal: item.tipo || "",
      },
    })
  );
}

async function collectMensajes(user) {
  const uid = user?._id;
  if (!uid) return [];

  const total = await Mensaje.countDocuments({
    $or: [{ para: uid }, { destinatarios: uid }],
    leidoPor: { $ne: uid },
  });

  if (total <= 0) return [];

  return [
    alerta({
      id: "mensajes:no-leidos",
      tipo: "LECTURA",
      modulo: "MENSAJES",
      prioridad: "MEDIA",
      titulo: "Mensajes sin leer",
      descripcion: `Tiene ${total} mensaje(s) institucional(es) pendiente(s) de lectura.`,
      accionUrl: mensajeriaUrl(user),
      entidadTipo: "Mensaje",
      cantidad: total,
      requiereLectura: true,
      metadata: {
        rutaConfiable: Boolean(mensajeriaUrl(user)),
        accionTexto: "Leer",
      },
    }),
  ];
}

async function collectLiquidacionesPendientes({ accionUrl, adminGeneral }) {
  const now = new Date();
  const min = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const minPeriodo = `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, "0")}`;

  const rows = await Liquidacion.aggregate([
    {
      $match: {
        periodo: { $gte: minPeriodo },
        estadoEntrega: { $ne: "ENTREGADA" },
      },
    },
    { $group: { _id: "$estadoEntrega", cantidad: { $sum: 1 } } },
  ]);

  const total = rows.reduce((acc, row) => acc + Number(row?.cantidad || 0), 0);
  if (total <= 0) return null;

  const detalle = rows
    .map((row) => `${row?._id || "SIN_ESTADO"}: ${Number(row?.cantidad || 0)}`)
    .join("; ");

  return alerta({
    id: adminGeneral ? "admin-general:liquidaciones-pendientes-entrega" : "admin:liquidaciones-pendientes-entrega",
    tipo: "SEGUIMIENTO",
    modulo: "LIQUIDACIONES",
    prioridad: adminGeneral ? "MEDIA" : "INFO",
    titulo: "Liquidaciones pendientes de entrega",
    descripcion: `Hay liquidaciones de los ultimos 12 meses con entrega pendiente (${detalle}).`,
    accionUrl,
    entidadTipo: "Liquidacion",
    cantidad: total,
    requiereAccion: false,
    metadata: { accionTexto: "Ver", minPeriodo, estados: rows },
  });
}

async function collectAdminGeneral() {
  const [
    gestiones,
    mantenimientos,
    servicios,
    basesPendientes,
    basesFallidas,
    usuariosPendientes,
    liquidacionesPendientes,
  ] = await Promise.all([
    collectGestionesAdminGeneral(),
    Mantenimiento.countDocuments({ isClosed: false, adminDecision: "PENDIENTE" }),
    ServicioVivienda.countDocuments({ requiereAdministracion: true, alertaActiva: { $ne: false } }),
    MasterImportJob.countDocuments({ estado: "PENDIENTE_CONFIRMACION" }),
    MasterImportJob.countDocuments({ estado: "FALLIDO" }),
    User.countDocuments({
      role: "POSTULANTE",
      activo: false,
      archivado: { $ne: true },
      bloqueado: { $ne: true },
    }),
    collectLiquidacionesPendientes({ accionUrl: "/app/admin-general/liquidaciones", adminGeneral: true }),
  ]);

  return [
    ...gestiones,
    mantenimientos > 0 &&
      alerta({
        id: "admin-general:mantenimientos-admin-pendientes",
        tipo: "ACCION",
        modulo: "MANTENIMIENTOS",
        prioridad: "ALTA",
        titulo: "Mantenimientos pendientes de decision administrativa",
        descripcion: "Hay solicitudes de mantenimiento abiertas con decision administrativa pendiente.",
        accionUrl: "/app/admin-general/mantenimientos",
        entidadTipo: "Mantenimiento",
        cantidad: mantenimientos,
        requiereAccion: true,
        metadata: { adminDecision: "PENDIENTE", isClosed: false, accionTexto: "Resolver" },
      }),
    servicios > 0 &&
      alerta({
        id: "admin-general:servicios-pendientes",
        tipo: "ACCION",
        modulo: "SERVICIOS",
        prioridad: "ALTA",
        titulo: "Servicios requieren intervencion administrativa",
        descripcion: "Hay registros de servicios cargados sobre viviendas no resueltas o sin ocupacion vigente.",
        accionUrl: "/app/admin-general/servicios",
        entidadTipo: "ServicioVivienda",
        cantidad: servicios,
        requiereAccion: true,
        metadata: { requiereAdministracion: true, accionTexto: "Resolver" },
      }),
    basesPendientes > 0 &&
      alerta({
        id: "admin-general:bases-maestras-pendientes",
        tipo: "CONFIRMACION",
        modulo: "BASES_MAESTRAS",
        prioridad: "ALTA",
        titulo: "Bases maestras pendientes de confirmacion",
        descripcion: "Hay jobs de importacion esperando confirmacion institucional.",
        accionUrl: "/app/admin-general/bases-maestras",
        entidadTipo: "MasterImportJob",
        cantidad: basesPendientes,
        requiereAccion: true,
        requiereConfirmacion: true,
        metadata: { estado: "PENDIENTE_CONFIRMACION", accionTexto: "Confirmar" },
      }),
    basesFallidas > 0 &&
      alerta({
        id: "admin-general:bases-maestras-fallidas",
        tipo: "SEGUIMIENTO",
        modulo: "BASES_MAESTRAS",
        prioridad: "MEDIA",
        titulo: "Bases maestras con jobs fallidos",
        descripcion: "Hay jobs fallidos que requieren revision antes de reintentar o cancelar.",
        accionUrl: "/app/admin-general/bases-maestras",
        entidadTipo: "MasterImportJob",
        cantidad: basesFallidas,
        requiereAccion: false,
        metadata: { estado: "FALLIDO", accionTexto: "Revisar" },
      }),
    usuariosPendientes > 0 &&
      alerta({
        id: "admin-general:usuarios-pendientes",
        tipo: "ACCION",
        modulo: "USUARIOS",
        prioridad: "ALTA",
        titulo: "Registros de usuarios pendientes",
        descripcion: "Hay postulantes pendientes de aprobacion administrativa.",
        accionUrl: "/app/admin-general/registros",
        entidadTipo: "User",
        cantidad: usuariosPendientes,
        requiereAccion: true,
        metadata: { role: "POSTULANTE", activo: false, accionTexto: "Revisar" },
      }),
    liquidacionesPendientes,
  ].filter(Boolean);
}

async function collectAdmin() {
  const [servicios, gestiones, liquidacionesPendientes] = await Promise.all([
    ServicioVivienda.countDocuments({ requiereAdministracion: true, alertaActiva: { $ne: false } }),
    collectGestionesAdmin(),
    collectLiquidacionesPendientes({ accionUrl: "/app/admin/liquidaciones", adminGeneral: false }),
  ]);

  return [
    servicios > 0 &&
      alerta({
        id: "admin:servicios-pendientes",
        tipo: "SEGUIMIENTO",
        modulo: "SERVICIOS",
        prioridad: "INFO",
        titulo: "Servicios con seguimiento administrativo",
        descripcion: "Hay registros de servicios que requieren revision administrativa.",
        accionUrl: "/app/admin/servicios",
        entidadTipo: "ServicioVivienda",
        cantidad: servicios,
        requiereAccion: false,
        metadata: { requiereAdministracion: true, accionTexto: "Ver" },
      }),
    ...gestiones,
    liquidacionesPendientes,
  ].filter(Boolean);
}
function prioridadPeso(item) {
  const p = up(item?.prioridad);
  if (p === "CRITICA") return 0;
  if (p === "ALTA") return 1;
  if (p === "MEDIA") return 2;
  return 3;
}

async function getPostLoginResumen(req, res) {
  try {
    const user = req.user;
    if (!user?._id) return res.status(401).json({ message: "No autenticado" });

    const base = await Promise.all([collectNotificaciones(user), collectMensajes(user)]);
    let alertas = base.flat();

    if (isRole(user, "ADMIN_GENERAL")) {
      alertas = alertas.concat(await collectAdminGeneral());
    } else if (isRole(user, "ADMIN")) {
      alertas = alertas.concat(await collectAdmin());
    }

    alertas.sort((a, b) => {
      const p = prioridadPeso(a) - prioridadPeso(b);
      if (p !== 0) return p;
      return String(a.modulo).localeCompare(String(b.modulo));
    });

    return res.json({
      total: alertas.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
      alertas,
    });
  } catch (err) {
    console.error("[ALERTAS] Error post-login resumen:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  getPostLoginResumen,
};
