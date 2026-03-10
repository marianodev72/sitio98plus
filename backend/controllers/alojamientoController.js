// controllers/alojamientoController.js
const mongoose = require('mongoose');
const Alojamiento = require('../models/Alojamiento');
const { ESTADOS_ALOJAMIENTO } = require('../validators/alojamientoValidator');

/**
 * Helper: determina si un rol tiene acceso GLOBAL a alojamientos.
 */
function tieneAccesoGlobal(role) {
  return role === 'ADMIN' || role === 'ADMIN_GENERAL';
}

/**
 * Helper: roles que pueden ver alojamientos por barrio.
 */
function tieneAccesoPorBarrio(user) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return permisos.includes('INSPECTOR') || permisos.includes('JEFE_DE_BARRIO');
}

/**
 * GET /api/alojamientos
 * Listado de alojamientos.
 * - ADMIN/ADMIN_GENERAL: acceso global, con filtros opcionales.
 * - INSPECTOR/JEFE_DE_BARRIO: solo alojamientos de su barrioAsignado.
 * - ALOJADO: solo su alojamientoAsignado.
 */
async function listar(req, res) {
  try {
    const user = req.user;
    const role = user?.role;

    if (!user || !role) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    const { estado, codigo } = req.query;
    const filtro = {};

    if (estado && ESTADOS_ALOJAMIENTO.includes(estado)) {
      filtro.estado = estado;
    }
    if (codigo) {
      filtro.codigo = codigo;
    }

    // ADMIN / ADMIN_GENERAL → lectura global
    if (tieneAccesoGlobal(role)) {
      const alojamientos = await Alojamiento.find(filtro).lean();
      return res.json(alojamientos);
    }

    // Territorial → SOLO su barrioAsignado
    if (tieneAccesoPorBarrio(user)) {
      if (!user.barrioAsignado) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }

      filtro.barrio = user.barrioAsignado;
      const alojamientos = await Alojamiento.find(filtro).lean();
      return res.json(alojamientos);
    }

    // ALOJADO → SOLO su alojamientoAsignado
    if (role === 'ALOJADO') {
      if (
        !user.alojamientoAsignado ||
        !mongoose.Types.ObjectId.isValid(user.alojamientoAsignado)
      ) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }

      const alojamiento = await Alojamiento.findById(user.alojamientoAsignado).lean();
      if (!alojamiento) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }

      return res.json([alojamiento]);
    }

    return res.status(404).json({ error: 'Recurso no disponible' });
  } catch (err) {
    console.error('Error en listar alojamientos:', err);
    return res.status(500).json({ error: 'Error interno al listar alojamientos' });
  }
}

/**
 * GET /api/alojamientos/:id
 * Obtener alojamiento por ID.
 * - ADMIN/ADMIN_GENERAL: acceso global
 * - INSPECTOR/JEFE_DE_BARRIO: solo si el alojamiento pertenece a su barrioAsignado
 * - ALOJADO: solo su alojamientoAsignado
 */
async function obtenerPorId(req, res) {
  try {
    const user = req.user;
    const role = user?.role;
    const { id } = req.params;

    if (!user || !role) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    // Fail-closed: no distinguir ID inválido vs inexistente
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    const alojamiento = await Alojamiento.findById(id).lean();
    if (!alojamiento) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    // ADMIN / ADMIN_GENERAL
    if (tieneAccesoGlobal(role)) {
      return res.json(alojamiento);
    }

    // Territorial
    if (tieneAccesoPorBarrio(user)) {
      if (!user.barrioAsignado) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }
      if (alojamiento.barrio !== user.barrioAsignado) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }
      return res.json(alojamiento);
    }

    // ALOJADO
    if (role === 'ALOJADO') {
      if (
        !user.alojamientoAsignado ||
        String(user.alojamientoAsignado) !== String(alojamiento._id)
      ) {
        return res.status(404).json({ error: 'Recurso no disponible' });
      }
      return res.json(alojamiento);
    }

    return res.status(404).json({ error: 'Recurso no disponible' });
  } catch (err) {
    console.error('Error en obtener alojamiento por ID:', err);
    return res.status(500).json({ error: 'Error interno al obtener alojamiento' });
  }
}

