// routes/estadisticas.js
// Estadísticas generales del sistema ZN98

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const Vivienda = require("../models/Vivienda");
const Formulario = require("../models/Formulario");
const Message = require("../models/Message");

// ---------------------------------------------------------------------------
// Helper: sólo ciertos roles pueden ver estadísticas
// ---------------------------------------------------------------------------
function requireStatsRole(req, res, next) {
  const allowed = ["ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "No autorizado para ver estadísticas" });
  }
  next();
}

// ---------------------------------------------------------------------------
// GET /api/estadisticas/viviendas
// - Total de viviendas
// - Ocupadas / libres / en reparación
// - Porcentaje de cada estado
// ---------------------------------------------------------------------------
router.get("/viviendas", requireAuth, requireStatsRole, async (req, res) => {
  try {
    const total = await Vivienda.countDocuments();

    const ocupadas = await Vivienda.countDocuments({ estado: "OCUPADA" });
    const libres = await Vivienda.countDocuments({
      $or: [{ estado: "LIBRE" }, { estado: null }, { estado: { $exists: false } }],
    });
    const reparacion = await Vivienda.countDocuments({ estado: "REPARACION" });

    function pct(n) {
      if (!total || total === 0) return 0;
      return Math.round((n * 10000) / total) / 100; // 2 decimales
    }

    // Por barrio (si los datos existen)
    const porBarrio = await Vivienda.aggregate([
      {
        $group: {
          _id: "$barrio",
          total: { $sum: 1 },
          ocupadas: {
            $sum: {
              $cond: [{ $eq: ["$estado", "OCUPADA"] }, 1, 0],
            },
          },
          libres: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$estado", "LIBRE"] },
                    { $eq: ["$estado", null] },
                    { $eq: ["$estado", ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          reparacion: {
            $sum: {
              $cond: [{ $eq: ["$estado", "REPARACION"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      ok: true,
      resumen: {
        total,
        ocupadas,
        libres,
        reparacion,
        porcentajes: {
          ocupadas: pct(ocupadas),
          libres: pct(libres),
          reparacion: pct(reparacion),
        },
      },
      porBarrio,
    });
  } catch (err) {
    console.error("GET /api/estadisticas/viviendas", err);
    return res
      .status(500)
      .json({ message: "Error obteniendo estadísticas de viviendas" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/estadisticas/pedidos-trabajo
// - Cuenta pedidos de trabajo (formularios tipo Anexo 11 / 28)
// - Agrupados por estado
// ---------------------------------------------------------------------------
router.get(
  "/pedidos-trabajo",
  requireAuth,
  requireStatsRole,
  async (req, res) => {
    try {
      // Consideramos cualquier formulario cuyo tipo empiece por ANEXO_11_ o ANEXO_28_
      const stats = await Formulario.aggregate([
        {
          $match: {
            $or: [
              { tipoFormulario: { $regex: /^ANEXO_11_/ } },
              { tipoFormulario: { $regex: /^ANEXO_28_/ } },
            ],
          },
        },
        {
          $group: {
            _id: "$estado",
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const total = stats.reduce((acc, row) => acc + row.total, 0);

      return res.json({
        ok: true,
        total,
        porEstado: stats.map((row) => ({
          estado: row._id || "SIN_ESTADO",
          total: row.total,
        })),
      });
    } catch (err) {
      console.error("GET /api/estadisticas/pedidos-trabajo", err);
      return res
        .status(500)
        .json({ message: "Error obteniendo estadísticas de pedidos de trabajo" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/estadisticas/comunicaciones
// - Mensajes totales (últimos 30 días)
// - Leídos / no leídos
// - Cantidad de mensajes enviados por rol remitente
// ---------------------------------------------------------------------------
router.get(
  "/comunicaciones",
  requireAuth,
  requireStatsRole,
  async (req, res) => {
    try {
      // Últimos 30 días
      const desde = new Date();
      desde.setDate(desde.getDate() - 30);

      const baseMatch = { createdAt: { $gte: desde } };

      const total = await Message.countDocuments(baseMatch);
      const leidos = await Message.countDocuments({
        ...baseMatch,
        readAt: { $ne: null },
      });
      const noLeidos = total - leidos;

      const porRolRemitente = await Message.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: "$fromRole",
            total: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);

      return res.json({
        ok: true,
        periodo: {
          desde,
          hasta: new Date(),
        },
        totales: {
          total,
          leidos,
          noLeidos,
        },
        porRolRemitente: porRolRemitente.map((row) => ({
          role: row._id || "SIN_ROL",
          total: row.total,
        })),
      });
    } catch (err) {
      console.error("GET /api/estadisticas/comunicaciones", err);
      return res
        .status(500)
        .json({ message: "Error obteniendo estadísticas de comunicaciones" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/estadisticas/hacinamiento
// - Usa Vivienda.dorm (dormitorios) y Vivienda.convivientes
// - Marca como "potencial hacinamiento" cuando convivientes > dorm * 2
// ---------------------------------------------------------------------------
router.get(
  "/hacinamiento",
  requireAuth,
  requireStatsRole,
  async (req, res) => {
    try {
      // Solo consideramos viviendas con datos de dormitorios
      const viviendasConDatos = await Vivienda.aggregate([
        {
          $match: {
            dorm: { $gt: 0 },
          },
        },
        {
          $project: {
            barrio: 1,
            numero: 1,
            dorm: 1,
            convivientes: 1,
            potencialHacinamiento: {
              $cond: [
                {
                  $gt: [
                    "$convivientes",
                    { $multiply: ["$dorm", 2] }, // regla simple: más de 2 personas por dormitorio
                  ],
                },
                true,
                false,
              ],
            },
          },
        },
      ]);

      const total = viviendasConDatos.length;
      const conHacinamiento = viviendasConDatos.filter(
        (v) => v.potencialHacinamiento
      ).length;

      function pct(n) {
        if (!total || total === 0) return 0;
        return Math.round((n * 10000) / total) / 100;
      }

      // Top 20 casos con más convivientes por dormitorio
      const topCasos = [...viviendasConDatos]
        .filter((v) => v.dorm > 0)
        .map((v) => ({
          barrio: v.barrio,
          numero: v.numero,
          dorm: v.dorm,
          convivientes: v.convivientes || 0,
          ratio:
            v.dorm > 0
              ? Math.round(((v.convivientes || 0) / v.dorm) * 100) / 100
              : 0,
          potencialHacinamiento: v.potencialHacinamiento,
        }))
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 20);

      return res.json({
        ok: true,
        totalViviendasConDatos: total,
        conPotencialHacinamiento: conHacinamiento,
        porcentajeHacinamiento: pct(conHacinamiento),
        ejemplos: topCasos,
      });
    } catch (err) {
      console.error("GET /api/estadisticas/hacinamiento", err);
      return res
        .status(500)
        .json({ message: "Error obteniendo estadísticas de hacinamiento" });
    }
  }
);

module.exports = router;
