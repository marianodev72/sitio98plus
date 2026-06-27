const { FormSubmission } = require("../models/FormSubmission");
const { Liquidacion } = require("../models/Liquidacion");
const { Mantenimiento } = require("../models/Mantenimiento");
const Mensaje = require("../models/Mensaje");
const { MasterImportJob } = require("../models/MasterImportJob");
const { Notificacion } = require("../models/Notificacion");
const { ServicioVivienda } = require("../models/ServicioVivienda");
const { User } = require("../models/user");

let Vivienda = null;
try {
  const viviendaModule = require("../models/vivienda");
  Vivienda = viviendaModule?.Vivienda || viviendaModule || null;
} catch (_) {}

let AlojamientoDocumento = null;
let buildFiltroTerritorialDocumento = null;
try {
  AlojamientoDocumento = require("../modules/alojamientos/models/AlojamientoDocumento");
  ({ buildFiltroTerritorialDocumento } = require("../modules/alojamientos/services/documentos/alojamientoDocumentoVisibilityService"));
} catch (_) {}

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

function getUserId(user) {
  return user?._id || null;
}

function getIdVariants(value) {
  if (!value) return [];
  return Array.from(new Set([value, String(value)]));
}

function getBarrioAsignado(user) {
  return String(user?.barrioAsignado || "").trim();
}

function userFormVinculo(user, rol = "") {
  const ids = getIdVariants(getUserId(user));
  if (!ids.length) return [];
  const or = [
    { usuario: { $in: ids } },
    { "datos.postulanteId": { $in: ids } },
    { "datos.permisionarioId": { $in: ids } },
    { "intervinientes.userId": { $in: ids } },
  ];
  if (rol) {
    or.push({
      intervinientes: {
        $elemMatch: {
          userId: { $in: ids },
          rol: up(rol),
        },
      },
    });
  }
  return or;
}

function userAlojamientoVinculo(user) {
  const ids = getIdVariants(getUserId(user));
  if (!ids.length) return [];
  return [
    { solicitante: { $in: ids } },
    { alojado: { $in: ids } },
    { creadoPor: { $in: ids } },
    { "intervinientes.userId": { $in: ids } },
  ];
}

function sinConformidadUsuario(tipo, user) {
  const ids = getIdVariants(getUserId(user));
  return {
    conformidades: {
      $not: {
        $elemMatch: {
          tipo: up(tipo),
          usuario: { $in: ids },
          ok: true,
        },
      },
    },
  };
}

