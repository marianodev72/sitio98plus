// controllers/postulacionController.js
// Lógica de postulaciones y asignaciones (ANEXO 2 y ANEXO 22) para ZN98

const { Postulacion, POSTULACION_TIPOS, POSTULACION_ESTADOS } = require('../models/Postulacion');
const { AuditLog } = require('../models/AuditLog');
const { Vivienda } = require('../models/Vivienda');
const { Alojamiento } = require('../models/Alojamiento');
const { User } = require('../models/User');

async function registrarAccion({ usuario, accion, recursoTipo, recursoId, detalle, ip }) {
  try {
    await AuditLog.create({
      usuario: usuario ? usuario._id : null,
      rolEnMomento: usuario ? usuario.role : null,
      accion,
      recursoTipo,
      recursoId,
      detalle,
      ip,
    });
  } catch (err) {
    console.error('Error registrando acción de auditoría:', err.message);
  }
}

// POST /api/postulaciones
// Crea una nueva postulación (solo POSTULANTE, PERMISIONARIO o ALOJADO)
async function crearPostulacion(req, res) {
  try {
    const user = req.user;

    if (!['POSTULANTE', 'PERMISIONARIO', 'ALOJADO'].includes(user.role)) {
      return res
        .status(403)
        .json({ message: 'No tiene permiso para crear postulaciones.' });
    }

    const { tipo, datosFormulario } = req.body;

    if (!tipo || !POSTULACION_TIPOS.includes(tipo)) {
      return res
        .status(400)
        .json({ message: 'Tipo de postulación inválido.' });
    }

    const postulacion = await Postulacion.create({
      usuario: user._id,
      tipo,
      estado: 'EN_ANALISIS',
      datosFormulario: datosFormulario || {},
    });

    await registrarAccion({
      usuario: user,
      accion: 'CREATE',
      recursoTipo: 'POSTULACION',
      recursoId: postulacion._id.toString(),
      detalle: `Creación de postulación tipo ${tipo}`,
      ip: req.ip,
    });

    return res.status(201).json({
      message: 'Postulación creada correctamente.',
      postulacion,
    });
  } catch (err) {
    console.error('Error en crearPostulacion:', err);
    return res
      .status(500)
      .json({ message: 'Error al crear la postulación.' });
  }
}

