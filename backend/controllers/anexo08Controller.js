// controllers/anexo08Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Vivienda = require('../models/vivienda');

/**
 * Crear ANEXO 08 – Acta de inspección previa
 *
 * Normalmente creado por:
 * - INSPECTOR
 * - JEFE_DE_BARRIO
 * - ADMIN
 * - ADMIN_GENERAL
 */
async function crearAnexo08(req, res) {
  try {
    const { permisionarioId, viviendaId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(permisionarioId)) {
      return res.status(400).json({ error: 'permisionarioId inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(viviendaId)) {
      return res.status(400).json({ error: 'viviendaId inválido' });
    }

    const permisionario = await User.findById(permisionarioId);
    if (!permisionario) {
      return res.status(404).json({ error: 'Permisionario no encontrado' });
    }

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    const nuevoAnexo08 = new FormSubmission({
      tipo: 'ANEXO_08',
      creadoPor: req.user._id,
      postulanteId: permisionarioId,
      viviendaId: viviendaId,
      estadoTramite: 'EN_REVISION',
      metadata,
    });

    await nuevoAnexo08.save();

    return res.status(201).json({
      message: 'ANEXO 08 creado correctamente',
      anexo08Id: nuevoAnexo08._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 08:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 08' });
  }
}

/**
 * Obtener ANEXO 08 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_08') {
      return res.status(404).json({ error: 'ANEXO 08 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 08:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 08
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, viviendaId } = req.query;

    const filtro = { tipo: 'ANEXO_08' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.datosPermisionario.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.datosPermisionario.mr'] = mr;
    if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId)) {
      filtro.viviendaId = viviendaId;
    }

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 08:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado (solo ADMIN_GENERAL)
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
    if (!anexo || anexo.tipo !== 'ANEXO_08') {
      return res.status(404).json({ error: 'ANEXO 08 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado actualizado correctamente',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error al cambiar estado ANEXO 08:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo08,
  obtenerPorId,
  listar,
  cambiarEstado,
};
