// backend/routes/formularios.js
// API de formularios (anexos de permisionarios y alojados)

const express = require("express");
const router = express.Router();

const FormTemplate = require("../models/FormTemplate");
const Formulario = require("../models/Formulario");
const Postulacion = require("../models/Postulacion");
const Vivienda = require("../models/vivienda");
const Alojamiento = require("../models/Alojamiento");
const Message = require("../models/Message");

const { requireAuth, requireRole } = require("../middleware/auth");

// ============================================================================
// Helpers
// ============================================================================

function hasRole(user, roles = []) {
  if (!user) return false;
  return roles.includes(user.role);
}

// Crea un mensaje interno simple (notificación de sistema)
async function sendInternalMessage({ fromUser, toUser, subject, body }) {
  try {
    const msg = new Message({
      fromUser,
      fromRole: "ADMIN",
      toUser,
      toRole: null,
      kind: "DIRECT",
      subject,
      body,
    });
    await msg.save();
  } catch (err) {
    console.error("Error creando mensaje interno de sistema:", err);
  }
}

// ============================================================================
//  ADMIN: Seed de plantillas básicas (permisionarios + alojados)
//  POST /api/formularios/admin/seed-basicos
// ============================================================================
router.post(
  "/admin/seed-basicos",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const templatesToEnsure = [
        // -----------------------------------------------------------
        // PERMISIONARIOS
        // -----------------------------------------------------------
        {
          codigo: "ANEXO_11_PERMISIONARIO",
          nombre: "Pedido de Trabajo - Permisionario",
          numero: 11,
          tipo: "PERMISIONARIO",
          descripcion:
            "Formulario para solicitar trabajos de mantenimiento en la vivienda fiscal.",
          rolesInvolucrados: ["PERMISIONARIO", "INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: true,
          requiereAlojamiento: false,
          campos: [
            {
              key: "tipoTrabajo",
              label: "Tipo de trabajo",
              type: "string",
              required: true,
            },
            {
              key: "descripcion",
              label: "Descripción del problema o trabajo",
              type: "string",
              required: true,
            },
            {
              key: "urgencia",
              label: "Nivel de urgencia",
              type: "string",
              required: true,
            },
            {
              key: "ambiente",
              label: "Ambiente / sector",
              type: "string",
              required: false,
            },
            {
              key: "observacionesAdicionales",
              label: "Observaciones adicionales",
              type: "string",
              required: false,
            },
          ],
        },
        {
          codigo: "ANEXO_02_PERMISIONARIO",
          nombre: "Acta de Asignación de Vivienda Fiscal",
          numero: 2,
          tipo: "PERMISIONARIO",
          descripcion:
            "Acta mediante la cual se asigna una vivienda fiscal al permisionario.",
          rolesInvolucrados: ["PERMISIONARIO", "ENCARGADO_GENERAL"],
          requiereVivienda: true,
          requiereAlojamiento: false,
          campos: [
            {
              key: "detalleAsignacion",
              label: "Detalle de la asignación",
              type: "string",
              required: true,
            },
            {
              key: "fechaAsignacion",
              label: "Fecha de asignación",
              type: "date",
              required: true,
            },
          ],
        },
        {
          codigo: "ANEXO_08_PERMISIONARIO",
          nombre: "Inspección Previa a la Entrega",
          numero: 8,
          tipo: "PERMISIONARIO",
          descripcion:
            "Formulario de inspección de la vivienda antes de la entrega definitiva.",
          rolesInvolucrados: ["INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: true,
          requiereAlojamiento: false,
          campos: [
            {
              key: "resultadoInspeccion",
              label: "Resultado de la inspección",
              type: "string",
              required: true,
            },
            {
              key: "observacionesGenerales",
              label: "Observaciones generales",
              type: "string",
              required: false,
            },
          ],
        },
        {
          codigo: "ANEXO_09_PERMISIONARIO",
          nombre: "Acta de Entrega de la Vivienda Fiscal",
          numero: 9,
          tipo: "PERMISIONARIO",
          descripcion:
            "Acta mediante la cual se formaliza la entrega de la vivienda fiscal.",
          rolesInvolucrados: [
            "PERMISIONARIO",
            "INSPECTOR",
            "ENCARGADO_GENERAL",
          ],
          requiereVivienda: true,
          requiereAlojamiento: false,
          campos: [
            {
              key: "estadoFinalVivienda",
              label: "Estado final de la vivienda",
              type: "string",
              required: true,
            },
            {
              key: "observacionesEntrega",
              label: "Observaciones de la entrega",
              type: "string",
              required: false,
            },
          ],
        },

        // -----------------------------------------------------------
        // ALOJADOS
        // -----------------------------------------------------------

        // ANEXO 19 – Inscripción para ocupar alojamiento naval
        {
          codigo: "ANEXO_19_ALOJADO",
          nombre: "Inscripción para ocupar alojamiento naval",
          numero: 19,
          tipo: "ALOJADO",
          descripcion:
            "Formulario de inscripción para ocupar un alojamiento naval.",
          rolesInvolucrados: ["POSTULANTE", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "motivoSolicitud",
              label: "Motivo de la solicitud",
              type: "string",
              required: true,
            },
            {
              key: "fechaPrevistaIngreso",
              label: "Fecha prevista de ingreso",
              type: "date",
              required: false,
            },
          ],
        },

        // ANEXO 20 – Asignación de alojamiento
        {
          codigo: "ANEXO_20_ALOJADO",
          nombre: "Asignación de alojamiento naval",
          numero: 20,
          tipo: "ALOJADO",
          descripcion:
            "Acta mediante la cual se asigna un alojamiento naval al alojado.",
          rolesInvolucrados: ["ALOJADO", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "detalleAsignacion",
              label: "Detalle de la asignación",
              type: "string",
              required: true,
            },
            {
              key: "fechaAsignacion",
              label: "Fecha de asignación",
              type: "date",
              required: true,
            },
          ],
        },

        // ANEXO 21 – Novedades de toma de alojamiento
        {
          codigo: "ANEXO_21_ALOJADO",
          nombre: "Novedades de toma de alojamiento",
          numero: 21,
          tipo: "ALOJADO",
          descripcion:
            "Formulario para registrar novedades al momento de tomar el alojamiento.",
          rolesInvolucrados: ["ALOJADO", "INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "novedadesIniciales",
              label: "Novedades iniciales",
              type: "string",
              required: true,
            },
            {
              key: "observacionesInspector",
              label: "Observaciones del inspector",
              type: "string",
              required: false,
            },
          ],
        },

        // ANEXO 22 – Ampliación de novedades
        {
          codigo: "ANEXO_22_ALOJADO",
          nombre: "Ampliación de novedades de alojamiento",
          numero: 22,
          tipo: "ALOJADO",
          descripcion:
            "Formulario para ampliar o actualizar novedades sobre el alojamiento.",
          rolesInvolucrados: ["ALOJADO", "INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "novedadesAdicionales",
              label: "Novedades adicionales",
              type: "string",
              required: true,
            },
            {
              key: "accionesTomadas",
              label: "Acciones tomadas",
              type: "string",
              required: false,
            },
          ],
        },

        // ANEXO 23 – Acta de entrega del alojamiento naval
        {
          codigo: "ANEXO_23_ALOJADO",
          nombre: "Acta de entrega del alojamiento naval",
          numero: 23,
          tipo: "ALOJADO",
          descripcion:
            "Acta para documentar la entrega del alojamiento por parte del alojado.",
          rolesInvolucrados: ["ALOJADO", "INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "estadoFinalAlojamiento",
              label: "Estado final del alojamiento",
              type: "string",
              required: true,
            },
            {
              key: "observacionesEntrega",
              label: "Observaciones de la entrega",
              type: "string",
              required: false,
            },
          ],
        },

        // ANEXO 24 – Solicitud de baja del alojamiento naval
        {
          codigo: "ANEXO_24_ALOJADO",
          nombre: "Solicitud de baja del alojamiento naval",
          numero: 24,
          tipo: "ALOJADO",
          descripcion:
            "Formulario para que el alojado solicite la baja del alojamiento naval.",
          rolesInvolucrados: ["ALOJADO", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "motivoBaja",
              label: "Motivo de la baja",
              type: "string",
              required: true,
            },
            {
              key: "fechaPrevistaDesalojo",
              label: "Fecha prevista de desalojo",
              type: "date",
              required: true,
            },
          ],
        },

        // ANEXO 25 – Conformidad de baja final
        {
          codigo: "ANEXO_25_ALOJADO",
          nombre: "Conformidad de baja final del alojamiento",
          numero: 25,
          tipo: "ALOJADO",
          descripcion:
            "Acta de conformidad de la baja definitiva del alojamiento naval.",
          rolesInvolucrados: ["ALOJADO", "INSPECTOR", "ENCARGADO_GENERAL"],
          requiereVivienda: false,
          requiereAlojamiento: true,
          campos: [
            {
              key: "conformidadBaja",
              label: "Conformidad de la baja",
              type: "string",
              required: true,
            },
            {
              key: "observacionesFinales",
              label: "Observaciones finales",
              type: "string",
              required: false,
            },
          ],
        },
      ];

      const results = [];

      for (const tmpl of templatesToEnsure) {
        const existing = await FormTemplate.findOne({ codigo: tmpl.codigo });
        if (existing) {
          existing.nombre = tmpl.nombre;
          existing.descripcion = tmpl.descripcion;
          existing.numero = tmpl.numero;
          existing.tipo = tmpl.tipo;
          existing.rolesInvolucrados = tmpl.rolesInvolucrados;
          existing.requiereVivienda = tmpl.requiereVivienda;
          existing.requiereAlojamiento = tmpl.requiereAlojamiento;
          existing.campos = tmpl.campos;
          existing.activo = true;
          await existing.save();
          results.push({ codigo: tmpl.codigo, action: "updated" });
        } else {
          const created = await FormTemplate.create({
            ...tmpl,
            activo: true,
          });
          results.push({ codigo: tmpl.codigo, action: "created" });
        }
      }

      return res.json({
        ok: true,
        message: "Plantillas básicas creadas/actualizadas",
        templates: results,
      });
    } catch (err) {
      console.error("POST /api/formularios/admin/seed-basicos", err);
      return res
        .status(500)
        .json({ message: "Error generando plantillas básicas" });
    }
  }
);