/**
 * POST /api/alojamientos
 * Crear alojamiento (ADMIN/ADMIN_GENERAL)
 */
async function crear(req, res) {
  try {
    const user = req.user;
    const role = user?.role;

    if (!user || !role) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    if (role !== 'ADMIN_GENERAL') {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    const data = req.validatedBody;

    const existente = await Alojamiento.findOne({ codigo: data.codigo }).lean();
    if (existente) {
      return res.status(409).json({
        error: 'Ya existe un alojamiento con ese código'
      });
    }

    const alojamiento = new Alojamiento({
      codigo: data.codigo,
      barrio: data.barrio,
      descripcion: data.descripcion || '',
      estado: data.estado || 'DISPONIBLE'
      // NO seteamos ocupacionActual ni historialOcupacion aquí
    });

    const guardado = await alojamiento.save();
    return res.status(201).json(guardado);
  } catch (err) {
    console.error('Error al crear alojamiento:', err);
    return res.status(500).json({ error: 'Error interno al crear alojamiento' });
  }
}

/**
 * PUT /api/alojamientos/:id
 * Actualizar alojamiento (ADMIN/ADMIN_GENERAL)
 */
async function actualizar(req, res) {
  try {
    const user = req.user;
    const role = user?.role;
    const { id } = req.params;

    if (!user || !role) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    if (role !== 'ADMIN_GENERAL') {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const alojamiento = await Alojamiento.findById(id);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    const data = req.validatedBody;

    if (data.estado) {
      const tieneOcupante =
        alojamiento.ocupacionActual && alojamiento.ocupacionActual.alojado;

      if (tieneOcupante && data.estado !== 'OCUPADO') {
        return res.status(400).json({
          error:
            'No se puede cambiar el estado de un alojamiento OCUPADO desde este endpoint. Use el flujo institucional (ANEXO_26 / baja).'
        });
      }

      if (!tieneOcupante && data.estado === 'OCUPADO') {
        return res.status(400).json({
          error:
            'No se puede marcar un alojamiento como OCUPADO sin asignación institucional (ANEXO_22).'
        });
      }
    }

    if (data.barrio !== undefined) alojamiento.barrio = data.barrio;
    if (data.descripcion !== undefined) alojamiento.descripcion = data.descripcion;
    if (data.estado !== undefined) alojamiento.estado = data.estado;

    const guardado = await alojamiento.save();
    return res.json(guardado);
  } catch (err) {
    console.error('Error al actualizar alojamiento:', err);
    return res.status(500).json({ error: 'Error interno al actualizar alojamiento' });
  }
}

/**
 * DELETE /api/alojamientos/:id
 * Baja lógica (ADMIN_GENERAL)
 */
async function bajaLogica(req, res) {
  try {
    const user = req.user;
    const role = user?.role;
    const { id } = req.params;

    if (!user || !role) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    if (role !== 'ADMIN_GENERAL') {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const alojamiento = await Alojamiento.findById(id);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Recurso no disponible' });
    }

    const tieneOcupante =
      alojamiento.ocupacionActual && alojamiento.ocupacionActual.alojado;

    if (tieneOcupante) {
      return res.status(400).json({
        error:
          'No se puede dar de baja un alojamiento con ocupación actual. Debe gestionarse la desocupación por los anexos correspondientes.'
      });
    }

    alojamiento.estado = 'BAJA';
    const guardado = await alojamiento.save();

    return res.json({
      message: 'Alojamiento dado de baja correctamente (baja lógica)',
      alojamiento: guardado
    });
  } catch (err) {
    console.error('Error en baja lógica de alojamiento:', err);
    return res.status(500).json({ error: 'Error interno al dar de baja alojamiento' });
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  bajaLogica
};
