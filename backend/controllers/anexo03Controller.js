// controllers/anexo03Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/User');
const Vivienda = require('../models/Vivienda'); // ajustá si el nombre de export cambia

/**
 * Crear ANEXO 03 – Acta de recepción de vivienda
 *
 * - Referencia a un permisionario (usuario) y a una vivienda
 * - Guarda lecturas de medidores, estado de sistemas, novedades, etc.
 * - NO cambia estados de vivienda ni usuario (eso lo hace ANEXO 02 / 09)
 */
async function crearAnexo03(req, res) {
  try {
    const { permisionarioId, viviendaId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(permisionarioId)) {
      return res.status(400).json({ error: 'permisionarioId inválido' });
    }
    if (!mongoose.Types.ObjectId.isValid(viviendaId)) {
      return res.status(400).json({ error: 'viviendaId inválido' });
    }

    const user = await User.findById(permisionarioId);
    if (!user) {
      return res.status(404).json({ error: 'Permisionario no encontrado' });
    }

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    const nuevoAnexo03 = new FormSubmission({
      tipo: 'ANEXO_03',
      creadoPor: req.user._id,
      postulanteId: permisionarioId, // mismo campo que usamos para 01/02
      viviendaId: vivienda._id,
      estadoTramite: 'BORRADOR',
      metadata
    });

    await nuevoAnexo03.save();

    return res.status(201).json({
      message: 'ANEXO 03 creado correctamente',
      anexo03Id: nuevoAnexo03._id
    });
  } catch (err) {
    console.error('Error al crear ANEXO 03:', err);
    return res.status(500).json({
      error: 'Error interno al crear ANEXO 03'
    });
  }
}

/**
 * Obtener ANEXO 03 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_03') {
      return res.status(404).json({ error: 'ANEXO 03 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 03:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 03
 * Solo ADMIN / ADMIN_GENERAL
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, viviendaId } = req.query;

    let filtro = { tipo: 'ANEXO_03' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido) filtro['metadata.datosPermisionario.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.datosPermisionario.mr'] = mr;
    if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId)) {
      filtro.viviendaId = new mongoose.Types.ObjectId(viviendaId);
    }

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 03:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Cambiar estado del ANEXO 03 (ej: cerrar acta)
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
    if (!anexo || anexo.tipo !== 'ANEXO_03') {
      return res.status(404).json({ error: 'ANEXO 03 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado de ANEXO 03 actualizado',
      estado: nuevoEstado
    });
  } catch (err) {
    console.error('Error al cambiar estado de ANEXO 03:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo03,
  obtenerPorId,
  listar,
  cambiarEstado
};
