const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");

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

module.exports = {
  listarElegiblesAsignacion,
};
