// controllers/anexo22Controller.js

const mongoose = require('mongoose');
const FormSubmission = require('../models/FormSubmission');
const { User } = require('../models/user');
const Alojamiento = require('../models/Alojamiento');

/**
 * GENERAR ANEXO 22 DESDE ANEXO 21
 */
async function generarDesdeAnexo21(req, res) {
  try {
    const { anexo21Id } = req.params;
    const { alojamientoId, fechas } = req.validatedBody;

    if (!mongoose.Types.ObjectId.isValid(anexo21Id)) {
      return res.status(400).json({ error: 'ID de ANEXO 21 inválido' });
    }
    if (!mongoose.Types.ObjectId.isValid(alojamientoId)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const a21 = await FormSubmission.findById(anexo21Id).lean();
    if (!a21 || a21.tipo !== 'ANEXO_21') {
      return res.status(404).json({ error: 'ANEXO 21 no encontrado' });
    }

    const usuario = await User.findById(a21.postulanteId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const alojamiento = await Alojamiento.findById(alojamientoId).lean();
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const dp = a21.metadata.datosPersonales;

    const metadata = {
      huesped: {
        grado: dp.grado,
        apellido: dp.apellido,
        nombres: dp.nombres,
        mr: dp.mr,
        destinoActual: dp.destinoActual,
        destinoFuturo: dp.destinoFuturo,
      },

      alojamiento: {
        alojamientoId,
        predio: alojamiento.predio,
        edificio: alojamiento.edificio,
        codigo: alojamiento.codigo,
        localidad: alojamiento.localidad,
      },

      fechas: {
        fechaAsignacion: new Date(fechas.fechaAsignacion),
        fechaEntregaPrevista: new Date(fechas.fechaEntregaPrevista),
      },

      clausulas: {
        usoPrecario:
          'El uso del alojamiento es otorgado con carácter precario según el reglamento vigente.',
        noLocacion: 'La asignación no constituye contrato de locación.',
        responsabilidades: 'El huésped asume el cuidado y mantenimiento básico.',
      },

      firmas: {
        firmadoPorHuesped: { estado: false },
        firmadoPorAdminGeneral: { estado: false },
      },
    };

    const nuevoA22 = new FormSubmission({
      tipo: 'ANEXO_22',
      creadoPor: req.user._id,
      postulanteId: usuario._id,
      estadoTramite: 'BORRADOR',
      metadata,
    });

    await nuevoA22.save();

    return res.status(201).json({
      message: 'ANEXO 22 generado correctamente',
      anexo22Id: nuevoA22._id,
    });
  } catch (err) {
    console.error('Error ANEXO 22:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * CONFIRMAR Asignación (firma del ADMIN_GENERAL)
 */
async function confirmarAsignacion(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'ID inválido' });

    const anexo = await FormSubmission.findById(id);
    if (!anexo || anexo.tipo !== 'ANEXO_22')
      return res.status(404).json({ error: 'ANEXO 22 no encontrado' });

    const usuario = await User.findById(anexo.postulanteId);
    const alojamientoId = anexo.metadata.alojamiento.alojamientoId;
    const alojamiento = await Alojamiento.findById(alojamientoId);

    if (!usuario || !alojamiento)
      return res.status(404).json({ error: 'Usuario o Alojamiento no encontrado' });

    // ASIGNACIÓN INSTITUCIONAL
    usuario.role = 'ALOJADO';
    usuario.estadoHabitacional = 'ALOJADO_ACTIVO';
    usuario.alojamientoAsignado = alojamiento._id;
    usuario.tipoAlojamientoCodigo = anexo.metadata.alojamiento.codigo;
    await usuario.save();

    alojamiento.estado = 'OCUPADO';
    alojamiento.ocupacionActual = {
      usuario: usuario._id,
      fecha: new Date(),
    };
    await alojamiento.save();

    // FIRMAS EN EL ANEXO 22
    anexo.metadata.firmas.firmadoPorAdminGeneral = {
      estado: true,
      fecha: new Date(),
      usuarioId: req.user._id,
    };
    anexo.estadoTramite = 'ASIGNADO';
    await anexo.save();

    return res.json({
      message: 'Asignación confirmada',
      alojamientoId: alojamiento._id,
    });
  } catch (err) {
    console.error('Error confirmando ANEXO 22:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  generarDesdeAnexo21,
  confirmarAsignacion,
};
