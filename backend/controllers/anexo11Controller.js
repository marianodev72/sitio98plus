// controllers/anexo11Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Vivienda = require('../models/vivienda');

/**
 * Crear ANEXO 11 – Pedido de Trabajo
 */
async function crearAnexo11(req, res) {
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

    const nuevoA11 = new FormSubmission({
      tipo: 'ANEXO_11',
      creadoPor: req.user._id,
      postulanteId: permisionarioId,
      viviendaId,
      estadoTramite: 'EN_ANALISIS',
      metadata,
    });

    await nuevoA11.save();

    return res.status(201).json({
      message: 'ANEXO 11 creado correctamente',
      anexo11Id: nuevoA11._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 11:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 11' });
  }
}

/**
 * Obtener por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_11')
      return res.status(404).json({ error: 'ANEXO 11 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error obtener ANEXO 11:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, viviendaId } = req.query;

    const filtro = { tipo: 'ANEXO_11' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.permisionario.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.permisionario.mr'] = mr;
    if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId))
      filtro.viviendaId = viviendaId;

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 11:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado (solo Admin General)
 */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const permitidos = ['EN_ANALISIS', 'APROBADO', 'RECHAZADO', 'CERRADO'];

    if (!permitidos.includes(nuevoEstado))
      return res.status(400).json({ error: 'Estado inválido' });

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_11')
      return res.status(404).json({ error: 'ANEXO 11 no encontrado' });

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado actualizado correctamente',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error cambiar estado ANEXO 11:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo11,
  obtenerPorId,
  listar,
  cambiarEstado,
};
