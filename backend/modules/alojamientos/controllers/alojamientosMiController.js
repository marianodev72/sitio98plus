const crypto = require("crypto");

const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");
const AlojamientoDocumento = require("../models/AlojamientoDocumento");
const { User } = require("../../../models/user");
const { Liquidacion } = require("../../../models/Liquidacion");
const MisDatosDeclaradosUpdate = require("../../../models/MisDatosDeclaradosUpdate");
const anexo23Service = require("../services/documentos/anexo23Service");
const alojamientoDocumentoPdfService = require("../services/documentos/alojamientoDocumentoPdfService");
const { renderAnexo22Pdf } = require("../pdf/anexo22PdfRenderer");
const { renderAnexo23Pdf } = require("../pdf/anexo23PdfRenderer");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function normMR(value) {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function sameId(a, b) {
  if (!a || !b) return false;
  return String(a?._id || a) === String(b?._id || b);
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function encodeDocToken(id) {
  const secret =
    process.env.ALOJAMIENTOS_MI_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.MONGO_URI ||
    "sitio98plus-alojamientos-mi-dev-token-secret";
  return crypto.createHmac("sha256", secret).update(String(id || "")).digest("hex");
}

function sameToken(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function canQueryOcupacion(user, asignacion) {
  if (!user?._id) return false;
  if (up(user.role) === "ALOJADO") return true;
  if (up(user.estadoHabitacional) === "ALOJADO_ACTIVO") return true;
  return Boolean(asignacion && sameId(asignacion.alojado, user._id));
}

function canUsePanelAlojado(user) {
  if (!user?._id) return false;
  return up(user.role) === "ALOJADO";
}

function isUsuarioVinculado(user, documento) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;
  if (sameId(documento.solicitante, userId)) return true;
  if (sameId(documento.alojado, userId)) return true;
  if (sameId(documento.creadoPor, userId)) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => sameId(item?.userId, userId));
}

function redactDatos(datos = {}) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};
  const sensitiveKey = /(^_id$|id$|^dni$|email|telefono|tel[eé]fono|^mr$|matricula|matr[ií]cula|numeromatricula|nromatricula|registro|legajo)/i;
  const redactObjectIds = (value, key = "") => {
    if (sensitiveKey.test(key)) return undefined;
    if (typeof value === "string" && /^[a-f\d]{24}$/i.test(value)) return undefined;
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.map((item) => redactObjectIds(item)).filter((item) => item !== undefined);
    }
    return Object.fromEntries(
      Object.entries(value)
        .map(([childKey, childValue]) => [childKey, redactObjectIds(childValue, childKey)])
        .filter(([, childValue]) => childValue !== undefined)
    );
  };

  const out = redactObjectIds(datos) || {};
  if (out.adjuntos && typeof out.adjuntos === "object" && !Array.isArray(out.adjuntos)) {
    out.adjuntos = Object.fromEntries(
      Object.entries(out.adjuntos).map(([key, value]) => [
        key,
        value && typeof value === "object"
          ? {
              campo: value.campo,
              nombreOriginal: value.nombreOriginal,
              mime: value.mime,
              size: value.size,
              fechaSubida: value.fechaSubida,
            }
          : value,
      ])
    );
  }
  return out;
}

function hasConformidadAlojado(documento, userId) {
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.some(
    (item) => up(item?.tipo) === "ALOJADO" && sameId(item?.usuario, userId) && item?.ok === true
  );
}

