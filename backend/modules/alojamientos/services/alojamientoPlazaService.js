const mongoose = require("mongoose");

const AlojamientoDocumento = require("../models/AlojamientoDocumento");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");
const { validarDisponibilidadPlaza } = require("./alojamientoAsignacionService");

const ESTADOS_ALOJAMIENTO_NO_ASIGNABLES = [
  "MANTENIMIENTO",
  "FUERA_SERVICIO",
  "INHABILITADO",
  "BAJA",
];

const ESTADOS_ASIGNACION_BLOQUEANTES = ["RESERVADA", "ACTIVA"];

function safe(value) {
  return String(value || "").trim();
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function buildLabel(plaza) {
  const alojamiento = plaza.alojamiento || {};
  const alojamientoCodigo = safe(alojamiento.codigo) || safe(plaza.codigo);
  const numeroPlaza = Number(plaza.numeroPlaza || 0);
  const genero = safe(alojamiento.generoPermitido);

  return `${alojamientoCodigo} / Plaza ${numeroPlaza || "-"} / ${genero || "-"}`;
}

function toPublicPlaza(plaza) {
  return {
    _id: plaza._id,
    codigo: plaza.codigo,
    numeroPlaza: plaza.numeroPlaza,
    estado: plaza.estado,
    alojamiento: plaza.alojamiento,
    label: buildLabel(plaza),
    disponible: true,
  };
}

async function listarElegiblesAsignacion() {
  const plazas = await AlojamientoPlaza.find({
    activo: { $ne: false },
    estado: "LIBRE",
    alojadoActual: null,
    $or: [{ reservaActual: null }, { "reservaActual.usuario": null }],
  })
    .populate({
      path: "alojamiento",
      match: {
        activo: { $ne: false },
        estado: { $nin: ESTADOS_ALOJAMIENTO_NO_ASIGNABLES },
        generoPermitido: { $ne: "NO_ESPECIFICADO" },
      },
      select:
        "codigo dependencia lugar sector tipo numero clase capacidad generoPermitido estado activo localidad provincia",
    })
    .sort({ codigo: 1, numeroPlaza: 1 })
    .lean();

  const conAlojamientoValido = plazas.filter((plaza) => plaza.alojamiento);
  if (!conAlojamientoValido.length) return [];

  const plazaIds = conAlojamientoValido.map((plaza) => plaza._id);
  const asignaciones = await AsignacionAlojamiento.find({
    plaza: { $in: plazaIds },
    estado: { $in: ESTADOS_ASIGNACION_BLOQUEANTES },
  })
    .select("plaza")
    .lean();

  const bloqueadas = new Set(asignaciones.map((asignacion) => String(asignacion.plaza)));

  return conAlojamientoValido
    .filter((plaza) => !bloqueadas.has(String(plaza._id)))
    .map(toPublicPlaza);
}

function generoDesdeDocumento(documento) {
  return up(documento?.datos?.genero || documento?.datos?.sexo);
}

async function resolveAlojadoDesdeContexto({ anexo21Id, alojadoId } = {}) {
  if (alojadoId !== undefined && alojadoId !== "") {
    if (!isObjectId(alojadoId)) return { ok: false };
    return { ok: true, alojadoId, generoDocumento: "" };
  }

  if (anexo21Id !== undefined && anexo21Id !== "") {
    if (!isObjectId(anexo21Id)) return { ok: false };

    const documento = await AlojamientoDocumento.findOne({
      _id: anexo21Id,
      codigo: "ANEXO_21",
      activo: { $ne: false },
      estado: { $in: ["ENVIADO", "EN_REVISION"] },
    })
      .select("solicitante alojado datos.genero datos.sexo")
      .lean();

    const solicitante = documento?.solicitante || documento?.alojado;
    if (!solicitante || !isObjectId(solicitante)) return { ok: false };
    return {
      ok: true,
      alojadoId: solicitante,
      generoDocumento: generoDesdeDocumento(documento),
    };
  }

  return { ok: true, alojadoId: null, generoDocumento: "" };
}

async function filtrarCompatiblesConAlojado(plazas, alojadoId, generoDocumento = "") {
  if (!alojadoId) return plazas;

  const evaluadas = await Promise.all(
    plazas.map(async (plaza) => {
      const disponibilidad = await validarDisponibilidadPlaza({
        plazaId: plaza._id,
        alojadoId,
        generoDocumento,
      });
      return disponibilidad?.puedeAsignar ? plaza : null;
    })
  );

  return evaluadas.filter(Boolean);
}

async function listarElegiblesAsignacionConContexto(contexto = {}) {
  const resolved = await resolveAlojadoDesdeContexto(contexto);
  if (!resolved.ok) return { ok: false, status: 404 };

  const plazas = await listarElegiblesAsignacion();
  const compatibles = await filtrarCompatiblesConAlojado(
    plazas,
    resolved.alojadoId,
    resolved.generoDocumento
  );

  return {
    ok: true,
    plazas: compatibles,
    contexto: {
      anexo21Id: safe(contexto.anexo21Id),
      alojadoId: resolved.alojadoId ? String(resolved.alojadoId) : null,
      generoDocumento: resolved.generoDocumento || null,
      tipo: up(contexto.anexo21Id) ? "ANEXO_21" : null,
    },
  };
}

module.exports = {
  listarElegiblesAsignacion,
  listarElegiblesAsignacionConContexto,
};
