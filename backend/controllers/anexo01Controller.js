// controllers/anexo01Controller.js

const FormSubmission = require('../models/FormSubmission'); // modelo genérico de formularios
const { User } = require('../models/User');                 // para sincronizar grupo familiar
const mongoose = require('mongoose');

/**
 * Crear ANEXO 01
 * - Guarda todos los datos del formulario dentro de metadata
 * - NO modifica automáticamente los datos personales del User
 * - SOLO actualiza el grupo familiar en el User
 */
async function crearAnexo01(req, res) {
  try {
    const { postulanteId, metadata } = req.validatedBody;

    // Verificar que el postulante exista
    const user = await User.findById(postulanteId);
    if (!user) {
      return res.status(404).json({ error: 'Postulante no encontrado' });
    }

    // Crear el formulario
    const nuevoAnexo01 = new FormSubmission({
      tipo: 'ANEXO_01',
      creadoPor: req.user._id,
      postulanteId,
      estadoTramite: 'EN_ANALISIS',
      metadata
    });

    await nuevoAnexo01.save();

    // SINCRONIZACIÓN DEL GRUPO FAMILIAR EN USER (si existe)
    if (Array.isArray(metadata.grupoFamiliar)) {
      user.grupoFamiliar = metadata.grupoFamiliar.map((f) => ({
        nombreCompleto: f.apellidoNombres,
        relacion: f.relacion,
        edad: f.edad || null,
        dni: f.dni || null,
        diba: f.diba || null,
        aCargo: f.aCargo,
        fuente: 'ANEXO_01'
      }));
      await user.save();
    }

    return res.status(201).json({
      message: 'ANEXO 01 creado correctamente',
      anexo01Id: nuevoAnexo01._id
    });
  } catch (err) {
    console.error('Error al crear ANEXO 01:', err);
    return res.status(500).json({
      error: 'Error interno al crear ANEXO 01'
    });
  }
}

/**
 * Obtener un ANEXO 01 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_01') {
      return res.status(404).json({ error: 'ANEXO 01 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 01:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar todos los ANEXO 01 (solo ADMIN / ADMIN_GENERAL)
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr } = req.query;

    let filtro = { tipo: 'ANEXO_01' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido) filtro['metadata.datosPersonales.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.datosPersonales.mr'] = mr;

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 01:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Actualizar estado del tramite (solo ADMIN_GENERAL)
 */
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    if (!['EN_ANALISIS', 'APROBADO', 'NO_APROBADO', 'ANULADO'].includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_01') {
      return res.status(404).json({ error: 'ANEXO 01 no encontrado' });
    }

    anexo.estadoTramite = nuevoEstado;
    await anexo.save();

    return res.json({ message: 'Estado actualizado', estado: nuevoEstado });
  } catch (err) {
    console.error('Error al cambiar estado de ANEXO 01:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  crearAnexo01,
  obtenerPorId,
  listar,
  cambiarEstado
};
