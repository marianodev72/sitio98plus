// controllers/anexo09Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Vivienda = require('../models/vivienda');

/**
 * Crear ANEXO 09 – Acta de entrega de vivienda
 * Este anexo CIERRA la ocupación y libera formalmente la unidad habitacional.
 */
async function crearAnexo09(req, res) {
  try {
    const { permisionarioId, viviendaId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(permisionarioId))
      return res.status(400).json({ error: 'permisionarioId inválido' });

    if (!mongoose.Types.ObjectId.isValid(viviendaId))
      return res.status(400).json({ error: 'viviendaId inválido' });

    const usuario = await User.findById(permisionarioId);
    if (!usuario)
      return res.status(404).json({ error: 'Permisionario no encontrado' });

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda)
      return res.status(404).json({ error: 'Vivienda no encontrada' });

    // Crear documento del Anexo
    const anexo09 = new FormSubmission({
      tipo: 'ANEXO_09',
      creadoPor: req.user._id,
      postulanteId: permisionarioId,
      viviendaId,
      estadoTramite: 'CERRADO',
      metadata,
    });

    await anexo09.save();

    // ─────────────────────────────────────────────
    // LÓGICA INSTITUCIONAL DE ENTREGA DE VIVIENDA
    // ─────────────────────────────────────────────

    // Historial
    vivienda.historialOcupacion.push({
      permisionario: usuario._id,
      fechaIngreso:
        vivienda.ocupacionActual?.fechaAsignacion || usuario.createdAt,
      fechaEgreso: new Date(),
      motivo: 'ENTREGA - ANEXO 09',
    });

    // Limpiar ocupación actual
    vivienda.ocupacionActual = null;

    // ELECCIÓN: ¿queda RESERVADA o DISPONIBLE?
    // Por ahora: siempre DISPONIBLE (si querés puedo agregar lógica de reserva)
    vivienda.estado = 'DISPONIBLE';

    await vivienda.save();

    // Usuario sin vivienda
    usuario.viviendaAsignada = null;
    usuario.estadoHabitacional = 'SIN_VIVIENDA';
    await usuario.save();

    return res.status(201).json({
      message: 'ANEXO 09 generado y vivienda liberada correctamente',
      anexo09Id: anexo09._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 09:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 09' });
  }
}

/**
 * Obtener ANEXO 09 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id).lean();

    if (!anexo || anexo.tipo !== 'ANEXO_09')
      return res.status(404).json({ error: 'ANEXO 09 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 09:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar todos
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, viviendaId } = req.query;

    const filtro = { tipo: 'ANEXO_09' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.datosPermisionario.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.datosPermisionario.mr'] = mr;
    if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId))
      filtro.viviendaId = viviendaId;

    const lista = await FormSubmission.find(filtro).lean();
    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 09:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo09,
  obtenerPorId,
  listar,
};
