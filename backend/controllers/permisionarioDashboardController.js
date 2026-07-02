const mongoose = require("mongoose");
const MisDatosDeclaradosUpdate = require("../models/MisDatosDeclaradosUpdate");
const { FormSubmission } = require("../models/FormSubmission");
const { User } = require("../models/user");
const Vivienda = require("../models/vivienda");
const { normalizarGradoVisual } = require("../utils/normalizarGradoVisual");
const { normalizarNombrePropio, normalizarNombreCompletoVisual } = require("../utils/normalizarNombrePropio");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function clean(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}

function objectWithContent(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function toObjectId(value) {
  return isObjectId(value) ? new mongoose.Types.ObjectId(String(value)) : null;
}

function pickFirst(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function buildDatosEfectivosMisDatos(update) {
  const baseDatos = objectWithContent(update?.baseDatos) ? update.baseDatos : {};
  const datosActualizados = objectWithContent(update?.datosActualizados) ? update.datosActualizados : {};
  const merged = { ...baseDatos, ...datosActualizados };
  if (objectWithContent(merged)) return merged;
  return objectWithContent(update?.datos) ? update.datos : {};
}

function esMisDatosVigente(update) {
  const estado = up(update?.estado || "REGISTRADO");
  if (!estado) return true;
  if (["RECHAZADO", "ANULADO", "OBSERVADO", "PENDIENTE"].includes(estado)) return false;
  return ["REGISTRADO", "APROBADO", "VALIDADO", "VIGENTE"].includes(estado);
}

function normalizeIdentidadFromDatos(datos, role) {
  const gradoEscalafon = normalizarGradoVisual(
    pickFirst(datos?.gradoEscalafon, datos?.grado, datos?.gradoActual)
  );
  const apellido = normalizarNombrePropio(pickFirst(datos?.apellido, datos?.apellidos));
  const nombres = normalizarNombrePropio(pickFirst(datos?.nombres, datos?.nombre));
  const nombreCompleto = normalizarNombreCompletoVisual(
    pickFirst(datos?.nombreCompleto, datos?.apellidoNombre) || [apellido, nombres]
  );
  const matricula = pickFirst(datos?.matricula, datos?.nroMatricula, datos?.numeroMatricula);
  const displayName = [gradoEscalafon, apellido, nombres].filter(Boolean).join(" ") || nombreCompleto || "Sesión activa";

  return {
    gradoEscalafon,
    apellido,
    nombres,
    nombreCompleto,
    matricula,
    displayName,
    rol: role || "PERMISIONARIO",
  };
}

function normalizeIdentidadFromUser(user) {
  const gradoEscalafon = normalizarGradoVisual(pickFirst(user?.grado, user?.gradoEscalafon, user?.meta?.grado));
  const apellido = normalizarNombrePropio(user?.apellido);
  const nombres = normalizarNombrePropio(user?.nombre);
  const nombreCompleto = normalizarNombreCompletoVisual(
    pickFirst(user?.nombreCompleto, user?.meta?.nombreCompleto) || [apellido, nombres]
  );
  const matricula = pickFirst(user?.matricula, user?.meta?.matricula);
  const displayName = [gradoEscalafon, apellido, nombres].filter(Boolean).join(" ") || nombreCompleto || "Sesión activa";

  return {
    gradoEscalafon,
    apellido,
    nombres,
    nombreCompleto,
    matricula,
    displayName,
    rol: user?.role || "PERMISIONARIO",
  };
}

function identidadMinima(role) {
  return {
    gradoEscalafon: "",
    apellido: "",
    nombres: "",
    nombreCompleto: "",
    matricula: "",
    displayName: "Sesión activa",
    rol: role || "PERMISIONARIO",
  };
}

function hasIdentidadSuficiente(identidad) {
  return Boolean(
    identidad?.gradoEscalafon ||
      identidad?.apellido ||
      identidad?.nombres ||
      identidad?.nombreCompleto ||
      identidad?.matricula
  );
}

async function resolveIdentidad(user, userObjectId) {
  const role = user?.role || "PERMISIONARIO";
  const updates = await MisDatosDeclaradosUpdate.find({ usuario: userObjectId })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(10)
    .lean();

  const updateVigente = updates.find(esMisDatosVigente);
  if (updateVigente) {
    const datos = buildDatosEfectivosMisDatos(updateVigente);
    const identidad = normalizeIdentidadFromDatos(datos, role);
    if (hasIdentidadSuficiente(identidad)) {
      return {
        identidad,
        fuenteIdentidad: "MIS_DATOS_DECLARADOS",
        ultimaActualizacion: {
          _id: String(updateVigente._id),
          estado: updateVigente.estado || null,
          createdAt: updateVigente.createdAt || null,
          updatedAt: updateVigente.updatedAt || null,
        },
      };
    }
  }

  const anexos01 = await FormSubmission.find({ usuario: userObjectId, codigo: "ANEXO_01" })
    .select("_id codigo estado estadoInstitucional datos createdAt updatedAt")
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(10)
    .lean();
  const anexo01 =
    anexos01.find((item) => ["APROBADO", "CERRADO"].includes(up(item?.estado))) ||
    anexos01.find((item) => up(item?.estado) !== "RECHAZADO") ||
    anexos01[0] ||
    null;

  if (anexo01) {
    const identidad = normalizeIdentidadFromDatos(anexo01.datos || {}, role);
    if (hasIdentidadSuficiente(identidad)) {
      return {
        identidad,
        fuenteIdentidad: "ANEXO_01",
        ultimaActualizacion: null,
      };
    }
  }

  const identidadRegistro = normalizeIdentidadFromUser(user);
  if (hasIdentidadSuficiente(identidadRegistro)) {
    return {
      identidad: identidadRegistro,
      fuenteIdentidad: "REGISTRO",
      ultimaActualizacion: null,
    };
  }

  return {
    identidad: identidadMinima(role),
    fuenteIdentidad: "SESION_MINIMA",
    ultimaActualizacion: null,
  };
}

function viviendaDisplay(vivienda) {
  if (!vivienda) return null;
  const codigo = clean(vivienda.codigo);
  const barrio = clean(vivienda.barrio);
  const estado = clean(vivienda.estado);
  if (!codigo && !barrio && !estado) return null;
  return { codigo, barrio, estado };
}

async function resolveViviendaReal(user, userObjectId) {
  const viviendaRefs = [user?.viviendaAsignada, user?.viviendaAsignadaId]
    .map((value) => clean(value))
    .filter((value, index, list) => value && list.indexOf(value) === index);

  for (const viviendaId of viviendaRefs) {
    if (!isObjectId(viviendaId)) continue;
    const vivienda = await Vivienda.findById(viviendaId)
      .select("codigo barrio estado ocupacionActual permisionarioId usuarioId")
      .lean();
    const display = viviendaDisplay(vivienda);
    if (display) return display;
  }

  const userId = String(userObjectId);
  const vivienda = await Vivienda.findOne({
    $or: [
      { "ocupacionActual.permisionario": userObjectId },
      { "ocupacionActual.permisionario": userId },
      { permisionarioId: userObjectId },
      { permisionarioId: userId },
      { usuarioId: userObjectId },
      { usuarioId: userId },
    ],
  })
    .select("codigo barrio estado")
    .lean();

  return viviendaDisplay(vivienda);
}

async function resolveUltimaGestion(userObjectId) {
  const gestion = await FormSubmission.findOne({ usuario: userObjectId })
    .select("_id codigo estado estadoInstitucional createdAt updatedAt")
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  if (!gestion) return null;
  return {
    _id: String(gestion._id),
    codigo: gestion.codigo || "",
    estado: gestion.estado || "",
    estadoInstitucional: gestion.estadoInstitucional || null,
    createdAt: gestion.createdAt || null,
    updatedAt: gestion.updatedAt || null,
  };
}

async function getPermisionarioDashboardResumen(req, res) {
  try {
    const userId = clean(req.user?._id || req.user?.id);
    const userObjectId = toObjectId(userId);
    if (!userObjectId) return res.status(401).json({ message: "No autenticado" });

    const dbUser = await User.findById(userObjectId)
      .select(
        "_id nombre apellido nombreCompleto matricula grado gradoEscalafon meta role permisos activo bloqueado archivado viviendaAsignada viviendaAsignadaId"
      )
      .lean();

    if (!dbUser || dbUser.activo === false || dbUser.bloqueado === true || dbUser.archivado === true) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const role = up(dbUser.role || req.user?.role);
    if (role !== "PERMISIONARIO") {
      return res.status(403).json({ message: "No autorizado" });
    }

    const [identidadResult, vivienda, ultimaGestion] = await Promise.all([
      resolveIdentidad(dbUser, userObjectId),
      resolveViviendaReal(dbUser, userObjectId),
      resolveUltimaGestion(userObjectId),
    ]);

    return res.json({
      identidad: identidadResult.identidad,
      vivienda,
      fuenteIdentidad: identidadResult.fuenteIdentidad,
      ultimaActualizacion: identidadResult.ultimaActualizacion,
      ultimaGestion,
    });
  } catch (err) {
    console.error("[permisionarioDashboard] resumen", err);
    return res.status(500).json({ message: "Error obteniendo resumen del panel permisionario" });
  }
}

module.exports = {
  getPermisionarioDashboardResumen,
};