function alertaAgregada({
  id,
  tipo = "ACCION",
  modulo,
  prioridad = "ALTA",
  titulo,
  descripcion,
  accionUrl,
  entidadTipo,
  cantidad,
  requiereAccion = true,
  requiereLectura = false,
  requiereConfirmacion = false,
  accionTexto = "Ver",
  metadata = {},
}) {
  if (Number(cantidad || 0) <= 0) return null;
  return alerta({
    id,
    tipo,
    modulo,
    prioridad,
    titulo,
    descripcion,
    accionUrl,
    entidadTipo,
    cantidad,
    requiereAccion,
    requiereLectura,
    requiereConfirmacion,
    metadata: { ...metadata, accionTexto },
  });
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
async function collectPostulante(user) {
  const vinculo = userFormVinculo(user, "POSTULANTE");
  const alojamientoVinculo = userAlojamientoVinculo(user);
  if (!vinculo.length) return [];

  const [anexo02Conformidad, anexo22Conformidad] = await Promise.all([
    FormSubmission.countDocuments({
      codigo: "ANEXO_02",
      estado: "ENVIADO",
      $or: vinculo,
      "conformidadPostulante.ok": { $ne: true },
      "datos.conformidadPostulante.ok": { $ne: true },
    }),
    AlojamientoDocumento && alojamientoVinculo.length
      ? AlojamientoDocumento.countDocuments({
          codigo: "ANEXO_22",
          activo: { $ne: false },
          estado: "ENVIADO",
          $or: alojamientoVinculo,
          ...sinConformidadUsuario("POSTULANTE", user),
        })
      : 0,
  ]);

  return [
    alertaAgregada({
      id: "postulante:anexo-02-conformidad",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_02 pendiente de conformidad",
      descripcion: "Tiene ANEXO_02 enviados que requieren su conformidad.",
      accionUrl: "/app/postulante/mis-anexos",
      entidadTipo: "FormSubmission",
      cantidad: anexo02Conformidad,
      requiereConfirmacion: true,
      accionTexto: "Prestar conformidad",
    }),
    alertaAgregada({
      id: "postulante:anexo-22-conformidad",
      tipo: "CONFIRMACION",
      modulo: "ALOJAMIENTOS",
      titulo: "ANEXO_22 pendiente de conformidad",
      descripcion: "Tiene ANEXO_22 de alojamientos que requieren su conformidad.",
      accionUrl: "/app/postulante/mis-anexos",
      entidadTipo: "AlojamientoDocumento",
      cantidad: anexo22Conformidad,
      requiereConfirmacion: true,
      accionTexto: "Prestar conformidad",
    }),
  ].filter(Boolean);
}

async function collectPermisionario(user) {
  const vinculo = userFormVinculo(user, "PERMISIONARIO");
  if (!vinculo.length) return [];

  const estadosPermisionario11 = [
    "VISITA_PENDIENTE_ACEPTACION_PERM",
    "TAREA_PENDIENTE_CONFIRMACION_PERM",
    "CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM",
  ];

  const [anexo03, anexos0809, a11Visita, a11Tarea, a11Cumplimiento, servicios] = await Promise.all([
    FormSubmission.countDocuments({
      codigo: "ANEXO_03",
      estado: "ENVIADO",
      $or: vinculo,
      "datos.conformidadPermisionario.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: { $in: ["ANEXO_08", "ANEXO_09"] },
      estado: "ENVIADO",
      $or: vinculo,
      "datos.conformidadPermisionario.ok": { $ne: true },
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      estadoInstitucional: estadosPermisionario11[0],
      $or: vinculo,
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      estadoInstitucional: estadosPermisionario11[1],
      $or: vinculo,
    }),
    FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      estadoInstitucional: estadosPermisionario11[2],
      $or: vinculo,
    }),
    countServiciosPropiosNoLeidos(user),
  ]);

  return [
    alertaAgregada({
      id: "permisionario:anexo-03-conformidad",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_03 pendiente de conformidad",
      descripcion: "Tiene actas ANEXO_03 enviadas que requieren su conformidad.",
      accionUrl: "/app/permisionario/anexos",
      entidadTipo: "FormSubmission",
      cantidad: anexo03,
      requiereConfirmacion: true,
      accionTexto: "Prestar conformidad",
    }),
    alertaAgregada({
      id: "permisionario:anexo-08-09-conformidad",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_08/09 pendientes de conformidad",
      descripcion: "Tiene ANEXO_08 o ANEXO_09 enviados que requieren su conformidad.",
      accionUrl: "/app/permisionario/anexos",
      entidadTipo: "FormSubmission",
      cantidad: anexos0809,
      requiereConfirmacion: true,
      accionTexto: "Prestar conformidad",
    }),
    alertaAgregada({
      id: "permisionario:anexo-11-visita",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 visita pendiente de aceptación",
      descripcion: "Tiene visitas de ANEXO_11 pendientes de aceptación.",
      accionUrl: "/app/permisionario/anexos",
      entidadTipo: "FormSubmission",
      cantidad: a11Visita,
      requiereConfirmacion: true,
      accionTexto: "Aceptar",
    }),
    alertaAgregada({
      id: "permisionario:anexo-11-tarea",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 tarea pendiente de confirmación",
      descripcion: "Tiene tareas de ANEXO_11 pendientes de confirmación.",
      accionUrl: "/app/permisionario/anexos",
      entidadTipo: "FormSubmission",
      cantidad: a11Tarea,
      requiereConfirmacion: true,
      accionTexto: "Confirmar",
    }),
    alertaAgregada({
      id: "permisionario:anexo-11-cumplimiento",
      tipo: "CONFIRMACION",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 cumplimiento pendiente de aceptación",
      descripcion: "Tiene cumplimientos de ANEXO_11 pendientes de aceptación.",
      accionUrl: "/app/permisionario/anexos",
      entidadTipo: "FormSubmission",
      cantidad: a11Cumplimiento,
      requiereConfirmacion: true,
      accionTexto: "Aceptar",
    }),
    alertaAgregada({
      id: "permisionario:servicios-no-leidos",
      tipo: "LECTURA",
      modulo: "SERVICIOS",
      prioridad: "MEDIA",
      titulo: "Servicios propios sin leer",
      descripcion: "Tiene registros de servicios de su vivienda pendientes de lectura.",
      accionUrl: "/app/permisionario/servicios",
      entidadTipo: "ServicioVivienda",
      cantidad: servicios,
      requiereAccion: false,
      requiereLectura: true,
      accionTexto: "Leer",
    }),
  ].filter(Boolean);
}

