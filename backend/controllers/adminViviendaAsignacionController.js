// backend/controllers/viviendaAsignacionController.js

const Vivienda = require("../models/vivienda");
const User = require("../models/User");

/**
 * POST /api/admin/viviendas/:viviendaId/asignar
 *
 * Flujo ANEXO 02:
 * - Asigna una vivienda a un postulante ACEPTADO
 * - NO marca la vivienda como OCUPADA todavía
 * - NO toca ocupacionActual
 * - Guarda la asignación proyectada en meta.asignacionProyectada
 */
async function asignarViviendaAPostulante(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) {
      return res.status(404).json({ error: "Recurso no disponible" });
    }
    if (actor.role !== "ADMIN_GENERAL") {
      return res.status(404).json({ error: "Recurso no disponible" });
    }

    const { viviendaId } = req.params;
    const { postulanteId, origen, fechaAsignacion, observaciones } = req.body || {};

    if (!postulanteId) {
      return res.status(400).json({
        message: "El campo 'postulanteId' es obligatorio.",
      });
    }

    // 1) Buscar vivienda
    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ message: "Vivienda no encontrada." });
    }

    // Regla conservadora: solo asignar si no está OCUPADA
    // (Podés ajustar la regla si querés permitir otros casos)
    if (vivienda.estado === "OCUPADA") {
      return res.status(409).json({
        message:
          "La vivienda ya figura como OCUPADA. No se puede asignar a un nuevo postulante.",
      });
    }

    // 2) Buscar postulante
    const postulante = await User.findById(postulanteId);
    if (!postulante) {
      return res.status(404).json({ message: "Postulante no encontrado." });
    }

    // Regla ANEXO 02: debe estar ACEPTADO
    if (postulante.estadoHabitacional !== "ACEPTADO") {
      return res.status(409).json({
        message:
          "El postulante no está en estado ACEPTADO. No corresponde asignar vivienda (ANEXO 02).",
      });
    }

    // 3) Construir asignación proyectada
    const fecha = fechaAsignacion ? new Date(fechaAsignacion) : new Date();

    const asignacionProyectada = {
      postulante: postulante._id,
      nombreCompleto: `${postulante.apellido || ""} ${postulante.nombre || ""}`.trim(),
      email: postulante.email,
      roleEnMomentoAsignacion: postulante.role,
      estadoHabitacionalEnMomentoAsignacion: postulante.estadoHabitacional || null,
      fechaAsignacion: fecha,
      origen: origen || "ANEXO_02",
      observaciones: observaciones || null,
    };

    // 4) Guardar en meta.asignacionProyectada sin tocar estado ni ocupacionActual
    vivienda.meta = vivienda.meta || {};
    vivienda.meta.asignacionProyectada = asignacionProyectada;

    await vivienda.save();

    return res.status(200).json({
      message:
        "Asignación proyectada registrada correctamente (ANEXO 02: vivienda asignada sin ocupación hasta ANEXO 03).",
      vivienda,
    });
  } catch (error) {
    console.error("[Asignación Vivienda] Error al asignar vivienda:", error);
    return next(error);
  }
}

module.exports = {
  asignarViviendaAPostulante,
};
