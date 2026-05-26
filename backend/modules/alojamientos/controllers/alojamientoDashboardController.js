const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminLike(user) {
  const role = up(user?.role);
  return role === "ADMIN_GENERAL" || role === "ADMIN";
}

function rowsToMap(rows) {
  return (rows || []).reduce((acc, row) => {
    const key = String(row?._id || "SIN_DATO");
    acc[key] = Number(row?.count || 0);
    return acc;
  }, {});
}

async function groupCount(model, field) {
  return model.aggregate([
    {
      $group: {
        _id: { $ifNull: [`$${field}`, "SIN_DATO"] },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function getResumen(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const [
      totalAlojamientos,
      totalPlazas,
      plazasPorEstadoRows,
      alojamientosPorEstadoRows,
      alojamientosPorLugarRows,
      alojamientosPorClaseRows,
      alojamientosPorGeneroRows,
      alojamientosPorGrupoJerarquicoRows,
      alojamientosGeneroNoEspecificado,
      alojamientosGrupoNoDefinido,
      alojamientosFueraServicio,
      alojamientosInhabilitados,
      alojamientosSinPlazas,
      plazasMantenimiento,
      plazasInhabilitadas,
    ] = await Promise.all([
      AlojamientoNaval.countDocuments({}),
      AlojamientoPlaza.countDocuments({}),
      groupCount(AlojamientoPlaza, "estado"),
      groupCount(AlojamientoNaval, "estado"),
      groupCount(AlojamientoNaval, "lugar"),
      groupCount(AlojamientoNaval, "clase"),
      groupCount(AlojamientoNaval, "generoPermitido"),
      groupCount(AlojamientoNaval, "aptoParaGrupoJerarquico"),
      AlojamientoNaval.countDocuments({ generoPermitido: "NO_ESPECIFICADO", activo: true }),
      AlojamientoNaval.countDocuments({ aptoParaGrupoJerarquico: "NO_DEFINIDO", activo: true }),
      AlojamientoNaval.countDocuments({ estado: "FUERA_SERVICIO", activo: true }),
      AlojamientoNaval.countDocuments({ estado: "INHABILITADO", activo: true }),
      AlojamientoNaval.countDocuments({
        activo: true,
        $or: [
          { "ocupacionActual.plazasTotales": { $exists: false } },
          { "ocupacionActual.plazasTotales": { $lte: 0 } },
        ],
      }),
      AlojamientoPlaza.countDocuments({ estado: "MANTENIMIENTO", activo: true }),
      AlojamientoPlaza.countDocuments({ estado: "INHABILITADA", activo: true }),
    ]);

    const plazasPorEstado = rowsToMap(plazasPorEstadoRows);
    const alojamientosPorEstado = rowsToMap(alojamientosPorEstadoRows);

    const alertas = [
      {
        codigo: "GENERO_NO_ESPECIFICADO",
        severidad: alojamientosGeneroNoEspecificado > 0 ? "MEDIA" : "INFO",
        cantidad: alojamientosGeneroNoEspecificado,
        texto: "Alojamientos activos con genero permitido no especificado",
      },
      {
        codigo: "GRUPO_JERARQUICO_NO_DEFINIDO",
        severidad: alojamientosGrupoNoDefinido > 0 ? "MEDIA" : "INFO",
        cantidad: alojamientosGrupoNoDefinido,
        texto: "Alojamientos activos sin grupo jerarquico definido",
      },
      {
        codigo: "ALOJAMIENTOS_FUERA_SERVICIO",
        severidad: alojamientosFueraServicio > 0 ? "ALTA" : "INFO",
        cantidad: alojamientosFueraServicio,
        texto: "Alojamientos activos fuera de servicio",
      },
      {
        codigo: "ALOJAMIENTOS_INHABILITADOS",
        severidad: alojamientosInhabilitados > 0 ? "ALTA" : "INFO",
        cantidad: alojamientosInhabilitados,
        texto: "Alojamientos activos inhabilitados",
      },
      {
        codigo: "PLAZAS_MANTENIMIENTO",
        severidad: plazasMantenimiento > 0 ? "MEDIA" : "INFO",
        cantidad: plazasMantenimiento,
        texto: "Plazas activas en mantenimiento",
      },
      {
        codigo: "PLAZAS_INHABILITADAS",
        severidad: plazasInhabilitadas > 0 ? "MEDIA" : "INFO",
        cantidad: plazasInhabilitadas,
        texto: "Plazas activas inhabilitadas",
      },
      {
        codigo: "ALOJAMIENTOS_SIN_PLAZAS",
        severidad: alojamientosSinPlazas > 0 ? "MEDIA" : "INFO",
        cantidad: alojamientosSinPlazas,
        texto: "Alojamientos activos sin plazas registradas",
      },
    ];

    return res.json({
      ok: true,
      resumen: {
        totalAlojamientos: Number(totalAlojamientos || 0),
        totalPlazas: Number(totalPlazas || 0),
        plazasLibres: Number(plazasPorEstado.LIBRE || 0),
        plazasOcupadas: Number(plazasPorEstado.OCUPADA || 0),
        plazasReservadas: Number(plazasPorEstado.RESERVADA || 0),
        alojamientosPorEstado,
        plazasPorEstado,
        distribucionPorLugar: alojamientosPorLugarRows,
        distribucionPorClase: alojamientosPorClaseRows,
        distribucionPorGeneroPermitido: alojamientosPorGeneroRows,
        distribucionPorGrupoJerarquico: alojamientosPorGrupoJerarquicoRows,
        alertas,
      },
    });
  } catch (err) {
    console.error("[alojamientos-dashboard] resumen error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener resumen de alojamientos" });
  }
}

module.exports = {
  getResumen,
};