async function countServiciosPropiosNoLeidos(user) {
  const uid = getUserId(user);
  if (!uid || !Vivienda) return 0;

  const vivienda = await Vivienda.findOne({
    estado: "OCUPADA",
    "ocupacionActual.permisionario": uid,
  })
    .select("codigo")
    .lean();

  const codigo = up(vivienda?.codigo);
  if (!codigo) return 0;

  return ServicioVivienda.countDocuments({
    viviendaCodigo: codigo,
    alertaActiva: { $ne: false },
    leidoPorUsuario: { $ne: true },
  });
}

async function collectAlojado(user) {
  if (!AlojamientoDocumento) return [];
  const vinculo = userAlojamientoVinculo(user);
  if (!vinculo.length) return [];

  const [conformidades, borradores] = await Promise.all([
    AlojamientoDocumento.countDocuments({
      codigo: { $in: ["ANEXO_23", "ANEXO_25", "ANEXO_26"] },
      activo: { $ne: false },
      estado: "ENVIADO",
      $or: vinculo,
      ...sinConformidadUsuario("ALOJADO", user),
    }),
    AlojamientoDocumento.countDocuments({
      codigo: { $in: ["ANEXO_24", "ANEXO_28"] },
      activo: { $ne: false },
      estado: "BORRADOR",
      $or: vinculo,
    }),
  ]);

  return [
    alertaAgregada({
      id: "alojado:anexos-conformidad",
      tipo: "CONFIRMACION",
      modulo: "ALOJAMIENTOS",
      titulo: "Documentos de alojamiento pendientes de conformidad",
      descripcion: "Tiene ANEXO_23, ANEXO_25 o ANEXO_26 enviados que requieren su conformidad.",
      accionUrl: "/app/alojado/anexos",
      entidadTipo: "AlojamientoDocumento",
      cantidad: conformidades,
      requiereConfirmacion: true,
      accionTexto: "Prestar conformidad",
    }),
    alertaAgregada({
      id: "alojado:anexos-borrador-enviar",
      tipo: "ACCION",
      modulo: "ALOJAMIENTOS",
      prioridad: "MEDIA",
      titulo: "Documentos de alojamiento pendientes de envío",
      descripcion: "Tiene ANEXO_24 o ANEXO_28 en borrador propio para enviar.",
      accionUrl: "/app/alojado/anexos",
      entidadTipo: "AlojamientoDocumento",
      cantidad: borradores,
      accionTexto: "Enviar",
    }),
  ].filter(Boolean);
}

