// controllers/viviendaController.js
const mongoose = require('mongoose');
const Vivienda = require('../models/Vivienda');
const { ESTADOS_VIVIENDA } = require('../validators/viviendaValidator');

/**
 * Helper: determina si un rol tiene acceso GLOBAL a viviendas.
 */
function tieneAccesoGlobal(role) {
  return role === 'ADMIN' || role === 'ADMIN_GENERAL';
}

/**
 * Helper: roles que pueden ver viviendas por barrio.
 */
function tieneAccesoPorBarrio(role) {
  return role === 'INSPECTOR' || role === 'JEFE_DE_BARRIO';
}

/**
 * GET /api/viviendas
 * Listado de viviendas.
 * - ADMIN/ADMIN_GENERAL: acceso global, con filtros opcionales.
 * - INSPECTOR/JEFE_DE_BARRIO: solo viviendas de su barrioAsignado.
 * - PERMISIONARIO: solo su viviendaAsignada.
 */
async function listar(req, res) {
  try {
    const user = req.user;
    const role = user.role;

    let filtro = {};
    const { barrio, estado, codigo } = req.query;

    // Filtros comunes permitidos para roles globales
    if (barrio) filtro.barrio = barrio;
    if (estado && ESTADOS_VIVIENDA.includes(estado)) filtro.estado = estado;
    if (codigo) filtro.codigo = codigo;

    if (tieneAccesoGlobal(role)) {
      // ADMIN / ADMIN_GENERAL → visión global
      const viviendas = await Vivienda.find(filtro).lean();
      return res.json(viviendas);
    }

    if (tieneAccesoPorBarrio(role)) {
      // INSPECTOR / JEFE_DE_BARRIO → solo su barrio
      if (!user.barrioAsignado) {
        return res.status(400).json({
          error: 'El usuario no tiene un barrioAsignado configurado'
        });
      }

      filtro.barrio = user.barrioAsignado;
      const viviendas = await Vivienda.find(filtro).lean();
      return res.json(viviendas);
    }

    if (role === 'PERMISIONARIO') {
      // Permisionario → solo su viviendaAsignada
      if (!user.viviendaAsignada) {
        return res.json([]); // no tiene vivienda asignada
      }

      if (!mongoose.Types.ObjectId.isValid(user.viviendaAsignada)) {
        return res.status(400).json({
          error: 'viviendaAsignada del usuario es inválida'
        });
      }

      const vivienda = await Vivienda.findById(user.viviendaAsignada).lean();
      if (!vivienda) {
        return res.json([]);
      }
      return res.json([vivienda]);
    }

    // Otros roles (POSTULANTE, ALOJADO, etc.) no deben listar viviendas
    return res.status(403).json({
      error: `El rol ${role} no está autorizado para listar viviendas`
    });
  } catch (err) {
    console.error('Error en listar viviendas:', err);
    return res.status(500).json({ error: 'Error interno al listar viviendas' });
  }
}

/**
 * GET /api/viviendas/:id
 * Obtiene una vivienda por ID respetando las reglas de visibilidad por rol.
 */
async function obtenerPorId(req, res) {
  try {
    const user = req.user;
    const role = user.role;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de vivienda inválido' });
    }

    const vivienda = await Vivienda.findById(id).lean();
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    if (tieneAccesoGlobal(role)) {
      return res.json(vivienda);
    }

    if (tieneAccesoPorBarrio(role)) {
      if (!user.barrioAsignado) {
        return res.status(400).json({
          error: 'El usuario no tiene un barrioAsignado configurado'
        });
      }
      if (vivienda.barrio !== user.barrioAsignado) {
        return res.status(403).json({
          error: 'No tiene permiso para ver viviendas de otro barrio'
        });
      }
      return res.json(vivienda);
    }

    if (role === 'PERMISIONARIO') {
      if (!user.viviendaAsignada) {
        return res.status(403).json({
          error: 'No tiene vivienda asignada'
        });
      }
      if (String(user.viviendaAsignada) !== String(vivienda._id)) {
        return res.status(403).json({
          error: 'No tiene permiso para ver esta vivienda'
        });
      }
      return res.json(vivienda);
    }

    return res.status(403).json({
      error: `El rol ${role} no está autorizado para ver viviendas`
    });
  } catch (err) {
    console.error('Error en obtener vivienda por ID:', err);
    return res.status(500).json({ error: 'Error interno al obtener vivienda' });
  }
}