// ============================================================================
//  GET /api/formularios/templates
//  Listar plantillas activas
// ============================================================================
router.get(
  "/templates",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const templates = await FormTemplate.find({ activo: true }).sort({
        tipo: 1,
        numero: 1,
      });
      return res.json({ ok: true, templates });
    } catch (err) {
      console.error("GET /api/formularios/templates", err);
      return res.status(500).json({ message: "Error listando plantillas" });
    }
  }
);

// ============================================================================
//  POST /api/formularios
//  Crear formulario (permisionario o alojado)
// ============================================================================
router.post("/", requireAuth, async (req, res) => {
  try {
    const { tipoFormulario, postulacionId, viviendaId, alojamientoId, datos } =
      req.body;

    if (!tipoFormulario) {
      return res
        .status(400)
        .json({ message: "tipoFormulario es requerido (ej. ANEXO_11_PERMISIONARIO)" });
    }

    const template = await FormTemplate.findOne({
      codigo: tipoFormulario,
      activo: true,
    });

    if (!template) {
      return res.status(400).json({
        message: `No existe plantilla activa para tipoFormulario=${tipoFormulario}`,
      });
    }

    // Validar rol que puede iniciar el formulario según tipo
    const user = req.user;
    const codigo = template.codigo;

    // Ejemplos de reglas básicas (las podemos ajustar luego):
    // - ANEXO_11_PERMISIONARIO: lo inicia PERMISIONARIO o ADMIN
    // - ANEXO_02_PERMISIONARIO: lo inicia ADMIN / ENCARGADO_GENERAL
    // - ANEXO_19_ALOJADO: lo inicia POSTULANTE
    // - ANEXO_20+ alojado: lo inicia ADMIN / ENCARGADO_GENERAL
    if (codigo === "ANEXO_11_PERMISIONARIO") {
      if (!hasRole(user, ["PERMISIONARIO", "ADMIN", "ENCARGADO_GENERAL"])) {
        return res.status(403).json({
          message: "Su rol no puede iniciar este formulario.",
        });
      }
    } else if (
      codigo === "ANEXO_02_PERMISIONARIO" ||
      codigo === "ANEXO_08_PERMISIONARIO" ||
      codigo === "ANEXO_09_PERMISIONARIO"
    ) {
      if (!hasRole(user, ["ADMIN", "ENCARGADO_GENERAL"])) {
        return res.status(403).json({
          message: "Su rol no puede iniciar este formulario.",
        });
      }
    } else if (codigo === "ANEXO_19_ALOJADO") {
      if (!hasRole(user, ["POSTULANTE", "ADMIN", "ENCARGADO_GENERAL"])) {
        return res.status(403).json({
          message: "Su rol no puede iniciar este formulario.",
        });
      }
    } else if (
      codigo === "ANEXO_20_ALOJADO" ||
      codigo === "ANEXO_21_ALOJADO" ||
      codigo === "ANEXO_22_ALOJADO" ||
      codigo === "ANEXO_23_ALOJADO" ||
      codigo === "ANEXO_24_ALOJADO" ||
      codigo === "ANEXO_25_ALOJADO"
    ) {
      if (!hasRole(user, ["ADMIN", "ENCARGADO_GENERAL"])) {
        return res.status(403).json({
          message: "Su rol no puede iniciar este formulario.",
        });
      }
    }

    // Asociación con postulacion / vivienda / alojamiento
    let viviendaRef = null;
    let alojamientoRef = null;
    let postulacionRef = null;

    if (template.requiereVivienda) {
      if (!viviendaId) {
        return res
          .status(400)
          .json({ message: "Este formulario requiere viviendaId" });
      }
      viviendaRef = await Vivienda.findById(viviendaId);
      if (!viviendaRef) {
        return res.status(404).json({ message: "Vivienda no encontrada" });
      }
    }

    if (template.requiereAlojamiento) {
      if (!alojamientoId) {
        return res
          .status(400)
          .json({ message: "Este formulario requiere alojamientoId" });
      }
      alojamientoRef = await Alojamiento.findById(alojamientoId);
      if (!alojamientoRef) {
        return res.status(404).json({ message: "Alojamiento no encontrado" });
      }
    }

    if (postulacionId) {
      postulacionRef = await Postulacion.findById(postulacionId);
      if (!postulacionRef) {
        return res.status(404).json({ message: "Postulación no encontrada" });
      }
    }

    const formulario = await Formulario.create({
      template: template._id,
      tipoFormulario: template.codigo,
      userCreador: user.id,
      userTitular: user.id, // en muchos casos será el mismo
      postulacion: postulacionRef ? postulacionRef._id : undefined,
      vivienda: viviendaRef ? viviendaRef._id : undefined,
      alojamiento: alojamientoRef ? alojamientoRef._id : undefined,
      datos: datos || {},
      estado: "EN_ANALISIS", // estados posibles: EN_ANALISIS, APROBADO, RECHAZADO, CERRADO
      historial: [
        {
          estado: "EN_ANALISIS",
          usuario: user.id,
          comentario: "Formulario creado.",
          fecha: new Date(),
        },
      ],
    });

    return res.status(201).json({ ok: true, formulario });
  } catch (err) {
    console.error("POST /api/formularios Error:", err);
    return res.status(500).json({ message: "Error creando formulario" });
  }
});