async function collectInspector(user) {
  const barrio = getBarrioAsignado(user);
  const vinculoInspector = userFormVinculo(user, "INSPECTOR");
  const orInspector = [...vinculoInspector];
  if (barrio) orInspector.push({ barrio });
  if (!orInspector.length) return [];

  const estados = {
    visita: "VISITA_PENDIENTE_AGENDA",
    resolver: "VISITA_CONFIRMADA",
    programar: "TAREA_PENDIENTE_PROGRAMACION",
    devuelto: "DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL",
    cumplido: "TAREA_CONFIRMADA",
  };

  const [visita, resolver, programar, devuelto, cumplido, mantenimientos] = await Promise.all([
    FormSubmission.countDocuments({ codigo: "ANEXO_11", estadoInstitucional: estados.visita, $or: orInspector }),
    FormSubmission.countDocuments({ codigo: "ANEXO_11", estadoInstitucional: estados.resolver, $or: orInspector }),
    FormSubmission.countDocuments({ codigo: "ANEXO_11", estadoInstitucional: estados.programar, $or: orInspector }),
    FormSubmission.countDocuments({ codigo: "ANEXO_11", estadoInstitucional: estados.devuelto, $or: orInspector }),
    FormSubmission.countDocuments({ codigo: "ANEXO_11", estadoInstitucional: estados.cumplido, $or: orInspector }),
    barrio
      ? Mantenimiento.countDocuments({ barrio, isClosed: false, inspectorDecision: "PENDIENTE" })
      : 0,
  ]);

  return [
    alertaAgregada({
      id: "inspector:anexo-11-agendar",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 pendientes de agenda",
      descripcion: "Tiene pedidos ANEXO_11 pendientes de agendar visita.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: visita,
      accionTexto: "Agendar",
    }),
    alertaAgregada({
      id: "inspector:anexo-11-resolver-visita",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 con visita confirmada",
      descripcion: "Tiene pedidos ANEXO_11 con visita confirmada para resolver.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: resolver,
      accionTexto: "Resolver",
    }),
    alertaAgregada({
      id: "inspector:anexo-11-programar",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 pendientes de programación",
      descripcion: "Tiene tareas ANEXO_11 pendientes de programación.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: programar,
      accionTexto: "Programar",
    }),
    alertaAgregada({
      id: "inspector:anexo-11-devuelto",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 devueltos por ADMIN_GENERAL",
      descripcion: "Tiene pedidos ANEXO_11 devueltos por ADMIN_GENERAL para revisión.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: devuelto,
      accionTexto: "Revisar",
    }),
    alertaAgregada({
      id: "inspector:anexo-11-marcar-cumplido",
      modulo: "GESTIONES",
      titulo: "ANEXO_11 tareas confirmadas",
      descripcion: "Tiene tareas ANEXO_11 confirmadas para marcar como cumplidas.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: cumplido,
      accionTexto: "Marcar cumplido",
    }),
    alertaAgregada({
      id: "inspector:mantenimientos-pendientes",
      modulo: "MANTENIMIENTOS",
      titulo: "Mantenimientos pendientes de decisión inspector",
      descripcion: "Tiene solicitudes de mantenimiento de su barrio pendientes de decisión inspector.",
      accionUrl: "/app/permisionario/mi-barrio-inspector/mantenimientos",
      entidadTipo: "Mantenimiento",
      cantidad: mantenimientos,
      accionTexto: "Resolver",
    }),
  ].filter(Boolean);
}