function publicDocumentoListItem(doc) {
  return {
    token: encodeDocToken(doc._id),
    codigo: doc.codigo,
    estado: doc.estado,
    estadoInstitucional: doc.estadoInstitucional || null,
    readonly: true,
    canView: true,
    canDownloadPdf: doc.codigo === "ANEXO_22" || doc.codigo === "ANEXO_23",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function publicDocumentoDetail(doc, user) {
  const userId = String(user?._id || "");
  const esAnexo23 = up(doc?.codigo) === "ANEXO_23";
  const canConformarAnexo23 =
    esAnexo23 &&
    up(doc?.estado) === "ENVIADO" &&
    isUsuarioVinculado(user, doc) &&
    !hasConformidadAlojado(doc, userId);

  return {
    ...publicDocumentoListItem(doc),
    datos: redactDatos(doc.datos || {}),
    historialEstados: Array.isArray(doc.historialEstados)
      ? doc.historialEstados.map((item) => ({
          fecha: item.fecha,
          estadoAnterior: item.estadoAnterior,
          estadoNuevo: item.estadoNuevo,
          observacion: item.observacion,
          rolActor: item.rolActor,
        }))
      : [],
    conformidades: Array.isArray(doc.conformidades)
      ? doc.conformidades.map((item) => ({
          tipo: item.tipo,
          ok: item.ok === true,
          rol: item.rol,
          fecha: item.fecha,
        }))
      : [],
    canConformarAnexo23,
  };
}

async function findMiDocumento(user, token) {
  const publicToken = String(token || "").trim();
  if (!/^[a-f\d]{64}$/i.test(publicToken) || !canUsePanelAlojado(user)) return null;

  const userId = user._id;
  const docs = await AlojamientoDocumento.find({
    codigo: { $in: ["ANEXO_21", "ANEXO_22", "ANEXO_23"] },
    activo: { $ne: false },
    $or: [
      { solicitante: userId },
      { alojado: userId },
      { creadoPor: userId },
      { "intervinientes.userId": userId },
    ],
  })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(200)
    .lean();

  const doc = docs.find((item) => sameToken(encodeDocToken(item._id), publicToken));
  if (!doc || !isUsuarioVinculado(user, doc)) return null;
  return doc;
}

function pickAlojamiento(alojamiento) {
  return {
    codigo: alojamiento?.codigo || "",
    dependencia: alojamiento?.dependencia || "",
    lugar: alojamiento?.lugar || "",
    sector: alojamiento?.sector || "",
    tipo: alojamiento?.tipo || "",
    clase: alojamiento?.clase || "",
    localidad: alojamiento?.localidad || "",
    provincia: alojamiento?.provincia || "",
  };
}

function pickPlaza(plaza, alojamiento) {
  return {
    codigo: plaza?.codigo || "",
    numero: plaza?.numeroPlaza ?? null,
    estado: plaza?.estado || "",
    generoPermitido: plaza?.generoPermitido || alojamiento?.generoPermitido || "",
  };
}

function publicOcupacionItem(asignacion, documentoByAsignacion) {
  const alojamiento = asignacion?.alojamiento || {};
  const plaza = asignacion?.plaza || {};
  const documento = documentoByAsignacion.get(String(asignacion?._id || "")) || null;

  return {
    estado: asignacion?.estado || "",
    fechaInicio: asignacion?.fechaInicio || null,
    fechaFin: asignacion?.fechaFin || null,
    alojamiento: {
      codigo: alojamiento?.codigo || "",
      lugar: alojamiento?.lugar || "",
      dependencia: alojamiento?.dependencia || "",
      sector: alojamiento?.sector || "",
      tipo: alojamiento?.tipo || "",
      clase: alojamiento?.clase || "",
    },
    plaza: {
      numero: plaza?.numeroPlaza ?? null,
      codigoPublico: plaza?.codigo || "",
    },
    origenDocumental: documento
      ? {
          codigo: documento.codigo || "",
          estado: documento.estado || "",
          fecha: documento.updatedAt || documento.createdAt || null,
        }
      : null,
  };
}

function moneyPair(value = {}) {
  return {
    cod457: Number(value?.cod457 || 0),
    cod411: Number(value?.cod411 || 0),
  };
}

function publicLiquidacionItem(liq = {}) {
  const principal = moneyPair(liq.principal);
  const descuentosParticulares = moneyPair(liq.descuentosParticulares);
  const reintegrosParticulares = moneyPair(liq.reintegrosParticulares);
  const total = {
    cod457: principal.cod457 - reintegrosParticulares.cod457,
    cod411: principal.cod411 - reintegrosParticulares.cod411,
  };

  return {
    periodo: liq.periodo || "",
    estado: liq.estadoEntrega || "",
    fecha: liq.updatedAt || liq.createdAt || null,
    conceptos: {
      principal,
      descuentosParticulares,
      reintegrosParticulares,
    },
    total: {
      ...total,
      etiqueta457: total.cod457 > 0 ? "DESCUENTO" : total.cod457 < 0 ? "REINTEGRO" : "0",
      etiqueta411: total.cod411 > 0 ? "DESCUENTO" : total.cod411 < 0 ? "REINTEGRO" : "0",
    },
  };
}

function publicNovedadItem(doc = {}) {
  return {
    codigoDocumento: doc.codigo || "",
    estado: doc.estado || "",
    fecha: doc.updatedAt || doc.createdAt || null,
    novedadesTexto: String(doc?.datos?.novedadesTexto || "").trim(),
  };
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function publicDatosDeclarados({ documento = null, asignacion = null } = {}) {
  const datos = documento?.datos && typeof documento.datos === "object" ? documento.datos : {};
  const huesped = datos.huesped && typeof datos.huesped === "object" ? datos.huesped : {};
  const alojamientoSnapshot =
    datos.alojamientoSnapshot && typeof datos.alojamientoSnapshot === "object"
      ? datos.alojamientoSnapshot
      : {};
  const plazaSnapshot =
    datos.plazaSnapshot && typeof datos.plazaSnapshot === "object" ? datos.plazaSnapshot : {};
  const alojamiento = asignacion?.alojamiento || {};
  const plaza = asignacion?.plaza || {};
  const apellido = firstString(huesped.apellido, datos.apellido);
  const nombres = firstString(huesped.nombres, datos.nombres);

  return {
    identidad: {
      nombreCompleto: firstString(
        huesped.nombreCompleto,
        datos.nombreCompleto,
        datos.postulanteNombre,
        [apellido, nombres].filter(Boolean).join(", ")
      ),
      apellido,
      nombres,
      genero: firstString(huesped.genero, datos.genero, datos.sexo),
      gradoEscalafon: firstString(huesped.gradoEscalafon, datos.gradoEscalafon, huesped.grado, datos.grado),
    },
    destino: {
      actual: firstString(huesped.destinoActual, datos.destinoActual, huesped.destino),
      futuro: firstString(huesped.destinoFuturo, datos.destinoFuturo),
    },
    ocupacion: {
      estado: asignacion?.estado || "",
      fechaInicio: asignacion?.fechaInicio || null,
    },
    alojamiento: {
      codigo: firstString(alojamiento.codigo, alojamientoSnapshot.alojamientoCodigo, datos.alojamientoCodigo),
      lugar: firstString(alojamiento.lugar, alojamientoSnapshot.lugar, datos.lugar),
      dependencia: firstString(alojamiento.dependencia, alojamientoSnapshot.dependencia, datos.dependencia),
      sector: firstString(alojamiento.sector, alojamientoSnapshot.sector, datos.sector),
      tipo: firstString(alojamiento.tipo, alojamientoSnapshot.tipo, datos.tipo),
      clase: firstString(alojamiento.clase, alojamientoSnapshot.clase, datos.clase),
    },
    plaza: {
      numero: plaza?.numeroPlaza ?? plazaSnapshot.numeroPlaza ?? datos.numeroPlaza ?? null,
      codigoPublico: firstString(plaza.codigo, plazaSnapshot.plazaCodigo, datos.plazaCodigo),
    },
    origenDocumental: documento
      ? {
          codigo: documento.codigo || "",
          estado: documento.estado || "",
          fecha: documento.updatedAt || documento.createdAt || null,
        }
      : null,
  };
}

function mergeDatosDeclarados(base = {}, update = {}) {
  const out = JSON.parse(JSON.stringify(base || {}));
  const identidad = update?.identidad && typeof update.identidad === "object" ? update.identidad : {};
  const destino = update?.destino && typeof update.destino === "object" ? update.destino : {};
  out.identidad = { ...(out.identidad || {}) };
  out.destino = { ...(out.destino || {}) };

  for (const key of ["apellido", "nombres", "genero", "gradoEscalafon"]) {
    const value = firstString(identidad[key]);
    if (value) out.identidad[key] = value;
  }
  out.identidad.nombreCompleto = firstString(
    identidad.nombreCompleto,
    [out.identidad.apellido, out.identidad.nombres].filter(Boolean).join(", "),
    out.identidad.nombreCompleto
  );
  for (const key of ["actual", "futuro"]) {
    const value = firstString(destino[key]);
    if (value) out.destino[key] = value;
  }
  return out;
}

function sanitizeDatosDeclaradosUpdate(payload = {}) {
  const identidad = payload?.identidad && typeof payload.identidad === "object" ? payload.identidad : {};
  const destino = payload?.destino && typeof payload.destino === "object" ? payload.destino : {};
  const clean = (value) => String(value || "").trim().slice(0, 180);
  const out = {
    identidad: {
      apellido: clean(identidad.apellido),
      nombres: clean(identidad.nombres),
      genero: clean(identidad.genero),
      gradoEscalafon: clean(identidad.gradoEscalafon),
    },
    destino: {
      actual: clean(destino.actual),
      futuro: clean(destino.futuro),
    },
  };
  out.identidad.nombreCompleto = [out.identidad.apellido, out.identidad.nombres]
    .filter(Boolean)
    .join(", ");
  return out;
}

function resumenDatosDeclarados(datos = {}) {
  const partes = [];
  const identidad = datos.identidad || {};
  const destino = datos.destino || {};
  if (firstString(identidad.apellido, identidad.nombres)) partes.push("identidad institucional");
  if (firstString(identidad.genero, identidad.gradoEscalafon)) partes.push("perfil institucional");
  if (firstString(destino.actual, destino.futuro)) partes.push("destino");
  return partes.length ? `Actualizacion de ${partes.join(", ")}` : "Actualizacion de datos declarados";
}

function publicDatosDeclaradosUpdateItem(item = {}) {
  return {
    token: encodeDocToken(item._id),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    motivo: item.motivo || "",
    resumen: item.resumen || "",
    estado: item.estado || "",
  };
}

function publicDatosDeclaradosEditableSnapshot(datos = {}) {
  const identidad = datos?.identidad && typeof datos.identidad === "object" ? datos.identidad : {};
  const destino = datos?.destino && typeof datos.destino === "object" ? datos.destino : {};
  return {
    identidad: {
      apellido: firstString(identidad.apellido),
      nombres: firstString(identidad.nombres),
      genero: firstString(identidad.genero),
      gradoEscalafon: firstString(identidad.gradoEscalafon),
      nombreCompleto: firstString(
        identidad.nombreCompleto,
        [identidad.apellido, identidad.nombres].filter(Boolean).join(", ")
      ),
    },
    destino: {
      actual: firstString(destino.actual),
      futuro: firstString(destino.futuro),
    },
  };
}

function publicDatosDeclaradosUpdateDetail(item = {}) {
  return {
    ...publicDatosDeclaradosUpdateItem(item),
    datos: publicDatosDeclaradosEditableSnapshot(
      item.datosActualizados && typeof item.datosActualizados === "object" ? item.datosActualizados : {}
    ),
    base: publicDatosDeclaradosEditableSnapshot(
      item.baseDatos && typeof item.baseDatos === "object" ? item.baseDatos : {}
    ),
  };
}

async function findMiDatosDeclaradosUpdate(user, token) {
  const publicToken = String(token || "").trim();
  if (!/^[a-f\d]{64}$/i.test(publicToken) || !canUsePanelAlojado(user)) return null;

  const items = await MisDatosDeclaradosUpdate.find({ usuario: user._id })
    .select("baseDatos datosActualizados motivo resumen estado createdAt updatedAt")
    .sort({ createdAt: -1, _id: -1 })
    .limit(200)
    .lean();

  return items.find((item) => sameToken(encodeDocToken(item._id), publicToken)) || null;
}

async function resolveAlojadoMr(userId) {
  if (!userId) return "";
  const user = await User.findById(userId)
    .select("_id role matricula activo bloqueado archivado")
    .lean();
  if (!user || !canUsePanelAlojado(user)) return "";
  if (user.activo === false || user.bloqueado === true || user.archivado === true) return "";
  return normMR(user.matricula);
}

async function ocupacionActual(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return deny(res);

    const user = await User.findById(userId)
      .select("_id role estadoHabitacional alojamientoAsignado activo bloqueado archivado")
      .lean();
    if (!user || user.activo === false || user.bloqueado === true || user.archivado === true) {
      return deny(res);
    }

    const asignacion = await AsignacionAlojamiento.findOne({
      alojado: userId,
      estado: "ACTIVA",
    })
      .populate({
        path: "alojamiento",
        select: "codigo dependencia lugar sector tipo clase localidad provincia generoPermitido",
      })
      .populate({
        path: "plaza",
        select: "codigo numeroPlaza estado alojadoActual generoPermitido",
      })
      .lean();

    if (!canQueryOcupacion(user, asignacion)) return deny(res);

    if (!asignacion) {
      return res.json({ ok: true, ocupacion: null });
    }

    if (!sameId(asignacion.alojado, userId)) return deny(res);

    const alojamiento = asignacion.alojamiento;
    const plaza = asignacion.plaza;
    if (!alojamiento || !plaza) return deny(res);
    if (plaza.alojadoActual && !sameId(plaza.alojadoActual, userId)) return deny(res);

    return res.json({
      ok: true,
      ocupacion: {
        estado: asignacion.estado,
        fechaInicio: asignacion.fechaInicio || null,
        codigoAsignacion: asignacion.codigo || "",
        alojamiento: pickAlojamiento(alojamiento),
        plaza: pickPlaza(plaza, alojamiento),
      },
    });
  } catch (err) {
    console.error("[alojamientos-mi] ocupacionActual error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener ocupacion actual" });
  }
}

async function listarOcupaciones(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    if (!userId) return deny(res);

    const asignaciones = await AsignacionAlojamiento.find({ alojado: userId })
      .select("estado fechaInicio fechaFin alojamiento plaza")
      .populate({
        path: "alojamiento",
        select: "codigo lugar dependencia sector tipo clase",
      })
      .populate({
        path: "plaza",
        select: "numeroPlaza codigo",
      })
      .sort({ fechaInicio: -1, updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    const asignacionIds = asignaciones.map((item) => item._id).filter(Boolean);
    const documentos = asignacionIds.length
      ? await AlojamientoDocumento.find({
          asignacion: { $in: asignacionIds },
          codigo: { $in: ["ANEXO_22", "ANEXO_23"] },
          activo: { $ne: false },
          $or: [
            { alojado: userId },
            { solicitante: userId },
            { "intervinientes.userId": userId },
          ],
        })
          .select("codigo estado asignacion createdAt updatedAt")
          .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
          .lean()
      : [];

    const documentoByAsignacion = new Map();
    for (const doc of documentos) {
      const key = String(doc.asignacion || "");
      if (key && !documentoByAsignacion.has(key)) documentoByAsignacion.set(key, doc);
    }

    return res.json({
      ok: true,
      ocupaciones: asignaciones.map((item) => publicOcupacionItem(item, documentoByAsignacion)),
    });
  } catch (err) {
    console.error("[alojamientos-mi] listarOcupaciones error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar ocupaciones" });
  }
}

async function listarLiquidaciones(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    const mr = await resolveAlojadoMr(userId);
    if (!mr) return deny(res);

    const liquidaciones = await Liquidacion.find({
      mr,
      $or: [{ userId }, { userId: null }],
    })
      .select("periodo principal descuentosParticulares reintegrosParticulares estadoEntrega createdAt updatedAt")
      .sort({ periodo: -1, updatedAt: -1, createdAt: -1 })
      .limit(24)
      .lean();

    return res.json({
      ok: true,
      liquidaciones: liquidaciones.map(publicLiquidacionItem),
    });
  } catch (err) {
    console.error("[alojamientos-mi] listarLiquidaciones error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar liquidaciones" });
  }
}

