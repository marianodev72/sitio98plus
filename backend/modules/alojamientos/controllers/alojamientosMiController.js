const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");
const { User } = require("../../../models/user");

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

function canQueryOcupacion(user, asignacion) {
  if (!user?._id) return false;
  if (up(user.role) === "ALOJADO") return true;
  if (up(user.estadoHabitacional) === "ALOJADO_ACTIVO") return true;
  return Boolean(asignacion && sameId(asignacion.alojado, user._id));
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

module.exports = {
  ocupacionActual,
};