async function collectJefeBarrio(user) {
  const barrio = getBarrioAsignado(user);
  const vinculoJefe = userFormVinculo(user, "JEFE_DE_BARRIO");
  if (!barrio && !vinculoJefe.length) return [];

  const [anexo04, anexo11] = await Promise.all([
    barrio
      ? FormSubmission.countDocuments({
          codigo: "ANEXO_04",
          estado: "ENVIADO",
          barrio,
          "datos.acuseRecibo.ok": { $ne: true },
        })
      : 0,
    FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      estado: { $nin: ["CERRADO", "RECHAZADO", "ANULADO"] },
      estadoInstitucional: { $nin: ["CERRADO_ADMIN_GENERAL", "RECHAZADO_POR_INSPECTOR"] },
      $or: vinculoJefe,
    }),
  ]);

  return [
    alertaAgregada({
      id: "jefe-barrio:anexo-04-acuse",
      modulo: "GESTIONES",
      titulo: "ANEXO_04 pendientes de acuse",
      descripcion: "Tiene ANEXO_04 enviados en su barrio pendientes de acuse o intervención territorial.",
      accionUrl: "/app/permisionario/mi-barrio-jefe/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: anexo04,
      accionTexto: "Acusar recibo",
    }),
    alertaAgregada({
      id: "jefe-barrio:anexo-11-propios",
      tipo: "SEGUIMIENTO",
      modulo: "GESTIONES",
      prioridad: "MEDIA",
      titulo: "ANEXO_11 propios en curso",
      descripcion: "Tiene ANEXO_11 propios o asignados a su perfil territorial para revisar.",
      accionUrl: "/app/permisionario/mi-barrio-jefe/gestiones",
      entidadTipo: "FormSubmission",
      cantidad: anexo11,
      requiereAccion: false,
      accionTexto: "Revisar",
    }),
  ].filter(Boolean);
}

async function collectInspectorAlojamientos(user) {
  if (!AlojamientoDocumento || typeof buildFiltroTerritorialDocumento !== "function") return [];

  const territorialFilter = await buildFiltroTerritorialDocumento(user);
  if (!territorialFilter) return [];

  const [anexo24, anexo28] = await Promise.all([
    AlojamientoDocumento.countDocuments({
      codigo: "ANEXO_24",
      estado: "ENVIADO",
      activo: { $ne: false },
      $and: [territorialFilter],
    }),
    AlojamientoDocumento.countDocuments({
      codigo: "ANEXO_28",
      estado: { $in: ["ENVIADO", "DEVUELTO_A_INSPECTOR"] },
      activo: { $ne: false },
      $and: [territorialFilter],
    }),
  ]);

  return [
    alertaAgregada({
      id: "inspector-alojamientos:anexo-24-revision",
      modulo: "ALOJAMIENTOS",
      titulo: "ANEXO_24 pendientes de revisión",
      descripcion: "Tiene ANEXO_24 enviados dentro de su territorio para revisión inspector.",
      accionUrl: "/app/permisionario/alojamientos-inspector/documentos",
      entidadTipo: "AlojamientoDocumento",
      cantidad: anexo24,
      accionTexto: "Revisar",
    }),
    alertaAgregada({
      id: "inspector-alojamientos:anexo-28-gestion",
      modulo: "ALOJAMIENTOS",
      titulo: "ANEXO_28 pendientes de gestión inspector",
      descripcion: "Tiene ANEXO_28 enviados o devueltos dentro de su territorio para gestionar.",
      accionUrl: "/app/permisionario/alojamientos-inspector/documentos",
      entidadTipo: "AlojamientoDocumento",
      cantidad: anexo28,
      accionTexto: "Gestionar",
    }),
  ].filter(Boolean);
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
    } else {
      const dinamicas = [];
      if (isRole(user, "POSTULANTE")) dinamicas.push(collectPostulante(user));
      if (isRole(user, "PERMISIONARIO")) dinamicas.push(collectPermisionario(user));
      if (isRole(user, "ALOJADO")) dinamicas.push(collectAlojado(user));
      if (isRole(user, "PERMISIONARIO") && hasPermiso(user, "INSPECTOR")) {
        dinamicas.push(collectInspector(user));
      }
      if (isRole(user, "PERMISIONARIO") && hasPermiso(user, "JEFE_DE_BARRIO")) {
        dinamicas.push(collectJefeBarrio(user));
      }
      if (isRole(user, "PERMISIONARIO") && hasPermiso(user, "INSPECTOR_ALOJAMIENTOS")) {
        dinamicas.push(collectInspectorAlojamientos(user));
      }
      if (dinamicas.length) alertas = alertas.concat((await Promise.all(dinamicas)).flat());
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
