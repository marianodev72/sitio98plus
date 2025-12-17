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
          "La vivienda ya figura como OCUPADA. No se puede registrar una nueva asignación proyectada.",
      });
    }

    // 2) Buscar postulante
    const postulante = await User.findById(postulanteId).select(
      "_id nombre apellido email role estadoHabitacional"
    );

    if (!postulante) {
      return res
        .status(404)
        .json({ message: "Postulante no encontrado en el sistema." });
    }

    // Validación suave de rol: no rompemos si el backend cambia algo,
    // pero ayudamos a no asignar cualquier usuario.
    if (postulante.role !== "POSTULANTE") {
      return res.status(400).json({
        message:
          "El usuario seleccionado no tiene rol POSTULANTE. Revise el flujo de aceptación antes de asignar.",
      });
    }

    // 3) Armar asignación proyectada (ANEXO 02)
    const now = new Date();
    const fecha = fechaAsignacion ? new Date(fechaAsignacion) : now;

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
