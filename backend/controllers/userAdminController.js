// controllers/userAdminController.js
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Helper: registra un cambio en historialCambios del usuario.
 * Asumimos que el User tiene un campo historialCambios: []
 * donde cada entrada tiene:
 * - fecha
 * - realizadoPor (ObjectId de User)
 * - tipo (ej: 'CAMBIO_ROL', 'CAMBIO_ESTADO_HABITACIONAL', 'BLOQUEO')
 * - campo (string)
 * - valorAnterior
 * - valorNuevo
 * - motivo
 */
function registrarCambio(userDoc, { realizadoPor, tipo, campo, valorAnterior, valorNuevo, motivo }) {
  if (!Array.isArray(userDoc.historialCambios)) {
    userDoc.historialCambios = [];
  }

  userDoc.historialCambios.push({
    fecha: new Date(),
    realizadoPor,
    tipo,
    campo,
    valorAnterior,
    valorNuevo,
    motivo
  });
}

/**
 * GET /api/admin/users
 * Listado de usuarios con filtros:
 * - role
 * - estadoHabitacional
 * - barrioAsignado
 * - texto (busca en nombre, apellido, email, matricula)
 */
async function listarUsuarios(req, res) {
  try {
    const { role, estadoHabitacional, barrioAsignado, texto, page = 1, limit = 20 } = req.query;

    const filtro = {};

    if (role) {
      filtro.role = role;
    }

    if (estadoHabitacional) {
      filtro.estadoHabitacional = estadoHabitacional;
    }

    if (barrioAsignado) {
      filtro.barrioAsignado = barrioAsignado;
    }

    if (texto) {
      const regex = new RegExp(texto, 'i');
      filtro.$or = [
        { nombre: regex },
        { apellido: regex },
        { email: regex },
        { matricula: regex }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);

    const [usuarios, total] = await Promise.all([
      User.find(filtro)
        .select('-passwordHash -salt') // ocultar campos sensibles si existen
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filtro)
    ]);

    return res.json({
      total,
      page: pageNum,
      limit: limitNum,
      usuarios
    });
  } catch (err) {
    console.error('Error en listarUsuarios (admin):', err);
    return res.status(500).json({ error: 'Error interno al listar usuarios' });
  }
}

/**
 * GET /api/admin/users/:id
 * Obtener detalle de un usuario por ID.
 */
async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id)
      .select('-passwordHash -salt')
      .lean();

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(usuario);
  } catch (err) {
    console.error('Error en obtenerUsuario (admin):', err);
    return res.status(500).json({ error: 'Error interno al obtener usuario' });
  }
}

/**
 * PATCH /api/admin/users/:id/rol-estado
 * Cambiar rol y estadoHabitacional de un usuario.
 * Solo ADMIN_GENERAL.
 * Siempre requiere "motivo" y registra en historialCambios.
 */
async function actualizarRolEstado(req, res) {
  try {
    const admin = req.user; // ADMIN_GENERAL que ejecuta
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { role, estadoHabitacional, motivo } = req.validatedBody;

    const cambios = [];

    if (usuario.role !== role) {
      cambios.push({
        tipo: 'CAMBIO_ROL',
        campo: 'role',
        valorAnterior: usuario.role,
        valorNuevo: role
      });
      usuario.role = role;
    }

    if (usuario.estadoHabitacional !== estadoHabitacional) {
      cambios.push({
        tipo: 'CAMBIO_ESTADO_HABITACIONAL',
        campo: 'estadoHabitacional',
        valorAnterior: usuario.estadoHabitacional,
        valorNuevo: estadoHabitacional
      });
      usuario.estadoHabitacional = estadoHabitacional;
    }

    if (cambios.length === 0) {
      return res.status(200).json({
        message: 'No hubo cambios en rol ni estadoHabitacional',
        usuario
      });
    }

    // Registrar cada cambio en historialCambios
    cambios.forEach((c) => {
      registrarCambio(usuario, {
        realizadoPor: admin._id,
        tipo: c.tipo,
        campo: c.campo,
        valorAnterior: c.valorAnterior,
        valorNuevo: c.valorNuevo,
        motivo
      });
    });

    await usuario.save();

    const usuarioLimpio = usuario.toObject();
    delete usuarioLimpio.passwordHash;
    delete usuarioLimpio.salt;

    return res.json({
      message: 'Rol y estadoHabitacional actualizados correctamente',
      usuario: usuarioLimpio
    });
  } catch (err) {
    console.error('Error en actualizarRolEstado (admin):', err);
    return res.status(500).json({ error: 'Error interno al actualizar rol/estadoHabitacional' });
  }
}

/**
 * PATCH /api/admin/users/:id/bloqueo
 * Bloquear o desbloquear un usuario.
 * Solo ADMIN_GENERAL.
 * Siempre con motivo y registro en historialCambios.
 *
 * Asumimos que el User tiene un booleano "bloqueado" (o similar).
 * Si el nombre real del campo es otro, ajustarlo aquí.
 */
async function actualizarBloqueo(req, res) {
  try {
    const admin = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { bloqueado, motivo } = req.validatedBody;

    if (usuario.bloqueado === bloqueado) {
      return res.status(200).json({
        message: 'El estado de bloqueo ya era el indicado',
        usuario
      });
    }

    const valorAnterior = usuario.bloqueado;

    usuario.bloqueado = bloqueado;

    registrarCambio(usuario, {
      realizadoPor: admin._id,
      tipo: 'BLOQUEO',
      campo: 'bloqueado',
      valorAnterior,
      valorNuevo: bloqueado,
      motivo
    });

    await usuario.save();

    const usuarioLimpio = usuario.toObject();
    delete usuarioLimpio.passwordHash;
    delete usuarioLimpio.salt;

    return res.json({
      message: `Usuario ${bloqueado ? 'bloqueado' : 'desbloqueado'} correctamente`,
      usuario: usuarioLimpio
    });
  } catch (err) {
    console.error('Error en actualizarBloqueo (admin):', err);
    return res.status(500).json({ error: 'Error interno al actualizar bloqueo de usuario' });
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  actualizarRolEstado,
  actualizarBloqueo
};