// GET /api/postulaciones/mias
// Devuelve las postulaciones del usuario actual
async function listarMisPostulaciones(req, res) {
  try {
    const user = req.user;

    const postulaciones = await Postulacion.find({
      usuario: user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    await registrarAccion({
      usuario: user,
      accion: 'VIEW_LIST',
      recursoTipo: 'POSTULACION',
      recursoId: 'OWN',
      detalle: 'Listado de postulaciones propias',
      ip: req.ip,
    });

    return res.json({ postulaciones });
  } catch (err) {
    console.error('Error en listarMisPostulaciones:', err);
    return res
      .status(500)
      .json({ message: 'Error al obtener sus postulaciones.' });
  }
}

// GET /api/postulaciones
// Lista general — solo ADMIN y ADMIN_GENERAL
async function listarPostulacionesAdmin(req, res) {
  try {
    const user = req.user;

    if (!['ADMIN', 'ADMIN_GENERAL'].includes(user.role)) {
      return res
        .status(403)
        .json({ message: 'No tiene permiso para ver todas las postulaciones.' });
    }

    const { tipo, estado } = req.query;
    const filtro = {};

    if (tipo && POSTULACION_TIPOS.includes(tipo)) {
      filtro.tipo = tipo;
    }
    if (estado) {
      filtro.estado = estado;
    }

    const postulaciones = await Postulacion.find(filtro)
      .populate('usuario', 'nombre apellido matricula dni role')
      .populate('viviendaAsignada')
      .populate('alojamientoAsignado')
      .sort({ createdAt: -1 })
      .lean();

    await registrarAccion({
      usuario: user,
      accion: 'VIEW_LIST',
      recursoTipo: 'POSTULACION',
      recursoId: 'ALL',
      detalle: 'Listado administrativo de postulaciones',
      ip: req.ip,
    });

    return res.json({ postulaciones });
  } catch (err) {
    console.error('Error en listarPostulacionesAdmin:', err);
    return res
      .status(500)
      .json({ message: 'Error al obtener las postulaciones.' });
  }
}

// GET /api/postulaciones/:id
// Detalle de una postulación
// - El dueño puede verla
// - ADMIN / ADMIN_GENERAL pueden verla
async function obtenerPostulacion(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const postulacion = await Postulacion.findById(id)
      .populate('usuario', 'nombre apellido matricula dni role')
      .populate('viviendaAsignada')
      .populate('alojamientoAsignado')
      .lean();

    if (!postulacion) {
      return res.status(404).json({ message: 'Postulación no encontrada.' });
    }

    const esDuenio =
      postulacion.usuario && postulacion.usuario._id.toString() === user._id.toString();
    const esAdmin = ['ADMIN', 'ADMIN_GENERAL'].includes(user.role);

    if (!esDuenio && !esAdmin) {
      return res
        .status(403)
        .json({ message: 'No tiene permiso para ver esta postulación.' });
    }

    await registrarAccion({
      usuario: user,
      accion: 'VIEW',
      recursoTipo: 'POSTULACION',
      recursoId: id,
      detalle: 'Detalle de postulación',
      ip: req.ip,
    });

    return res.json({ postulacion });
  } catch (err) {
    console.error('Error en obtenerPostulacion:', err);
    return res
      .status(500)
      .json({ message: 'Error al obtener la postulación.' });
  }
}

// =============== ASIGNACIÓN DE VIVIENDA (ANEXO 2) =============== //

// POST /api/postulaciones/:id/asignar-vivienda
// Solo ADMIN_GENERAL
async function asignarVivienda(req, res) {
  try {
    const admin = req.user;
    const { id } = req.params;
    const { viviendaId, observacion, cantidadHabitantes } = req.body;

    if (admin.role !== 'ADMIN_GENERAL') {
      return res
        .status(403)
        .json({ message: 'Solo ADMIN_GENERAL puede asignar viviendas.' });
    }

    const postulacion = await Postulacion.findById(id).populate('usuario');
    if (!postulacion) {
      return res.status(404).json({ message: 'Postulación no encontrada.' });
    }

    if (postulacion.tipo !== 'VIVIENDA') {
      return res
        .status(400)
        .json({ message: 'La postulación no es de tipo VIVIENDA.' });
    }

    if (!['EN_ANALISIS', 'ACEPTADA'].includes(postulacion.estado)) {
      return res.status(400).json({
        message:
          'Solo se pueden asignar viviendas a postulaciones en análisis o aceptadas.',
      });
    }

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ message: 'Vivienda no encontrada.' });
    }

    if (vivienda.estado !== 'DISPONIBLE') {
      return res.status(400).json({
        message: 'La vivienda no está disponible para asignación.',
      });
    }

    const user = await User.findById(postulacion.usuario._id);
    if (!user) {
      return res
        .status(404)
        .json({ message: 'Usuario de la postulación no encontrado.' });
    }

    // Asignar ocupante a la vivienda
    vivienda.asignarOcupante(user._id, new Date(), observacion || '');
    if (typeof cantidadHabitantes === 'number' && cantidadHabitantes >= 0) {
      vivienda.cantidadHabitantes = cantidadHabitantes;
    }
    await vivienda.save();

    // Actualizar postulación
    postulacion.viviendaAsignada = vivienda._id;
    postulacion.cambiarEstado(
      'ASIGNADA',
      admin._id,
      observacion || 'Asignación de vivienda'
    );
    await postulacion.save();

    // Cambio de rol: POSTULANTE -> PERMISIONARIO
    user.setRole('PERMISIONARIO');
    await user.save();

    await registrarAccion({
      usuario: admin,
      accion: 'ASSIGN',
      recursoTipo: 'POSTULACION',
      recursoId: postulacion._id.toString(),
      detalle: `Asignación de vivienda ${vivienda.codigo} al usuario ${user.matricula}`,
      ip: req.ip,
    });

    await registrarAccion({
      usuario: admin,
      accion: 'ASSIGN',
      recursoTipo: 'VIVIENDA',
      recursoId: vivienda._id.toString(),
      detalle: `Asignación de vivienda a ${user.matricula}`,
      ip: req.ip,
    });

    return res.json({
      message: 'Vivienda asignada correctamente. Rol actualizado a PERMISIONARIO.',
      postulacion,
    });
  } catch (err) {
    console.error('Error en asignarVivienda:', err);
    return res
      .status(500)
      .json({ message: 'Error al asignar vivienda.' });
  }
}

