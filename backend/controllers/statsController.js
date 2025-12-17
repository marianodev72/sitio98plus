// backend/controllers/statsController.js
// Controlador de estadísticas institucionales ZN98 / Sitio 98 Plus

const Vivienda = require('../models/vivienda');
const { User } = require('../models/user'); // 👈 IMPORTACIÓN CORRECTA
const { FormSubmission } = require('../models/FormSubmission'); // ✅ FIX: faltaba esto

// Estos modelos pueden no existir todavía.
// Si no existen, usamos stubs y dejamos 0 en esas secciones.
let Alojamiento = null;
let PedidoTrabajoVivienda = null;
let PedidoTrabajoAlojamiento = null;

try {
  Alojamiento = require('../models/alojamiento');
} catch (err) {
  console.log('[STATS] Modelo Alojamiento no encontrado, se usará 0 en alojamientos.');
}

try {
  PedidoTrabajoVivienda = require('../models/PedidoTrabajoVivienda');
} catch (err) {
  console.log('[STATS] Modelo PedidoTrabajoVivienda no encontrado, se usará 0 en pedidos vivienda.');
}

try {
  PedidoTrabajoAlojamiento = require('../models/PedidoTrabajoAlojamiento');
} catch (err) {
  console.log('[STATS] Modelo PedidoTrabajoAlojamiento no encontrado, se usará 0 en pedidos alojamiento.');
}

/**
 * GET /api/stats/resumen
 * Devuelve un resumen estadístico para el panel del ADMIN_GENERAL.
 */
exports.getResumenStats = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // 0) Formularios / Postulaciones (ANEXO_01 / ANEXO_02)
    // ─────────────────────────────────────────────
    const anexos01TotalPromise = FormSubmission.countDocuments({ codigo: 'ANEXO_01' });
    const anexos02TotalPromise = FormSubmission.countDocuments({ codigo: 'ANEXO_02' });

    // ─────────────────────────────────────────────
    // 1) Viviendas: totales, ocupadas, por estado, por barrio, por dormitorios
    // ─────────────────────────────────────────────
    const viviendasTotalPromise = Vivienda.countDocuments({});
    const viviendasOcupadasPromise = Vivienda.countDocuments({ estado: 'OCUPADA' });

    const viviendasPorEstadoPromise = Vivienda.aggregate([
      { $group: { _id: '$estado', cantidad: { $sum: 1 } } },
    ]);

    const viviendasPorBarrioPromise = Vivienda.aggregate([
      { $group: { _id: '$barrio', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
    ]);

    const viviendasPorDormPromise = Vivienda.aggregate([
      { $group: { _id: '$dormitorios', cantidad: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // ─────────────────────────────────────────────
    // 2) Usuarios: por rol
    // ─────────────────────────────────────────────
    const usuariosPorRolPromise = User.aggregate([
      { $group: { _id: '$role', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
    ]);

    // ─────────────────────────────────────────────
    // 3) Pedidos de trabajo y alojamientos (si existen modelos)
    // ─────────────────────────────────────────────
    const pedidosViviendaCountPromise = PedidoTrabajoVivienda
      ? PedidoTrabajoVivienda.countDocuments({})
      : Promise.resolve(0);

    const pedidosAlojamientoCountPromise = PedidoTrabajoAlojamiento
      ? PedidoTrabajoAlojamiento.countDocuments({})
      : Promise.resolve(0);

    const alojamientosTotalPromise = Alojamiento
      ? Alojamiento.countDocuments({})
      : Promise.resolve(0);

    const alojadosPorTipoPromise = Alojamiento
      ? Alojamiento.aggregate([
          { $group: { _id: '$tipo', cantidad: { $sum: 1 } } },
        ])
      : Promise.resolve([]);

    // ─────────────────────────────────────────────
    // 4) Ejecutar todas las promesas en paralelo
    // ─────────────────────────────────────────────
    const [
      anexos01Total,
      anexos02Total,

      viviendasTotal,
      viviendasOcupadas,
      viviendasPorEstadoRaw,
      viviendasPorBarrioRaw,
      viviendasPorDormRaw,
      usuariosPorRolRaw,
      pedidosViviendaTotal,
      pedidosAlojamientoTotal,
      alojamientosTotal,
      alojadosPorTipoRaw,
    ] = await Promise.all([
      anexos01TotalPromise,
      anexos02TotalPromise,

      viviendasTotalPromise,
      viviendasOcupadasPromise,
      viviendasPorEstadoPromise,
      viviendasPorBarrioPromise,
      viviendasPorDormPromise,
      usuariosPorRolPromise,
      pedidosViviendaCountPromise,
      pedidosAlojamientoCountPromise,
      alojamientosTotalPromise,
      alojadosPorTipoPromise,
    ]);

    // ─────────────────────────────────────────────
    // 5) Normalizar datos para el frontend
    // ─────────────────────────────────────────────
    const viviendasPorEstado = (viviendasPorEstadoRaw || []).map((doc) => ({
      estado: doc._id || 'SIN_ESTADO',
      cantidad: doc.cantidad || 0,
    }));

    const viviendasPorBarrio = (viviendasPorBarrioRaw || []).map((doc) => ({
      barrio: doc._id || 'SIN_BARRIO',
      cantidad: doc.cantidad || 0,
    }));

    const viviendasPorDorm = (viviendasPorDormRaw || []).map((doc) => ({
      dorm: doc._id == null ? 'SIN_DATO' : String(doc._id),
      cantidad: doc.cantidad || 0,
    }));

    const usuariosPorRol = (usuariosPorRolRaw || []).map((doc) => ({
      rol: doc._id || 'SIN_ROL',
      cantidad: doc.cantidad || 0,
    }));

    const alojadosPorTipo = (alojadosPorTipoRaw || []).map((doc) => ({
      tipo: doc._id || 'SIN_TIPO',
      cantidad: doc.cantidad || 0,
    }));

    // ─────────────────────────────────────────────
    // 6) Construir respuesta final
    // ─────────────────────────────────────────────
    const respuesta = {
      // ✅ Nuevo bloque: formularios
      formularios: {
        anexos01Total: anexos01Total || 0,
        anexos02Total: anexos02Total || 0,
      },

      viviendas: {
        total: viviendasTotal || 0,
        ocupadas: viviendasOcupadas || 0,
      },
      viviendasPorEstado,
      viviendasPorBarrio,
      viviendasPorDorm,

      usuarios: {
        total: usuariosPorRol.reduce((acc, u) => acc + (u.cantidad || 0), 0),
      },
      usuariosPorRol,

      pedidos: {
        total: (pedidosViviendaTotal || 0) + (pedidosAlojamientoTotal || 0),
        viviendas: pedidosViviendaTotal || 0,
        alojamientos: pedidosAlojamientoTotal || 0,
      },

      alojamientos: {
        total: alojamientosTotal || 0,
      },
      alojadosPorTipo,
    };

    return res.json(respuesta);
  } catch (err) {
    console.error('[STATS] Error en getResumenStats:', err);
    return res.status(500).json({
      message: 'Error al obtener estadísticas',
      error: err.message,
    });
  }
};
