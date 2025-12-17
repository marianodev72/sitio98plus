// controllers/anexo28Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * Crear ANEXO 28 – Pedido de trabajo de alojamiento naval
 * No cambia estados institucionales por sí solo (solo trámite técnico).
 */
async function crearAnexo28(req, res) {
  try {
    const { huespedId, alojamientoId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(huespedId))
      return res.status(400).json({ error: 'huespedId inválido' });

    if (!mongoose.Types.ObjectId.isValid(alojamientoId))
      return res.status(400).json({ error: 'alojamientoId inválido' });

    const huesped = await User.findById(huespedId);
    if (!huesped)
      return res.status(404).json({ error: 'Huésped no encontrado' });

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento)
      return res.status(404).json({ error: 'Alojamiento no encontrado' });

    const nuevoA28 = new FormSubmission({
      tipo: 'ANEXO_28',
      creadoPor: req.user._id,
      postulanteId: huespedId,
      alojamientoId,
      estadoTramite: 'EN_ANALISIS',
      metadata,
    });

    await nuevoA28.save();

    return res.status(201).json({
      message: 'ANEXO 28 creado correctamente',
      anexo28Id: nuevoA28._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 28:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 28' });
  }
}

/**
 * Obtener ANEXO 28 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_28')
      return res.status(404).json({ error: 'ANEXO 28 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error obtener ANEXO 28:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 28
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, alojamientoId } = req.query;

    const filtro = { tipo: 'ANEXO_28' };

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
    console.error('Error listar ANEXO 28:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado de ANEXO 28 (solo ADMIN_GENERAL)
 */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const permitidos = ['EN_ANALISIS', 'APROBADO', 'RECHAZADO', 'CERRADO'];

    if (!permitidos.includes(nuevoEstado))
      return res.status(400).json({ error: 'Estado inválido' });

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_28')
      return res.status(404).json({ error: 'ANEXO 28 no encontrado' });

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado de ANEXO 28 actualizado',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error cambiar estado ANEXO 28:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo28,
  obtenerPorId,
  listar,
  cambiarEstado,
};