async function obtenerUltimaLiquidacion(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    const mr = await resolveAlojadoMr(userId);
    if (!mr) return deny(res);

    const liquidacion = await Liquidacion.findOne({
      mr,
      $or: [{ userId }, { userId: null }],
    })
      .select("periodo principal descuentosParticulares reintegrosParticulares estadoEntrega createdAt updatedAt")
      .sort({ periodo: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      liquidacion: liquidacion ? publicLiquidacionItem(liquidacion) : null,
    });
  } catch (err) {
    console.error("[alojamientos-mi] obtenerUltimaLiquidacion error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener liquidacion" });
  }
}

async function listarNovedades(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    if (!userId) return deny(res);

    const documentos = await AlojamientoDocumento.find({
      codigo: "ANEXO_23",
      activo: { $ne: false },
      $or: [
        { alojado: userId },
        { solicitante: userId },
        { creadoPor: userId },
        { "intervinientes.userId": userId },
      ],
    })
      .select("codigo estado datos.novedadesTexto createdAt updatedAt")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(50)
      .lean();

    return res.json({
      ok: true,
      novedades: documentos
        .map(publicNovedadItem)
        .filter((item) => item.novedadesTexto.length > 0),
    });
  } catch (err) {
    console.error("[alojamientos-mi] listarNovedades error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar novedades" });
  }
}