// ============================================================================
//  GET /api/formularios/mios
//  Formularios donde el usuario es creador o titular
// ============================================================================
router.get("/mios", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const formularios = await Formulario.find({
      $or: [{ userCreador: userId }, { userTitular: userId }],
    })
      .populate("template")
      .populate("vivienda")
      .populate("alojamiento")
      .populate("postulacion");

    return res.json({ ok: true, formularios });
  } catch (err) {
    console.error("GET /api/formularios/mios", err);
    return res.status(500).json({ message: "Error listando formularios" });
  }
});

// ============================================================================
//  GET /api/formularios/admin
//  Listado general (sólo ADMIN / ENCARGADO_GENERAL)
// ============================================================================
router.get(
  "/admin",
  requireAuth,
  requireRole("ADMIN", "ENCARGADO_GENERAL"),
  async (req, res) => {
    try {
      const { tipoFormulario, estado } = req.query;
      const filter = {};

      if (tipoFormulario) filter.tipoFormulario = tipoFormulario;
      if (estado) filter.estado = estado;

      const formularios = await Formulario.find(filter)
        .populate("template")
        .populate("vivienda")
        .populate("alojamiento")
        .populate("postulacion")
        .populate("userTitular", "nombre apellido email role");

      return res.json({ ok: true, formularios });
    } catch (err) {
      console.error("GET /api/formularios/admin", err);
      return res.status(500).json({ message: "Error listando formularios" });
    }
  }
);

