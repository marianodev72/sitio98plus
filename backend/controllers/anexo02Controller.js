// controllers/anexo02Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/User');
const Vivienda = require('../models/Vivienda'); // ajusta si tu modelo se exporta distinto

/**
 * Generar ANEXO 02 desde un ANEXO 01
 *
 * - Solo ADMIN_GENERAL
 * - Toma datos personales del ANEXO 01 (grado, apellido, nombres, MR, destinoActual, destinoFuturo)
 * - Toma la vivienda elegida (viviendaId)
 * - Crea un nuevo FormSubmission tipo ANEXO_02 en estado BORRADOR
 */
async function generarDesdeAnexo01(req, res) {
  try {
    const { anexo01Id } = req.params;
    const { viviendaId, fechas } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(anexo01Id)) {
      return res.status(400).json({ error: 'ID de ANEXO 01 inválido' });
    }
    if (!mongoose.Types.ObjectId.isValid(viviendaId)) {
      return res.status(400).json({ error: 'ID de vivienda inválido' });
    }

    const anexo01 = await FormSubmission.findById(anexo01Id).lean();
    if (!anexo01 || anexo01.tipo !== 'ANEXO_01') {
      return res.status(404).json({ error: 'ANEXO 01 no encontrado' });
    }

    const postulanteId = anexo01.postulanteId;
    if (!postulanteId) {
      return res
        .status(400)
        .json({ error: 'El ANEXO 01 no tiene postulanteId asociado' });
    }

    const vivienda = await Vivienda.findById(viviendaId).lean();
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    const dp = anexo01.metadata?.datosPersonales;
    if (!dp) {
      return res.status(400).json({
        error:
          'El ANEXO 01 no tiene datosPersonales en metadata; no se puede generar ANEXO 02'
      });
    }

    // Permisionario: replicamos lo de ANEXO 01, con destinoActual y destinoFuturo
    const permisionario = {
      grado: dp.grado || '',
      apellido: dp.apellido || '',
      nombres: dp.nombres || '',
      mr: dp.mr || '',
      destinoActual: dp.destinoActual || '',
      destinoFuturo: dp.destinoFuturo || ''
    };

    // Vivienda: usamos campos típicos; ajusta si tus nombres son distintos
    const metadataVivienda = {
      viviendaId: vivienda._id,
      direccion: vivienda.direccion || '',
      casaDepartamento: vivienda.unidad || vivienda.departamento || '',
      localidad: vivienda.localidad || ''
    };

    // Cláusulas reglamentarias (pueden ser textos fijos, aquí solo indicamos que existen)
    const clausulas = {
      usoPrecario:
        'El derecho al uso de la vivienda es conferido con carácter precario, de conformidad con el Reglamento de Viviendas Fiscales de la Armada.',
      noLocacion:
        'La ocupación no constituye contrato de locación ni genera derechos de inquilino.',
      responsabilidadMantenimiento:
        'El permisionario es responsable por el uso y mantenimiento de la vivienda, según el reglamento vigente.'
    };

    const metadata = {
      permisionario,
      vivienda: metadataVivienda,
      fechas: {
        fechaAsignacion: new Date(fechas.fechaAsignacion),
        fechaEntregaPrevista: new Date(fechas.fechaEntregaPrevista)
      },
      clausulas,
      firmas: {
        firmadoPorPermisionario: {
          estado: false
        },
        firmadoPorAdminGeneral: {
          estado: false
        }
      }
    };

    const nuevoAnexo02 = new FormSubmission({
      tipo: 'ANEXO_02',
      creadoPor: req.user._id,
      postulanteId,
      anexo01Id: anexo01._id,
      estadoTramite: 'BORRADOR',
      metadata
    });

    await nuevoAnexo02.save();

    return res.status(201).json({
      message: 'ANEXO 02 generado correctamente desde ANEXO 01',
      anexo02Id: nuevoAnexo02._id
    });
  } catch (err) {
    console.error('Error al generar ANEXO 02 desde ANEXO 01:', err);
    return res.status(500).json({
      error: 'Error interno al generar ANEXO 02'
    });
  }
}

/**
 * Obtener ANEXO 02 por ID
 */
async function obtenerPorId(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo || anexo.tipo !== 'ANEXO_02') {
      return res.status(404).json({ error: 'ANEXO 02 no encontrado' });
    }

    return res.json(anexo);
  } catch (err) {
    console.error('Error al obtener ANEXO 02:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Listar ANEXO 02
 * Solo ADMIN / ADMIN_GENERAL
 */
async function listar(req, res) {
  try {
    const { estado, apellido, mr } = req.query;

    let filtro = { tipo: 'ANEXO_02' };

    if (estado) filtro.estadoTramite = estado;
    if (apellido) filtro['metadata.permisionario.apellido'] = new RegExp(apellido, 'i');
    if (mr) filtro['metadata.permisionario.mr'] = mr;

    const lista = await FormSubmission.find(filtro).lean();

    return res.json(lista);
  } catch (err) {
    console.error('Error al listar ANEXO 02:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Confirmar asignación (ADMIN_GENERAL)
 *
 * - Marca estadoTramite = 'ASIGNADA'
 * - Registra firma de ADMIN_GENERAL
 * - Actualiza el usuario (viviendaAsignada, estadoHabitacional)
 * - Actualiza la vivienda (estado OCUPADA, ocupacionActual)
 */
async function confirmarAsignacion(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_02') {
      return res.status(404).json({ error: 'ANEXO 02 no encontrado' });
    }

    const postulanteId = anexo.postulanteId;
    const viviendaId = anexo.metadata?.vivienda?.viviendaId;

    if (!postulanteId || !viviendaId) {
      return res.status(400).json({
        error:
          'ANEXO 02 incompleto: faltan postulanteId o vivienda.viviendaId para confirmar asignación'
      });
    }

    const user = await User.findById(postulanteId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario postulante no encontrado' });
    }

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    // Actualizar usuario
    user.viviendaAsignada = vivienda._id;
    // Ajustar rol/estadoHabitacional según tu lógica institucional
    if (user.role === 'POSTULANTE') {
      user.role = 'PERMISIONARIO';
    }
    user.estadoHabitacional = 'PERMISIONARIO_ACTIVO';
    await user.save();

    // Actualizar vivienda
    vivienda.estado = 'OCUPADA';
    vivienda.ocupacionActual = {
      usuario: user._id,
      fecha: new Date()
    };
    await vivienda.save();

    // Actualizar ANEXO 02: firma y estado
    if (!anexo.metadata) anexo.metadata = {};
    if (!anexo.metadata.firmas) anexo.metadata.firmas = {};

    anexo.metadata.firmas.firmadoPorAdminGeneral = {
      estado: true,
      fecha: new Date(),
      usuarioId: req.user._id
    };
    anexo.estadoTramite = 'ASIGNADA';

    await anexo.save();

    return res.json({
      message: 'Asignación confirmada y vivienda asignada al permisionario',
      anexo02Id: anexo._id
    });
  } catch (err) {
    console.error('Error al confirmar asignación (ANEXO 02):', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  generarDesdeAnexo01,
  obtenerPorId,
  listar,
  confirmarAsignacion
};
