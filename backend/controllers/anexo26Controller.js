// controllers/anexo26Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * Crear ANEXO 26 – Acta de entrega de alojamiento
 * Este anexo CIERRA la ocupación de la unidad.
 */
async function crearAnexo26(req, res) {
  try {
    const { huespedId, alojamientoId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(huespedId))
      return res.status(400).json({ error: 'huespedId inválido' });
    if (!mongoose.Types.ObjectId.isValid(alojamientoId))
      return res.status(400).json({ error: 'alojamientoId inválido' });

    const usuario = await User.findById(huespedId);
    if (!usuario)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento)
      return res.status(404).json({ error: 'Alojamiento no encontrado' });

    const anexo26 = new FormSubmission({
      tipo: 'ANEXO_26',
      creadoPor: req.user._id,
      postulanteId: huespedId,
      alojamientoId,
      estadoTramite: 'CERRADO',
      metadata,
    });

    await anexo26.save();

    // ─────────────────────────────────────────────
    // IMPACTO INSTITUCIONAL
    // ─────────────────────────────────────────────

    // Historial
    alojamiento.historialOcupacion = alojamiento.historialOcupacion || [];
    alojamiento.historialOcupacion.push({
      usuario: usuario._id,
      fechaIngreso:
        alojamiento.ocupacionActual?.fecha || usuario.createdAt,
      fechaEgreso: new Date(),
      motivo: 'ENTREGA - ANEXO 26',
    });

    // Liberar alojamiento
    alojamiento.ocupacionActual = null;
    alojamiento.estado = 'DISPONIBLE';
    await alojamiento.save();

    // Actualizar usuario
    usuario.alojamientoAsignado = null;
    usuario.estadoHabitacional = 'SIN_ALOJAMIENTO';
    await usuario.save();

    return res.status(201).json({
      message: 'ANEXO 26 creado y alojamiento liberado correctamente',
      anexo26Id: anexo26._id,
    });
  } catch (err) {
    console.error('Error crear ANEXO 26:', err);
    return res.status(500).json({
      error: 'Error interno al crear ANEXO 26',
    });
  }
}

/** Obtener ANEXO 26 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_26')
      return res.status(404).json({ error: 'ANEXO 26 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error obtener ANEXO 26:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/** Listar ANEXO 26 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, alojamientoId } = req.query;
    const filtro = { tipo: 'ANEXO_26' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.huesped.apellido'] = new RegExp(apellido, 'i');
    if (mr)
      filtro['metadata.huesped.mr'] = new RegExp(mr, 'i');
    if (alojamientoId && mongoose.Types.ObjectId.isValid(alojamientoId))
      filtro.alojamientoId = alojamientoId;

    const lista = await FormSubmission.find(filtro).lean();
    return res.json(lista);
  } catch (err) {
    console.error('Error listar ANEXO 26:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo26,
  obtenerPorId,
  listar,
};
