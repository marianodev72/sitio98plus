const { listarElegiblesAsignacionConContexto } = require("../services/alojamientoPlazaService");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

async function listarElegibles(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);

    const result = await listarElegiblesAsignacionConContexto({
      anexo21Id: req.query?.anexo21Id,
      alojadoId: req.query?.alojadoId,
    });

    if (!result?.ok) return deny(res);

    return res.json({
      ok: true,
      total: result.plazas.length,
      plazas: result.plazas,
    });
  } catch (err) {
    console.error("[alojamientos-plazas] listar elegibles error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar plazas elegibles" });
  }
}

module.exports = {
  listarElegibles,
};