async function obtenerDatosDeclarados(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    if (!userId) return deny(res);

    const documento = await AlojamientoDocumento.findOne({
      codigo: "ANEXO_23",
      activo: { $ne: false },
      $or: [
        { alojado: userId },
        { solicitante: userId },
        { "intervinientes.userId": userId },
      ],
    })
      .select(
        "codigo estado solicitante alojado intervinientes.userId datos.huesped datos.postulanteNombre datos.nombreCompleto datos.apellido datos.nombres datos.genero datos.sexo datos.gradoEscalafon datos.grado datos.destinoActual datos.destinoFuturo datos.alojamientoSnapshot datos.plazaSnapshot datos.alojamientoCodigo datos.lugar datos.dependencia datos.sector datos.tipo datos.clase datos.numeroPlaza datos.plazaCodigo createdAt updatedAt"
      )
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .lean();

    const asignacion = await AsignacionAlojamiento.findOne({
      alojado: userId,
      estado: "ACTIVA",
    })
      .select("estado fechaInicio alojamiento plaza alojado")
      .populate({
        path: "alojamiento",
        select: "codigo lugar dependencia sector tipo clase",
      })
      .populate({
        path: "plaza",
        select: "numeroPlaza codigo",
      })
      .lean();

    if (!documento && !asignacion) {
      return res.json({ ok: true, datos: null });
    }

    if (asignacion && !sameId(asignacion.alojado, userId)) return deny(res);
    if (documento && !isUsuarioVinculado(req.user, documento)) return deny(res);

    const base = publicDatosDeclarados({ documento, asignacion });
    const ultimaActualizacion = await MisDatosDeclaradosUpdate.findOne({ usuario: userId })
      .select("datosActualizados motivo resumen estado createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({
      ok: true,
      datos: ultimaActualizacion ? mergeDatosDeclarados(base, ultimaActualizacion.datosActualizados) : base,
      ultimaActualizacion: ultimaActualizacion
        ? publicDatosDeclaradosUpdateItem(ultimaActualizacion)
        : null,
    });
  } catch (err) {
    console.error("[alojamientos-mi] obtenerDatosDeclarados error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener datos declarados" });
  }
}