/**
 * POST /api/viviendas
 * Crea una nueva vivienda.
 * SOLO ADMIN y ADMIN_GENERAL.
 * No se toca ocupacionActual ni historialOcupacion desde acá.
 */
async function crear(req, res) {
  try {
    const user = req.user;
    const role = user.role;

    if (!tieneAccesoGlobal(role)) {
      return res.status(403).json({
        error: 'Solo ADMIN o ADMIN_GENERAL pueden crear viviendas'
      });
    }

    const data = req.validatedBody;

    // Validar unicidad de codigo
    const existente = await Vivienda.findOne({ codigo: data.codigo }).lean();
    if (existente) {
      return res.status(409).json({
        error: 'Ya existe una vivienda con ese código'
      });
    }

    const vivienda = new Vivienda({
      codigo: data.codigo,
      direccion: data.direccion,
      barrio: data.barrio,
      descripcion: data.descripcion || '',
      estado: data.estado || 'DISPONIBLE'
      // NO seteamos ocupacionActual ni historialOcupacion aquí
    });

    const guardada = await vivienda.save();
    return res.status(201).json(guardada);
  } catch (err) {
    console.error('Error al crear vivienda:', err);
    return res.status(500).json({ error: 'Error interno al crear vivienda' });
  }
}

/**
 * PATCH /api/viviendas/:id
 * Actualiza campos permitidos de una vivienda.
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
        error: 'Solo ADMIN o ADMIN_GENERAL pueden actualizar viviendas'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de vivienda inválido' });
    }

    const vivienda = await Vivienda.findById(id);
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    const data = req.validatedBody;

    // Reglas institucionales: no romper ocupación
    if (data.estado) {
      const tieneOcupante =
        vivienda.ocupacionActual && vivienda.ocupacionActual.permisionario;

      // No permitir marcar DISPONIBLE si tiene ocupante
      if (tieneOcupante && data.estado !== 'OCUPADA') {
        return res.status(400).json({
          error:
            'No se puede cambiar el estado de una vivienda con ocupación activa desde este endpoint. Use el flujo institucional (ANEXO_09 / baja).'
        });
      }

      // No permitir setear OCUPADA manualmente si no hay ocupante
      if (!tieneOcupante && data.estado === 'OCUPADA') {
        return res.status(400).json({
          error:
            'No se puede marcar una vivienda como OCUPADA sin asignación institucional (ANEXO_02).'
        });
      }
    }

    // Aplicar cambios permitidos
    if (data.direccion !== undefined) vivienda.direccion = data.direccion;
    if (data.barrio !== undefined) vivienda.barrio = data.barrio;
    if (data.descripcion !== undefined) vivienda.descripcion = data.descripcion;
    if (data.estado !== undefined) vivienda.estado = data.estado;

    const guardada = await vivienda.save();
    return res.json(guardada);
  } catch (err) {
    console.error('Error al actualizar vivienda:', err);
    return res.status(500).json({ error: 'Error interno al actualizar vivienda' });
  }
}

/**
 * DELETE /api/viviendas/:id
 * "Baja lógica" de una vivienda.
 * Recomendado SOLO para ADMIN_GENERAL.
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
        error: 'Solo ADMIN_GENERAL puede dar de baja viviendas'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de vivienda inválido' });
    }

    const vivienda = await Vivienda.findById(id);
    if (!vivienda) {
      return res.status(404).json({ error: 'Vivienda no encontrada' });
    }

    const tieneOcupante =
      vivienda.ocupacionActual && vivienda.ocupacionActual.permisionario;

    if (tieneOcupante) {
      return res.status(400).json({
        error:
          'No se puede dar de baja una vivienda con ocupación activa. Debe gestionarse la desocupación por los anexos correspondientes.'
      });
    }

    vivienda.estado = 'BAJA';
    const guardada = await vivienda.save();

    return res.json({
      message: 'Vivienda dada de baja correctamente (baja lógica)',
      vivienda: guardada
    });
  } catch (err) {
    console.error('Error en baja lógica de vivienda:', err);
    return res.status(500).json({ error: 'Error interno al dar de baja vivienda' });
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  bajaLogica
};
