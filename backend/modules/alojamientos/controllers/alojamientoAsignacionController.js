const { dryRunAsignacion } = require("../services/alojamientoAsignacionService");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

async function dryRun(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);

    const { plazaId, alojadoId, origen } = req.body || {};
    const result = await dryRunAsignacion({ plazaId, alojadoId, origen });

    return res.json(result);
  } catch (err) {
    console.error("[alojamientos-asignaciones] dry-run error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al validar asignacion" });
  }
}

module.exports = {
  dryRun,
};