async function actualizarDatosDeclarados(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    if (!userId) return deny(res);

    const documento = await AlojamientoDocumento.findOne({
      codigo: "ANEXO_23",
      activo: { $ne: false },
      $or: [
        { alojado: userId },
        { solicitante: userId },
        { "intervinientes.userId": userId },
      ],
    })
      .select(
        "codigo estado solicitante alojado intervinientes.userId datos.huesped datos.postulanteNombre datos.nombreCompleto datos.apellido datos.nombres datos.genero datos.sexo datos.gradoEscalafon datos.grado datos.destinoActual datos.destinoFuturo datos.alojamientoSnapshot datos.plazaSnapshot datos.alojamientoCodigo datos.lugar datos.dependencia datos.sector datos.tipo datos.clase datos.numeroPlaza datos.plazaCodigo createdAt updatedAt"
      )
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .lean();

    const asignacion = await AsignacionAlojamiento.findOne({
      alojado: userId,
      estado: "ACTIVA",
    })
      .select("estado fechaInicio alojamiento plaza alojado")
      .populate({ path: "alojamiento", select: "codigo lugar dependencia sector tipo clase" })
      .populate({ path: "plaza", select: "numeroPlaza codigo" })
      .lean();

    if (!documento && !asignacion) return deny(res);
    if (asignacion && !sameId(asignacion.alojado, userId)) return deny(res);
    if (documento && !isUsuarioVinculado(req.user, documento)) return deny(res);

    const datosActualizados = sanitizeDatosDeclaradosUpdate(req.body?.datos || req.body || {});
    const baseDatos = publicDatosDeclarados({ documento, asignacion });
    const baseDatosAllowlist = publicDatosDeclaradosEditableSnapshot(baseDatos);
    const motivo = String(req.body?.motivo || "").trim().slice(0, 300);

    const item = await MisDatosDeclaradosUpdate.create({
      usuario: userId,
      baseAnexoId: null,
      baseDatos: baseDatosAllowlist,
      datosActualizados,
      motivo,
      resumen: resumenDatosDeclarados(datosActualizados),
      estado: "REGISTRADO",
    });

    return res.json({
      ok: true,
      item: publicDatosDeclaradosUpdateDetail(item.toObject ? item.toObject() : item),
      datos: mergeDatosDeclarados(baseDatos, datosActualizados),
    });
  } catch (err) {
    console.error("[alojamientos-mi] actualizarDatosDeclarados error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al actualizar datos declarados" });
  }
}

