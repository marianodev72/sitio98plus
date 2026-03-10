const mongoose = require("mongoose");

let User = null;
try {
  ({ User } = require("../models/User"));
} catch {
  ({ User } = require("../models/user"));
}

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const up = (v) => String(v || "").toUpperCase().trim();

function genericDenied(res) {
  return res
    .status(403)
    .json({ message: "La página solicitada no está disponible. Por favor, contacte al administrador." });
}

function badRequest(res) {
  return res.status(400).json({ message: "Datos inválidos" });
}

// POST /api/admin/asignar-inspector
// body: { inspectorId, barrio }
async function asignarInspector(req, res) {
  try {
    const user = req.user;
    if (up(user?.role) !== "ADMIN_GENERAL") return genericDenied(res);
    if (!User) return genericDenied(res);

    const inspectorId = String(req.body?.inspectorId || "").trim();
    const barrio = String(req.body?.barrio || "").trim();

    if (!isObjectId(inspectorId) || !barrio) return badRequest(res);

    const nuevo = await User.findById(inspectorId);
    if (!nuevo) return genericDenied(res);

    // 1) Encontrar inspector actual de ese barrio (si existe)
    const actual = await User.findOne({
      barrioAsignado: barrio,
      permisos: "INSPECTOR",
      activo: true,
      bloqueado: false,
      archivado: { $ne: true },
    });

    // 2) Sacar permiso al actual
    if (actual && String(actual._id) !== String(nuevo._id)) {
      const perms = Array.isArray(actual.permisos) ? actual.permisos : [];
      actual.permisos = perms.filter((p) => up(p) !== "INSPECTOR");
      await actual.save();
    }

    // 3) Asignar barrio + permiso INSPECTOR al nuevo
    nuevo.barrioAsignado = barrio;

    const permsNuevo = Array.isArray(nuevo.permisos) ? nuevo.permisos : [];
    if (!permsNuevo.some((p) => up(p) === "INSPECTOR")) permsNuevo.push("INSPECTOR");
    nuevo.permisos = permsNuevo;

    await nuevo.save();

    return res.json({
      message: "Inspector asignado",
      inspector: {
        _id: nuevo._id,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        barrioAsignado: nuevo.barrioAsignado,
        permisos: nuevo.permisos,
      },
      inspectorAnterior: actual
        ? {
            _id: actual._id,
            nombre: actual.nombre,
            apellido: actual.apellido,
            barrioAsignado: actual.barrioAsignado,
            permisos: actual.permisos,
          }
        : null,
    });
  } catch (e) {
    console.error("[ASIGNAR INSPECTOR] Error:", e);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { asignarInspector };
