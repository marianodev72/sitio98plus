// controllers/anexo04Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Vivienda = require('../models/vivienda'); // usamos el modelo Vivienda que ya corregimos

/**
 * Crear ANEXO 04 – Aviso de Ausencia Prolongada
 *
 * - Puede ser creado por el PERMISIONARIO (usuario logueado) o por ADMIN/ADMIN_GENERAL
 *   en nombre del permisionario.
 * - Se guarda en FormSubmission con tipo: 'ANEXO_04'
 */
async function crearAnexo04(req, res) {
  try {
    const { permisionarioId, viviendaId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(permisionarioId)) {
      return res.status(400).json({ error: 'permisionarioId inválido' });
    }

    if (viviendaId && !mongoose.Types.ObjectId.isValid(viviendaId)) {
      return res.status(400).json({ error: 'viviendaId inválido' });
    }

    const permisionario = await User.findById(permisionarioId);
    if (!permisionario) {
      return res.status(404).json({ error: 'Permisionario no encontrado' });
    }

    let vivienda = null;
    if (viviendaId) {
      vivienda = await Vivienda.findById(viviendaId);
      if (!vivienda) {
        return res.status(404).json({ error: 'Vivienda no encontrada' });
      }
    }

    const nuevoAnexo04 = new FormSubmission({
      tipo: 'ANEXO_04',
      creadoPor: req.user._id,
      postulanteId: permisionarioId,
      viviendaId: vivienda ? vivienda._id : undefined,
      estadoTramite: 'BORRADOR',
      metadata,
    });

    await nuevoAnexo04.save();

    return res.status(201).json({
      message: 'ANEXO 04 creado correctamente',
      anexo04Id: nuevoAnexo04._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 04:', err);
    return res.status(500).json({
      error: 'Error interno al crear ANEXO 04',
    });
  }
}

/**
 * Obtener ANEXO 04 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_04') {
      return res.status(404).json({ error: 'ANEXO 04 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 04:', err);
    return res.status(500).json({
      error: 'Error interno',
    });
  }
}

/**
 * Listar ANEXO 04
 * Solo ADMIN / ADMIN_GENERAL
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, viviendaId } = req.query;

    const filtro = { tipo: 'ANEXO_04' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.datosPermisionario.apellido'] = new RegExp(
        apellido,
        'i'
      );
    if (mr) filtro['metadata.datosPermisionario.mr'] = mr;
    if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId)) {
      filtro.viviendaId = new mongoose.Types.ObjectId(viviendaId);
    }

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 04:', err);
    return res.status(500).json({
      error: 'Error interno',
    });
  }
}

/**
 * Cambiar estado del ANEXO 04
 * Solo ADMIN_GENERAL
 */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const estadosPermitidos = ['BORRADOR', 'EN_REVISION', 'CERRADO', 'ANULADO'];

    if (!estadosPermitidos.includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_04') {
      return res.status(404).json({ error: 'ANEXO 04 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado de ANEXO 04 actualizado',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error al cambiar estado de ANEXO 04:', err);
    return res.status(500).json({
      error: 'Error interno',
    });
  }
}

module.exports = {
  crearAnexo04,
  obtenerPorId,
  listar,
  cambiarEstado,
};
