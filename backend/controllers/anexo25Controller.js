// controllers/anexo25Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * Crear ANEXO 25 – Acta de inspección previa de alojamiento
 * NO cambia estados de usuario ni de alojamiento: solo documentación.
 */
async function crearAnexo25(req, res) {
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

    const anexo25 = new FormSubmission({
      tipo: 'ANEXO_25',
      creadoPor: req.user._id,
      postulanteId: huespedId,
      alojamientoId,
      estadoTramite: 'EN_REVISION',
      metadata,
    });

    await anexo25.save();

    return res.status(201).json({
      message: 'ANEXO 25 creado correctamente',
      anexo25Id: anexo25._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 25:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 25' });
  }
}

/**
 * Obtener ANEXO 25 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_25') {
      return res.status(404).json({ error: 'ANEXO 25 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 25:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 25 (solo ADMIN / ADMIN_GENERAL)
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, alojamientoId } = req.query;

    const filtro = { tipo: 'ANEXO_25' };

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
    console.error('Error al listar ANEXO 25:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado del ANEXO 25 (solo ADMIN_GENERAL)
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
    if (!anexo || anexo.tipo !== 'ANEXO_25') {
      return res.status(404).json({ error: 'ANEXO 25 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado de ANEXO 25 actualizado',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error al cambiar estado ANEXO 25:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo25,
  obtenerPorId,
  listar,
  cambiarEstado,
};
