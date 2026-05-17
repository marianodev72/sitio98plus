const { listarElegiblesAsignacion } = require("../services/alojamientoPlazaService");

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

    const plazas = await listarElegiblesAsignacion();
    return res.json({ ok: true, total: plazas.length, plazas });
  } catch (err) {
    console.error("[alojamientos-plazas] listar elegibles error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar plazas elegibles" });
  }
}

module.exports = {
  listarElegibles,
};
