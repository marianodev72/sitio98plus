// controllers/anexo21Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');

/**
 * Crear ANEXO 21 – Inscripción a Alojamiento Naval
 */
async function crearAnexo21(req, res) {
  try {
    const { postulanteId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(postulanteId)) {
      return res.status(400).json({ error: 'postulanteId inválido' });
    }

    const usuario = await User.findById(postulanteId);
    if (!usuario) {
      return res.status(404).json({ error: 'Postulante no encontrado' });
    }

    const nuevoA21 = new FormSubmission({
      tipo: 'ANEXO_21',
      creadoPor: req.user._id,
      postulanteId,
      estadoTramite: 'EN_ANALISIS',
      metadata,
    });

    await nuevoA21.save();

    return res.status(201).json({
      message: 'ANEXO 21 creado correctamente',
      anexo21Id: nuevoA21._id,
    });
  } catch (err) {
    console.error('Error al crear ANEXO 21:', err);
    return res.status(500).json({
      error: 'Error interno al crear ANEXO 21',
    });
  }
}

/** Obtener ANEXO 21 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_21')
      return res.status(404).json({ error: 'ANEXO 21 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error obteniendo ANEXO 21:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/** Listar ANEXO 21 (solo Admin o Admin General) */
async function listar(req, res) {
  try {
    const { estado, apellido, mr } = req.query;

    const filtro = { tipo: 'ANEXO_21' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido)
      filtro['metadata.datosPersonales.apellido'] = new RegExp(apellido, 'i');
    if (mr)
      filtro['metadata.datosPersonales.mr'] = new RegExp(mr, 'i');

    const lista = await FormSubmission.find(filtro).lean();
    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 21:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/** Cambiar estado administrativo (solo ADMIN_GENERAL) */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const permitidos = [
      'EN_ANALISIS',
      'ADJUDICADO',
      'NO_ADJUDICADO',
      'ANULADO',
    ];

    if (!permitidos.includes(nuevoEstado))
      return res.status(400).json({ error: 'Estado no permitido' });

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_21')
      return res.status(404).json({ error: 'ANEXO 21 no encontrado' });

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({
      message: 'Estado actualizado correctamente',
      estado: nuevoEstado,
    });
  } catch (err) {
    console.error('Error cambiando estado ANEXO 21:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo21,
  obtenerPorId,
  listar,
  cambiarEstado,
};