async function historialDatosDeclarados(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user?._id;
    if (!userId) return deny(res);

    let limit = Number.parseInt(String(req.query?.limit || "50"), 10);
    if (Number.isNaN(limit) || limit < 1) limit = 50;
    limit = Math.min(limit, 100);

    const items = await MisDatosDeclaradosUpdate.find({ usuario: userId })
      .select("motivo resumen estado createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, items: items.map(publicDatosDeclaradosUpdateItem) });
  } catch (err) {
    console.error("[alojamientos-mi] historialDatosDeclarados error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar historial" });
  }
}

async function obtenerDatosDeclaradosUpdate(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const item = await findMiDatosDeclaradosUpdate(req.user, req.params.token);
    if (!item) return deny(res);

    return res.json({ ok: true, item: publicDatosDeclaradosUpdateDetail(item) });
  } catch (err) {
    console.error("[alojamientos-mi] obtenerDatosDeclaradosUpdate error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener actualizacion" });
  }
}

async function listarDocumentos(req, res) {
  try {
    if (!canUsePanelAlojado(req.user)) return deny(res);

    const userId = req.user._id;
    const codigo = up(req.query?.codigo);
    const filter = {
      activo: { $ne: false },
      codigo: { $in: ["ANEXO_21", "ANEXO_22", "ANEXO_23"] },
      $or: [
        { solicitante: userId },
        { alojado: userId },
        { creadoPor: userId },
        { "intervinientes.userId": userId },
      ],
    };
    if (codigo) {
      if (!["ANEXO_21", "ANEXO_22", "ANEXO_23"].includes(codigo)) return deny(res);
      filter.codigo = codigo;
    }

    const documentos = await AlojamientoDocumento.find(filter)
      .select("codigo estado estadoInstitucional createdAt updatedAt")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(100)
      .lean();

    return res.json({ ok: true, documentos: documentos.map(publicDocumentoListItem) });
  } catch (err) {
    console.error("[alojamientos-mi] listarDocumentos error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar documentos" });
  }
}

