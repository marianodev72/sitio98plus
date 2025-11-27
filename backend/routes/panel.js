// routes/panel.js
// Endpoints de estadísticas y panel de control ZN98

const express = require("express");
const router = express.Router();

const { requireAuth, requireRole } = require("../middleware/auth");

const Vivienda = require("../models/vivienda");
const Alojamiento = require("../models/Alojamiento");
const Formulario = require("../models/Formulario");
const Message = require("../models/Message");
const User = require("../models/user");
const Postulacion = require("../models/Postulacion");

// Roles que pueden ver el panel completo
const ADMIN_ROLES = ["ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"];

// ---------------------------------------------------------------------------
// Helper: calcular porcentajes sin romper si total = 0
// ---------------------------------------------------------------------------
function pct(parcial, total) {
  if (!total || total <= 0) return 0;
  return Math.round((parcial * 10000) / total) / 100; // 2 decimales
}

// ---------------------------------------------------------------------------
// GET /api/panel/estadisticas
// Resumen general para el panel de administración
// ---------------------------------------------------------------------------

router.get(
  "/estadisticas",
  requireAuth,
  requireRole(ADMIN_ROLES),
  async (req, res) => {
    try {
      // ---- Viviendas ------------------------------------------------------
      const [
        totalViviendas,
        ocupadasViviendas,
        reparacionViviendas,
      ] = await Promise.all([
        Vivienda.countDocuments({}),
        // ocupadas: tienen titular asignado
        Vivienda.countDocuments({ titular: { $ne: null } }),
        // en reparación: usamos campo estado si existe
        Vivienda.countDocuments({ estado: "REPARACION" }),
      ]);

      const libresViviendas =
        totalViviendas - ocupadasViviendas - reparacionViviendas;

      const viviendaStats = {
        total: totalViviendas,
        ocupadas: ocupadasViviendas,
        libres: libresViviendas < 0 ? 0 : libresViviendas,
        enReparacion: reparacionViviendas,
        porcOcupadas: pct(ocupadasViviendas, totalViviendas),
        porcLibres: pct(
          libresViviendas < 0 ? 0 : libresViviendas,
          totalViviendas
        ),
        porcReparacion: pct(reparacionViviendas, totalViviendas),
      };

      // ---- Alojamiento (estadística básica por ahora) --------------------
      const [
        totalAlojamientos,
        totalPostulacionesAlojados,
      ] = await Promise.all([
        Alojamiento.countDocuments({}),
        Postulacion.countDocuments({ tipo: "ALOJAMIENTO" }),
      ]);

      const alojamientoStats = {
        totalTiposAlojamiento: totalAlojamientos,
        postulacionesAlojados: totalPostulacionesAlojados,
      };

      // ---- Pedidos de trabajo (Permisionarios + Alojados) ---------------
      const tiposPedidoTrabajo = [
        "ANEXO_11_PERMISIONARIO", // Pedido de trabajo permisionario
        "ANEXO_28_ALOJADO", // Pedido de trabajo alojado (cuando lo usemos)
      ];

      const [
        totalPedidos,
        pedidosFinalizados,
        pedidosEnProceso,
      ] = await Promise.all([
        Formulario.countDocuments({
          tipoFormulario: { $in: tiposPedidoTrabajo },
        }),
        Formulario.countDocuments({
          tipoFormulario: { $in: tiposPedidoTrabajo },
          estado: { $in: ["APROBADO", "CERRADO"] },
        }),
        Formulario.countDocuments({
          tipoFormulario: { $in: tiposPedidoTrabajo },
          estado: { $in: ["EN_TRAMITE", "EN_PROCESO"] },
        }),
      ]);

      const pedidosPendientes =
        totalPedidos - pedidosFinalizados - pedidosEnProceso;

      const trabajosStats = {
        totalPedidos,
        finalizados: pedidosFinalizados,
        enProceso: pedidosEnProceso,
        pendientes: pedidosPendientes < 0 ? 0 : pedidosPendientes,
        porcFinalizados: pct(pedidosFinalizados, totalPedidos),
        porcEnProceso: pct(pedidosEnProceso, totalPedidos),
        porcPendientes: pct(
          pedidosPendientes < 0 ? 0 : pedidosPendientes,
          totalPedidos
        ),
      };

      // ---- Mensajería -----------------------------------------------------
      const [totalMensajes, mensajesNoLeidos] = await Promise.all([
        Message.countDocuments({}),
        Message.countDocuments({ readAt: null }),
      ]);

      const mensajesStats = {
        total: totalMensajes,
        noLeidos: mensajesNoLeidos,
        porcNoLeidos: pct(mensajesNoLeidos, totalMensajes),
      };

      // ---- Postulaciones (vivienda) --------------------------------------
      const [
        totalPostulaciones,
        postulacionesAnalisis,
        postulacionesAprobadas,
        postulacionesRechazadas,
      ] = await Promise.all([
        Postulacion.countDocuments({}),
        Postulacion.countDocuments({ estado: "EN_ANALISIS" }),
        Postulacion.countDocuments({ estado: "APROBADA" }),
        Postulacion.countDocuments({ estado: "RECHAZADA" }),
      ]);

      const postulacionesStats = {
        total: totalPostulaciones,
        enAnalisis: postulacionesAnalisis,
        aprobadas: postulacionesAprobadas,
        rechazadas: postulacionesRechazadas,
        porcAnalisis: pct(postulacionesAnalisis, totalPostulaciones),
        porcAprobadas: pct(postulacionesAprobadas, totalPostulaciones),
        porcRechazadas: pct(postulacionesRechazadas, totalPostulaciones),
      };

      return res.json({
        ok: true,
        vivienda: viviendaStats,
        alojamiento: alojamientoStats,
        trabajos: trabajosStats,
        mensajes: mensajesStats,
        postulaciones: postulacionesStats,
      });
    } catch (err) {
      console.error("GET /api/panel/estadisticas", err);
      return res
        .status(500)
        .json({ message: "Error obteniendo estadísticas" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/panel/hacinamiento
// Lista de viviendas ocupadas con tamaño de grupo familiar vs dormitorios
// Sirve para detectar casos de posible hacinamiento.
// ---------------------------------------------------------------------------

router.get(
  "/hacinamiento",
  requireAuth,
  requireRole(ADMIN_ROLES),
  async (req, res) => {
    try {
      // Tomamos todas las viviendas con titular asignado
      const viviendas = await Vivienda.find({
        titular: { $ne: null },
      })
        .populate("titular", "nombre apellido grupo_familiar matricula grado dni")
        .lean();

      const resultado = viviendas.map((v) => {
        const titular = v.titular || {};
        const grupo = Array.isArray(titular.grupo_familiar)
          ? titular.grupo_familiar.length
          : 0;

        // Sumamos al titular
        const totalPersonas = grupo + 1;

        const dormitorios = v.dorm || 0;

        let indice = null;
        if (dormitorios > 0) {
          indice = totalPersonas / dormitorios; // personas por dormitorio
        }

        return {
          viviendaId: String(v._id),
          barrio: v.barrio || "",
          dptoCasa: v.dptoCasa || v.numero || "",
          dormitorios,
          titular: {
            id: titular._id ? String(titular._id) : null,
            nombre: titular.nombre || "",
            apellido: titular.apellido || "",
            matricula: titular.matricula || "",
            grado: titular.grado || "",
            dni: titular.dni || "",
          },
          totalPersonas,
          indicePersonasPorDormitorio: indice,
        };
      });

      // Ordenamos de mayor a menor índice (más gente por dormitorio primero)
      resultado.sort((a, b) => {
        const ia = a.indicePersonasPorDormitorio || 0;
        const ib = b.indicePersonasPorDormitorio || 0;
        return ib - ia;
      });

      // Devolvemos todo, y que el frontend decida hasta dónde mostrar,
      // pero dejamos un "top 20" ya separado para comodidad.
      const top20 = resultado.slice(0, 20);

      return res.json({
        ok: true,
        totalRegistros: resultado.length,
        top20,
        listadoCompleto: resultado,
      });
    } catch (err) {
      console.error("GET /api/panel/hacinamiento", err);
      return res
        .status(500)
        .json({ message: "Error calculando estadística de hacinamiento" });
    }
  }
);

module.exports = router;