// ============================================================================
//  GET /api/formularios/:id
//  Ver detalle
// ============================================================================
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const formulario = await Formulario.findById(id)
      .populate("template")
      .populate("vivienda")
      .populate("alojamiento")
      .populate("postulacion")
      .populate("userTitular", "nombre apellido email role");

    if (!formulario) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }

    // Podríamos agregar más lógica de permisos acá si hace falta
    return res.json({ ok: true, formulario });
  } catch (err) {
    console.error("GET /api/formularios/:id", err);
    return res.status(500).json({ message: "Error obteniendo formulario" });
  }
});

// ============================================================================
//  PATCH /api/formularios/admin/:id/estado
//  Cambiar estado (ADMIN / ENCARGADO_GENERAL / INSPECTOR según caso)
// ============================================================================
router.patch(
  "/admin/:id/estado",
  requireAuth,
  requireRole("ADMIN", "ENCARGADO_GENERAL", "INSPECTOR"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.body;

      const allowed = ["EN_ANALISIS", "APROBADO", "RECHAZADO", "CERRADO"];
      if (!allowed.includes(estado)) {
        return res.status(400).json({ message: "Estado inválido" });
      }

      const formulario = await Formulario.findById(id)
        .populate("template")
        .populate("userTitular")
        .populate("vivienda")
        .populate("alojamiento");

      if (!formulario) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      formulario.estado = estado;
      formulario.historial.push({
        estado,
        usuario: req.user.id,
        comentario: comentario || "",
        fecha: new Date(),
      });

      await formulario.save();

      // ------------------------------------------------------------------
      // REGLAS AUTOMÁTICAS BÁSICAS
      // (después las afinamos con tu feedback)
      // ------------------------------------------------------------------

      const codigo = formulario.tipoFormulario;

      // 1) ANEXO_11_PERMISIONARIO (Pedido de trabajo)
      if (codigo === "ANEXO_11_PERMISIONARIO") {
        if (
          (estado === "APROBADO" || estado === "CERRADO") &&
          formulario.userTitular
        ) {
          await sendInternalMessage({
            fromUser: req.user.id,
            toUser: formulario.userTitular._id,
            subject: `Pedido de trabajo ${estado}`,
            body: `Su pedido de trabajo (Formulario ${codigo}) fue marcado como ${estado}.`,
          });
        }
      }

      // 2) ANEXO_02_PERMISIONARIO – Asignación de vivienda
      if (codigo === "ANEXO_02_PERMISIONARIO" && estado === "APROBADO") {
        if (formulario.vivienda && formulario.userTitular) {
          await Vivienda.findByIdAndUpdate(formulario.vivienda._id, {
            titular: formulario.userTitular._id,
            estadoOcupacion: "OCUPADA",
          });

          await sendInternalMessage({
            fromUser: req.user.id,
            toUser: formulario.userTitular._id,
            subject: "Asignación de vivienda aprobada",
            body: "Se ha aprobado el acta de asignación de vivienda fiscal.",
          });
        }
      }

      // 3) ANEXO_09_PERMISIONARIO – Acta de entrega vivienda:
      //    si está CERRADO => marcar vivienda DESOCUPADA
      if (codigo === "ANEXO_09_PERMISIONARIO" && estado === "CERRADO") {
        if (formulario.vivienda && formulario.userTitular) {
          await Vivienda.findByIdAndUpdate(formulario.vivienda._id, {
            titular: null,
            estadoOcupacion: "DESOCUPADA",
          });

          await sendInternalMessage({
            fromUser: req.user.id,
            toUser: formulario.userTitular._id,
            subject: "Entrega de vivienda registrada",
            body: "Se ha registrado la entrega de su vivienda fiscal.",
          });
        }
      }

      // 4) ANEXOS ALOJADOS – reglas básicas
      // ANEXO_20_ALOJADO (Asignación de alojamiento) APROBADO => marcar alojamiento como OCUPADO
      if (codigo === "ANEXO_20_ALOJADO" && estado === "APROBADO") {
        if (formulario.alojamiento && formulario.userTitular) {
          await Alojamiento.findByIdAndUpdate(formulario.alojamiento._id, {
            estadoOcupacion: "OCUPADO",
          });

          await sendInternalMessage({
            fromUser: req.user.id,
            toUser: formulario.userTitular._id,
            subject: "Asignación de alojamiento aprobada",
            body: "Se ha aprobado la asignación de su alojamiento naval.",
          });
        }
      }

      // ANEXO_23_ALOJADO (Acta de entrega alojamiento) CERRADO => marcar alojamiento DESOCUPADO
      if (codigo === "ANEXO_23_ALOJADO" && estado === "CERRADO") {
        if (formulario.alojamiento && formulario.userTitular) {
          await Alojamiento.findByIdAndUpdate(formulario.alojamiento._id, {
            estadoOcupacion: "DESOCUPADO",
          });

          await sendInternalMessage({
            fromUser: req.user.id,
            toUser: formulario.userTitular._id,
            subject: "Entrega de alojamiento registrada",
            body: "Se ha registrado la entrega de su alojamiento naval.",
          });
        }
      }

      return res.json({ ok: true, formulario });
    } catch (err) {
      console.error("PATCH /api/formularios/admin/:id/estado", err);
      return res.status(500).json({ message: "Error actualizando estado" });
    }
  }
);

module.exports = router;
