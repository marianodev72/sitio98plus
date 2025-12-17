// controllers/anexo23Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * Crear ANEXO 23 – Acta de recepción de alojamiento naval
 * NO modifica estado institucional — solo documenta la recepción.
 */
async function crearAnexo23(req, res) {
  try {
    const { huespedId, alojamientoId, metadata } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(huespedId))
      return res.status(400).json({ error: 'huespedId inválido' });

    if (!mongoose.Types.ObjectId.isValid(alojamientoId))
      return res.status(400).json({ error: 'alojamientoId inválido' });

    const usuario = await User.findById(huespedId);
    if (!usuario)
      return res.status(404).json({ error: 'Huésped no encontrado' });

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento)
      return res.status(404).json({ error: 'Alojamiento no encontrado' });

    const nuevo = new FormSubmission({
      tipo: 'ANEXO_23',
      creadoPor: req.user._id,
      postulanteId: huespedId,
      alojamientoId,
      estadoTramite: 'CERRADO',
      metadata,
    });

    await nuevo.save();

    return res.status(201).json({
      message: 'ANEXO 23 creado correctamente',
      anexo23Id: nuevo._id,
    });
  } catch (err) {
    console.error('Error ANEXO 23:', err);
    return res.status(500).json({ error: 'Error interno al crear ANEXO 23' });
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
    if (!anexo || anexo.tipo !== 'ANEXO_23')
      return res.status(404).json({ error: 'ANEXO 23 no encontrado' });

    return res.json(anexo);
  } catch (err) {
    console.error('Error obtener ANEXO 23:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar (solo ADMIN / ADMIN_GENERAL)
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr, alojamientoId } = req.query;

    const filtro = { tipo: 'ANEXO_23' };

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
    console.error('Error listar ANEXO 23:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo23,
  obtenerPorId,
  listar,
};
