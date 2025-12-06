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
function tieneAccesoPorBarrio(role) {
  return role === 'INSPECTOR' || role === 'JEFE_DE_BARRIO';
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
    const role = user.role;

    let filtro = {};
    const { barrio, estado, codigo } = req.query;

    if (barrio) filtro.barrio = barrio;
    if (estado && ESTADOS_ALOJAMIENTO.includes(estado)) filtro.estado = estado;
    if (codigo) filtro.codigo = codigo;

    if (tieneAccesoGlobal(role)) {
      const alojamientos = await Alojamiento.find(filtro).lean();
      return res.json(alojamientos);
    }

    if (tieneAccesoPorBarrio(role)) {
      if (!user.barrioAsignado) {
        return res.status(400).json({
          error: 'El usuario no tiene un barrioAsignado configurado'
        });
      }

      filtro.barrio = user.barrioAsignado;
      const alojamientos = await Alojamiento.find(filtro).lean();
      return res.json(alojamientos);
    }

    if (role === 'ALOJADO') {
      if (!user.alojamientoAsignado) {
        return res.json([]);
      }

      if (!mongoose.Types.ObjectId.isValid(user.alojamientoAsignado)) {
        return res.status(400).json({
          error: 'alojamientoAsignado del usuario es inválido'
        });
      }

      const alojamiento = await Alojamiento.findById(user.alojamientoAsignado).lean();
      if (!alojamiento) {
        return res.json([]);
      }
      return res.json([alojamiento]);
    }

    return res.status(403).json({
      error: `El rol ${role} no está autorizado para listar alojamientos`
    });
  } catch (err) {
    console.error('Error en listar alojamientos:', err);
    return res.status(500).json({ error: 'Error interno al listar alojamientos' });
  }
}

/**
 * GET /api/alojamientos/:id
 * Obtiene un alojamiento por ID respetando las reglas de visibilidad por rol.
 */
async function obtenerPorId(req, res) {
  try {
    const user = req.user;
    const role = user.role;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const alojamiento = await Alojamiento.findById(id).lean();
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    if (tieneAccesoGlobal(role)) {
      return res.json(alojamiento);
    }

    if (tieneAccesoPorBarrio(role)) {
      if (!user.barrioAsignado) {
        return res.status(400).json({
          error: 'El usuario no tiene un barrioAsignado configurado'
        });
      }
      if (alojamiento.barrio !== user.barrioAsignado) {
        return res.status(403).json({
          error: 'No tiene permiso para ver alojamientos de otro barrio'
        });
      }
      return res.json(alojamiento);
    }

    if (role === 'ALOJADO') {
      if (!user.alojamientoAsignado) {
        return res.status(403).json({
          error: 'No tiene alojamiento asignado'
        });
      }
      if (String(user.alojamientoAsignado) !== String(alojamiento._id)) {
        return res.status(403).json({
          error: 'No tiene permiso para ver este alojamiento'
        });
      }
      return res.json(alojamiento);
    }

    return res.status(403).json({
      error: `El rol ${role} no está autorizado para ver alojamientos`
    });
  } catch (err) {
    console.error('Error en obtener alojamiento por ID:', err);
    return res.status(500).json({ error: 'Error interno al obtener alojamiento' });
  }
}

/**
 * POST /api/alojamientos
 * Crea un nuevo alojamiento.
 * SOLO ADMIN y ADMIN_GENERAL.
 * No se toca ocupacionActual ni historialOcupacion desde acá.
 */
async function crear(req, res) {
  try {
    const user = req.user;
    const role = user.role;

    if (!tieneAccesoGlobal(role)) {
      return res.status(403).json({
        error: 'Solo ADMIN o ADMIN_GENERAL pueden crear alojamientos'
      });
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
 * PATCH /api/alojamientos/:id
 * Actualiza campos permitidos de un alojamiento.
 * SOLO ADMIN y ADMIN_GENERAL.
 * NO permite modificar ocupación directamente.
 */
async function actualizar(req, res) {
  try {
    const user = req.user;
    const role = user.role;
    const { id } = req.params;

    if (!tieneAccesoGlobal(role)) {
      return res.status(403).json({
        error: 'Solo ADMIN o ADMIN_GENERAL pueden actualizar alojamientos'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const alojamiento = await Alojamiento.findById(id);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const data = req.validatedBody;

    if (data.estado) {
      const tieneOcupante =
        alojamiento.ocupacionActual && alojamiento.ocupacionActual.alojado;

      if (tieneOcupante && data.estado !== 'OCUPADO') {
        return res.status(400).json({
          error:
            'No se puede cambiar el estado de un alojamiento con ocupación activa desde este endpoint. Use el flujo institucional (ANEXO_26 / baja).'
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
 * "Baja lógica" de un alojamiento.
 * SOLO ADMIN_GENERAL.
 * 
 * En lugar de borrar, marcamos estado=BAJA,
 * siempre que no tenga ocupación activa.
 */
async function bajaLogica(req, res) {
  try {
    const user = req.user;
    const role = user.role;
    const { id } = req.params;

    if (role !== 'ADMIN_GENERAL') {
      return res.status(403).json({
        error: 'Solo ADMIN_GENERAL puede dar de baja alojamientos'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de alojamiento inválido' });
    }

    const alojamiento = await Alojamiento.findById(id);
    if (!alojamiento) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const tieneOcupante =
      alojamiento.ocupacionActual && alojamiento.ocupacionActual.alojado;

    if (tieneOcupante) {
      return res.status(400).json({
        error:
          'No se puede dar de baja un alojamiento con ocupación activa. Debe gestionarse la desocupación por los anexos correspondientes.'
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
