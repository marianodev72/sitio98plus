// controllers/adminController.js

const mongoose = require('mongoose');
const User = require('../models/user');
const Vivienda = require('../models/vivienda');
const Alojamiento = require('../models/Alojamiento');
const AuditLog = require('../models/AuditLog');

/**
 * Helper: registrar cambios en el log de auditoría
 */
async function registrarAuditoria({ actorId, targetUserId, tipo, detalle }) {
  try {
    if (!AuditLog) return;
    await AuditLog.create({
      actor: actorId,
      usuarioAfectado: targetUserId,
      tipo,
      detalle,
      fecha: new Date(),
    });
  } catch (err) {
    console.error('Error registrando auditoría ADMIN:', err);
  }
}

/**
 * Listar usuarios con filtros (rol, estado, barrio, matricula, grado, etc).
 */
async function listarUsuarios(req, res) {
  try {
    const {
      rol,
      estadoHabitacional,
      barrioAsignado,
      matricula,
      grado,
      texto,
    } = req.query;

    const filtro = {};

    if (rol) filtro.role = rol;
    if (estadoHabitacional) filtro.estadoHabitacional = estadoHabitacional;
    if (barrioAsignado) filtro.barrioAsignado = barrioAsignado;
    if (matricula) filtro.mr = matricula;
    if (grado) filtro.grado = grado;

    if (texto) {
      filtro.$or = [
        { apellido: new RegExp(texto, 'i') },
        { nombres: new RegExp(texto, 'i') },
        { mr: new RegExp(texto, 'i') },
      ];
    }

    const usuarios = await User.find(filtro).lean();

    return res.json(usuarios);
  } catch (err) {
    console.error('Error en listarUsuarios:', err);
    return res.status(500).json({ error: 'Error interno al listar usuarios' });
  }
}

/**
 * Crear usuario manualmente
 */
async function crearUsuario(req, res) {
  try {
    const data = req.body;

    if (!data.mr || !data.apellido || !data.nombres) {
      return res.status(400).json({
        error: 'MR, apellido y nombres son obligatorios para crear usuario',
      });
    }

    const existente = await User.findOne({ mr: data.mr });
    if (existente) {
      return res
        .status(409)
        .json({ error: 'Ya existe un usuario con esa matrícula (MR)' });
    }

    const nuevo = new User({
      ...data,
      creadoPorAdmin: true,
    });

    await nuevo.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: nuevo._id,
      tipo: 'CREAR_USUARIO',
      detalle: `Usuario creado manualmente por ADMIN_GENERAL`,
    });

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      usuarioId: nuevo._id,
    });
  } catch (err) {
    console.error('Error en crearUsuario:', err);
    return res.status(500).json({ error: 'Error interno al crear usuario' });
  }
}

/**
 * Actualizar datos administrativos del usuario
 */
async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const camposPermitidos = [
      'apellido',
      'nombres',
      'grado',
      'escalafon',
      'destinoActual',
      'destinoFuturo',
      'telefonoActual',
      'telefonoFuturo',
      'barrioAsignado',
      'estadoHabitacional',
      'observacionesAdministrativas',
    ];

    camposPermitidos.forEach((campo) => {
      if (data[campo] !== undefined) {
        usuario[campo] = data[campo];
      }
    });

    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'ACTUALIZAR_USUARIO',
      detalle: `Datos administrativos actualizados`,
    });

    return res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Error en actualizarUsuario:', err);
    return res.status(500).json({ error: 'Error interno al actualizar usuario' });
  }
}

/**
 * Cambiar rol (solo ADMIN_GENERAL, pero la ruta se encarga del control por ahora)
 */
async function cambiarRol(req, res) {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    if (!nuevoRol) {
      return res.status(400).json({ error: 'Debe indicar nuevoRol' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rolAnterior = usuario.role;
    usuario.role = nuevoRol;
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'CAMBIAR_ROL',
      detalle: `Rol cambiado de ${rolAnterior} a ${nuevoRol}`,
    });

    return res.json({ message: 'Rol actualizado correctamente' });
  } catch (err) {
    console.error('Error en cambiarRol:', err);
    return res.status(500).json({ error: 'Error interno al cambiar rol' });
  }
}

/**
 * Cambiar estado habitacional
 */
async function cambiarEstadoHabitacional(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    if (!nuevoEstado) {
      return res.status(400).json({ error: 'Debe indicar nuevoEstado' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const estadoAnterior = usuario.estadoHabitacional;
    usuario.estadoHabitacional = nuevoEstado;
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'CAMBIAR_ESTADO_HABITACIONAL',
      detalle: `Estado habitacional de ${estadoAnterior} a ${nuevoEstado}`,
    });

    return res.json({ message: 'Estado habitacional actualizado' });
  } catch (err) {
    console.error('Error en cambiarEstadoHabitacional:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al cambiar estado habitacional' });
  }
}

/**
 * Bloquear / Desbloquear usuario
 */
async function cambiarBloqueo(req, res) {
  try {
    const { id } = req.params;
    const { bloqueado } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    if (typeof bloqueado !== 'boolean') {
      return res.status(400).json({ error: 'Debe indicar bloqueado: true/false' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    usuario.bloqueado = bloqueado;
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'CAMBIAR_BLOQUEO',
      detalle: `Usuario ${bloqueado ? 'bloqueado' : 'desbloqueado'}`,
    });

    return res.json({ message: 'Estado de bloqueo actualizado' });
  } catch (err) {
    console.error('Error en cambiarBloqueo:', err);
    return res.status(500).json({ error: 'Error interno al cambiar bloqueo' });
  }
}

/**
 * Resetear contraseña (generar temporal)
 */
async function resetearPassword(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    usuario.passwordTemporal = tempPassword;
    usuario.debeCambiarPassword = true;
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'RESET_PASSWORD',
      detalle: 'Contraseña temporal generada',
    });

    return res.json({
      message: 'Contraseña temporal generada',
      passwordTemporal: tempPassword,
    });
  } catch (err) {
    console.error('Error en resetearPassword:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al resetear contraseña' });
  }
}

