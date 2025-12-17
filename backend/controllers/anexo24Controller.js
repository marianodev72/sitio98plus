// controllers/anexo24Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * Crear ANEXO 24 – Ampliación de novedades de alojamiento
 * No cambia estados institucionales (no modifica usuario ni alojamiento).
 */
async function crearAnexo24(req, res) {
  try {
    const { huespedId, alojamientoId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(huespedId)) {
      return res.status(400).json({ error: 'huespedId inválido' });
    }
    if (!mongoose.Types.ObjectId.isValid(alojamientoId)) {
      return res.status(400).json({ error: 'alojamientoId inválido' });
    }

    const huesped = await User.findById(huespedId);
    if (!huesped) {
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const anexo24 = new FormSubmission({
      tipo: 'ANEXO_24',
      creadoPor: req.user._id,
      postulanteId: huespedId,
      alojamientoId,
      estadoTramite: 'EN_REVISION',
      metadata,
    });

    await anexo24.save();

    return res.status(201).json({
      message: 'ANEXO 24 creado correctamente',
      anexo24Id: anexo24._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 24:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 24' });
  }
}

/**
 * Obtener ANEXO 24 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_24') {
      return res.status(404).json({ error: 'ANEXO 24 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 24:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 24 (solo ADMIN / ADMIN_GENERAL)
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, alojamientoId } = req.query;

    const filtro = { tipo: 'ANEXO_24' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido) {
      filtro['metadata.huesped.apellido'] = new RegExp(apellido, 'i');
    }
    if (mr) {
      filtro['metadata.huesped.mr'] = new RegExp(mr, 'i');
    }
    if (alojamientoId && mongoose.Types.ObjectId.isValid(alojamientoId)) {
      filtro.alojamientoId = alojamientoId;
    }

    const lista = await FormSubmission.find(filtro).lean();
    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 24:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado del ANEXO 24 (solo ADMIN_GENERAL)
 */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const permitidos = ['EN_REVISION', 'CERRADO', 'ANULADO'];

    if (!permitidos.includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_24') {
      return res.status(404).json({ error: 'ANEXO 24 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado de ANEXO 24 actualizado',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error al cambiar estado ANEXO 24:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo24,
  obtenerPorId,
  listar,
  cambiarEstado,
};
