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
        accionTexto: item.accionTexto || "",
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
      },
    }),
  ];
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
    FormSubmission.countDocuments({ estado: { $in: ["ENVIADO", "EN_REVISION", "ASIGNADO"] } }),
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
    Liquidacion.countDocuments({ estadoEntrega: { $ne: "ENTREGADA" } }),
  ]);

  return [
    gestiones > 0 &&
      alerta({
        id: "admin-general:gestiones-abiertas",
        tipo: "SEGUIMIENTO",
        modulo: "GESTIONES",
        prioridad: "MEDIA",
        titulo: "Gestiones documentales abiertas",
        descripcion: "Hay formularios o anexos en estado ENVIADO, EN_REVISION o ASIGNADO.",
        accionUrl: "/app/admin-general/gestiones",
        entidadTipo: "FormSubmission",
        cantidad: gestiones,
        requiereAccion: true,
        metadata: { estados: ["ENVIADO", "EN_REVISION", "ASIGNADO"] },
      }),
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
        metadata: { adminDecision: "PENDIENTE", isClosed: false },
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
        metadata: { requiereAdministracion: true },
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
        metadata: { estado: "PENDIENTE_CONFIRMACION" },
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
        requiereAccion: true,
        metadata: { estado: "FALLIDO" },
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
        metadata: { role: "POSTULANTE", activo: false },
      }),
    liquidacionesPendientes > 0 &&
      alerta({
        id: "admin-general:liquidaciones-pendientes-entrega",
        tipo: "SEGUIMIENTO",
        modulo: "LIQUIDACIONES",
        prioridad: "MEDIA",
        titulo: "Liquidaciones pendientes de entrega",
        descripcion: "Hay liquidaciones persistidas con estado de entrega pendiente o con error.",
        accionUrl: "/app/admin-general/liquidaciones",
        entidadTipo: "Liquidacion",
        cantidad: liquidacionesPendientes,
        requiereAccion: true,
        metadata: { estadoEntrega: "NO_ENTREGADA" },
      }),
  ].filter(Boolean);
}

async function collectAdmin() {
  const [servicios, gestiones, liquidacionesPendientes] = await Promise.all([
    ServicioVivienda.countDocuments({ requiereAdministracion: true, alertaActiva: { $ne: false } }),
    FormSubmission.countDocuments({ estado: { $in: ["ENVIADO", "EN_REVISION", "ASIGNADO"] } }),
    Liquidacion.countDocuments({ estadoEntrega: { $ne: "ENTREGADA" } }),
  ]);

  return [
    servicios > 0 &&
      alerta({
        id: "admin:servicios-pendientes",
        tipo: "SEGUIMIENTO",
        modulo: "SERVICIOS",
        prioridad: "MEDIA",
        titulo: "Servicios con seguimiento administrativo",
        descripcion: "Hay registros de servicios que requieren revision administrativa.",
        accionUrl: "/app/admin/servicios",
        entidadTipo: "ServicioVivienda",
        cantidad: servicios,
        requiereAccion: false,
        metadata: { requiereAdministracion: true },
      }),
    gestiones > 0 &&
      alerta({
        id: "admin:gestiones-abiertas",
        tipo: "SEGUIMIENTO",
        modulo: "GESTIONES",
        prioridad: "MEDIA",
        titulo: "Gestiones documentales abiertas",
        descripcion: "Hay formularios o anexos abiertos para seguimiento.",
        accionUrl: "/app/admin/gestiones",
        entidadTipo: "FormSubmission",
        cantidad: gestiones,
        requiereAccion: false,
        metadata: { estados: ["ENVIADO", "EN_REVISION", "ASIGNADO"] },
      }),
    liquidacionesPendientes > 0 &&
      alerta({
        id: "admin:liquidaciones-pendientes-entrega",
        tipo: "SEGUIMIENTO",
        modulo: "LIQUIDACIONES",
        prioridad: "MEDIA",
        titulo: "Liquidaciones pendientes de entrega",
        descripcion: "Hay liquidaciones persistidas con estado de entrega pendiente o con error.",
        accionUrl: "/app/admin/liquidaciones",
        entidadTipo: "Liquidacion",
        cantidad: liquidacionesPendientes,
        requiereAccion: false,
        metadata: { estadoEntrega: "NO_ENTREGADA" },
      }),
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