async function obtenerDocumento(req, res) {
  try {
    const documento = await findMiDocumento(req.user, req.params.token);
    if (!documento) return deny(res);
    return res.json({ ok: true, documento: publicDocumentoDetail(documento, req.user) });
  } catch (err) {
    console.error("[alojamientos-mi] obtenerDocumento error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener documento" });
  }
}

async function descargarDocumentoPdf(req, res) {
  try {
    const documento = await findMiDocumento(req.user, req.params.token);
    if (!documento || !["ANEXO_22", "ANEXO_23"].includes(up(documento.codigo))) return deny(res);

    const result = await alojamientoDocumentoPdfService.obtenerPayloadDocumentoPdf({
      id: documento._id,
      user: req.user,
    });
    if (!result?.ok) return deny(res);

    const codigo = up(result.documento?.codigo || "DOCUMENTO");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${codigo}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (codigo === "ANEXO_22") {
      return renderAnexo22Pdf(res, { documento: result.documento, origen: result.origen });
    }
    if (codigo === "ANEXO_23") {
      return renderAnexo23Pdf(res, {
        documento: result.documento,
        anexo22: result.anexo22,
        anexo21: result.anexo21,
      });
    }
    return deny(res);
  } catch (err) {
    console.error("[alojamientos-mi] descargarDocumentoPdf error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al descargar documento" });
  }
}

async function conformidadAnexo23(req, res) {
  try {
    const documento = await findMiDocumento(req.user, req.params.token);
    if (!documento || up(documento.codigo) !== "ANEXO_23") return deny(res);

    const result = await anexo23Service.conformidadAlojado(documento._id, req.body || {}, req.user);
    if (!result?.ok) {
      return res.status(result?.status || 400).json({
        ok: false,
        error: result?.message || "No es posible procesar la solicitud.",
      });
    }

    const fresh = await findMiDocumento(req.user, req.params.token);
    return res.json({ ok: true, documento: publicDocumentoDetail(fresh, req.user) });
  } catch (err) {
    console.error("[alojamientos-mi] conformidadAnexo23 error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al registrar conformidad" });
  }
}

module.exports = {
  ocupacionActual,
  listarOcupaciones,
  listarLiquidaciones,
  obtenerUltimaLiquidacion,
  listarNovedades,
  obtenerDatosDeclarados,
  actualizarDatosDeclarados,
  historialDatosDeclarados,
  obtenerDatosDeclaradosUpdate,
  listarDocumentos,
  obtenerDocumento,
  descargarDocumentoPdf,
  conformidadAnexo23,
};
