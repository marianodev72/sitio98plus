// backend/models/ServicioVivienda.js
const mongoose = require("mongoose");

const CorreccionSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true },
    descripcion: { type: String, required: true },
  },
  { _id: false }
);

const ServicioViviendaSchema = new mongoose.Schema(
  {
    // Identidad institucional
    viviendaCodigo: { type: String, required: true, index: true }, // ej: "AB-401" / "AS-D-01"
    periodo: { type: String, required: true, index: true },        // ej: "2026-01"
    fechaCarga: { type: Date, required: true },

    // Datos económicos (modelo funcional del módulo)
    servicios: {
      electricidad: { type: Number, default: null }, // DPE MONTO
      agua: { type: Number, default: null },         // DPOSS MONTO
      gas: { type: Number, default: null },          // CAMUZZI MONTO
    },

    // Referencias institucionales (número de servicio por empresa)
    referenciasInstitucionales: {
      dpeNumeroServicio: { type: String, default: "" },
      camuzziNumeroServicio: { type: String, default: "" },
      dpossNumeroServicio: { type: String, default: "" },
    },

    // Observaciones manuales (obligatorias si hay intervención)
    observaciones: { type: String, default: "" },

    // Estado ocupación al momento de la carga
    estadoVivienda: {
      ocupada: { type: Boolean, required: true },
      usuarioId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    // Alertas
    requiereAdministracion: { type: Boolean, default: false }, // true si vivienda no existe o está desocupada
    alertaActiva: { type: Boolean, default: true },

    // Lectura
    leidoPorUsuario: { type: Boolean, default: false },
    fechaLectura: { type: Date, default: null },

    // Correcciones
    fueCorregido: { type: Boolean, default: false },
    correcciones: { type: [CorreccionSchema], default: [] },

    // Auditoría
    creadoPor: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      role: { type: String, required: true },
    },
    creadoEn: { type: Date, required: true },
  },
  { timestamps: false }
);

// Índice compuesto para búsquedas por vivienda+periodo
ServicioViviendaSchema.index({ viviendaCodigo: 1, periodo: 1 });

module.exports = {
  ServicioVivienda: mongoose.model("ServicioVivienda", ServicioViviendaSchema),
};