/**
 * Ver historial de cambios del usuario
 */
async function verHistorial(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const logs = await AuditLog.find({ usuarioAfectado: id })
      .sort({ fecha: -1 })
      .lean();

    return res.json(logs);
  } catch (err) {
    console.error('Error en verHistorial:', err);
    return res.status(500).json({ error: 'Error interno al ver historial' });
  }
}

/**
 * Asignar vivienda POR ORDEN SUPERIOR
 */
async function asignarViviendaPorOrdenSuperior(req, res) {
  try {
    const { id } = req.params;
    const { viviendaId, motivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(viviendaId)) {
      return res.status(400).json({ error: 'ID de usuario o vivienda inválidos' });
    }

    const usuario = await User.findById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) return res.status(404).json({ error: 'Vivienda no encontrada' });

    usuario.viviendaAsignada = vivienda._id;
    usuario.estadoHabitacional = 'PERMISIONARIO_ACTIVO';
    await usuario.save();

    vivienda.estado = 'OCUPADA';
    vivienda.ocupacionActual = {
      usuario: usuario._id,
      motivo: motivo || 'POR ORDEN SUPERIOR',
      fecha: new Date(),
    };
    await vivienda.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'ASIGNAR_VIVIENDA_ORDEN_SUPERIOR',
      detalle: motivo || 'POR ORDEN SUPERIOR',
    });

    return res.json({ message: 'Vivienda asignada POR ORDEN SUPERIOR' });
  } catch (err) {
    console.error('Error en asignarViviendaPorOrdenSuperior:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al asignar vivienda' });
  }
}

/**
 * Desasignar vivienda POR ORDEN SUPERIOR
 */
async function desasignarViviendaPorOrdenSuperior(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const viviendaId = usuario.viviendaAsignada;
    if (!viviendaId) {
      return res.status(400).json({ error: 'El usuario no tiene vivienda asignada' });
    }

    const vivienda = await Vivienda.findById(viviendaId);
    if (vivienda) {
      vivienda.estado = 'DISPONIBLE';
      vivienda.ocupacionActual = null;
      await vivienda.save();
    }

    usuario.viviendaAsignada = null;
    usuario.estadoHabitacional = 'SIN_VIVIENDA';
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'DESASIGNAR_VIVIENDA_ORDEN_SUPERIOR',
      detalle: motivo || 'POR ORDEN SUPERIOR',
    });

    return res.json({ message: 'Vivienda desasignada POR ORDEN SUPERIOR' });
  } catch (err) {
    console.error('Error en desasignarViviendaPorOrdenSuperior:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al desasignar vivienda' });
  }
}

/**
 * Asignar alojamiento POR ORDEN SUPERIOR
 */
async function asignarAlojamientoPorOrdenSuperior(req, res) {
  try {
    const { id } = req.params;
    const { alojamientoId, motivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(alojamientoId)) {
      return res.status(400).json({ error: 'ID de usuario o alojamiento inválidos' });
    }

    const usuario = await User.findById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    usuario.alojamientoAsignado = alojamiento._id;
    await usuario.save();

    alojamiento.estado = 'OCUPADO';
    alojamiento.ocupacionActual = {
      usuario: usuario._id,
      motivo: motivo || 'POR ORDEN SUPERIOR',
      fecha: new Date(),
    };
    await alojamiento.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'ASIGNAR_ALOJAMIENTO_ORDEN_SUPERIOR',
      detalle: motivo || 'POR ORDEN SUPERIOR',
    });

    return res.json({ message: 'Alojamiento asignado POR ORDEN SUPERIOR' });
  } catch (err) {
    console.error('Error en asignarAlojamientoPorOrdenSuperior:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al asignar alojamiento' });
  }
}

/**
 * Desasignar alojamiento POR ORDEN SUPERIOR
 */
async function desasignarAlojamientoPorOrdenSuperior(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const alojamientoId = usuario.alojamientoAsignado;
    if (!alojamientoId) {
      return res.status(400).json({ error: 'El usuario no tiene alojamiento asignado' });
    }

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (alojamiento) {
      alojamiento.estado = 'DISPONIBLE';
      alojamiento.ocupacionActual = null;
      await alojamiento.save();
    }

    usuario.alojamientoAsignado = null;
    await usuario.save();

    await registrarAuditoria({
      actorId: req.user._id,
      targetUserId: usuario._id,
      tipo: 'DESASIGNAR_ALOJAMIENTO_ORDEN_SUPERIOR',
      detalle: motivo || 'POR ORDEN SUPERIOR',
    });

    return res.json({ message: 'Alojamiento desasignado POR ORDEN SUPERIOR' });
  } catch (err) {
    console.error('Error en desasignarAlojamientoPorOrdenSuperior:', err);
    return res
      .status(500)
      .json({ error: 'Error interno al desasignar alojamiento' });
  }
}

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarRol,
  cambiarEstadoHabitacional,
  cambiarBloqueo,
  resetearPassword,
  verHistorial,
  asignarViviendaPorOrdenSuperior,
  desasignarViviendaPorOrdenSuperior,
  asignarAlojamientoPorOrdenSuperior,
  desasignarAlojamientoPorOrdenSuperior,
};