// =============== ASIGNACIÓN DE ALOJAMIENTO (ANEXO 22) =============== //

// POST /api/postulaciones/:id/asignar-alojamiento
// Solo ADMIN_GENERAL
async function asignarAlojamiento(req, res) {
  try {
    const admin = req.user;
    const { id } = req.params;
    const { alojamientoId, observacion } = req.body;

    if (admin.role !== 'ADMIN_GENERAL') {
      return res
        .status(403)
        .json({ message: 'Solo ADMIN_GENERAL puede asignar alojamientos.' });
    }

    const postulacion = await Postulacion.findById(id).populate('usuario');
    if (!postulacion) {
      return res.status(404).json({ message: 'Postulación no encontrada.' });
    }

    if (postulacion.tipo !== 'ALOJAMIENTO') {
      return res
        .status(400)
        .json({ message: 'La postulación no es de tipo ALOJAMIENTO.' });
    }

    if (!['EN_ANALISIS', 'ACEPTADA'].includes(postulacion.estado)) {
      return res.status(400).json({
        message:
          'Solo se pueden asignar alojamientos a postulaciones en análisis o aceptadas.',
      });
    }

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento) {
      return res.status(404).json({ message: 'Tipo de alojamiento no encontrado.' });
    }

    const user = await User.findById(postulacion.usuario._id);
    if (!user) {
      return res
        .status(404)
        .json({ message: 'Usuario de la postulación no encontrado.' });
    }

    // No hay concepto de "ocupado" a nivel tipo de alojamiento (es reutilizable)
    // Solo vinculamos la postulación con ese tipo de alojamiento
    postulacion.alojamientoAsignado = alojamiento._id;
    postulacion.cambiarEstado(
      'ASIGNADA',
      admin._id,
      observacion || 'Asignación de alojamiento (tipo)'
    );
    await postulacion.save();

    // Cambio de rol: POSTULANTE -> ALOJADO
    user.setRole('ALOJADO');
    await user.save();

    await registrarAccion({
      usuario: admin,
      accion: 'ASSIGN',
      recursoTipo: 'POSTULACION',
      recursoId: postulacion._id.toString(),
      detalle: `Asignación de tipo de alojamiento ${alojamiento.codigo} al usuario ${user.matricula}`,
      ip: req.ip,
    });

    await registrarAccion({
      usuario: admin,
      accion: 'ASSIGN',
      recursoTipo: 'ALOJAMIENTO',
      recursoId: alojamiento._id.toString(),
      detalle: `Asignación de tipo de alojamiento a ${user.matricula}`,
      ip: req.ip,
    });

    return res.json({
      message:
        'Alojamiento (tipo) asignado correctamente. Rol actualizado a ALOJADO.',
      postulacion,
    });
  } catch (err) {
    console.error('Error en asignarAlojamiento:', err);
    return res
      .status(500)
      .json({ message: 'Error al asignar alojamiento.' });
  }
}

module.exports = {
  crearPostulacion,
  listarMisPostulaciones,
  listarPostulacionesAdmin,
  obtenerPostulacion,
  asignarVivienda,
  asignarAlojamiento,
};
