const crypto = require("crypto");

const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");
const AlojamientoDocumento = require("../models/AlojamientoDocumento");
const { User } = require("../../../models/user");
const anexo23Service = require("../services/documentos/anexo23Service");
const alojamientoDocumentoPdfService = require("../services/documentos/alojamientoDocumentoPdfService");
const { renderAnexo22Pdf } = require("../pdf/anexo22PdfRenderer");
const { renderAnexo23Pdf } = require("../pdf/anexo23PdfRenderer");

function up(value) {
  return String(value || "").toUpperCase().trim();
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
  listarDocumentos,
  obtenerDocumento,
  descargarDocumentoPdf,
  conformidadAnexo23,
};
