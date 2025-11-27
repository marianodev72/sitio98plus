// backend/models/Formulario.js
// Instancias de formularios (anexos) ZN98

const mongoose = require("mongoose");

const historialSchema = new mongoose.Schema(
  {
    estado: { type: String },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comentario: { type: String },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false }
);

const formularioSchema = new mongoose.Schema(
  {
    // Plantilla base (ANEXO_02_PERMISIONARIO, ANEXO_08_PERMISIONARIO, etc.)
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },

    // Código lógico del tipo de formulario, ej: "ANEXO_08_PERMISIONARIO"
    tipoFormulario: {
      type: String,
      required: true,
      index: true,
    },

    // Nombre interno legible / identificador armado:
    // ej: ANEXO_08_J-01_16_11_25
    nombreInterno: {
      type: String,
      index: true,
    },

    // Quién creó el formulario
    userCreador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Titular del trámite (permisionario / alojado, etc.)
    userTitular: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Vivienda asociada (para anexos de permisionarios)
    vivienda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vivienda",
    },

    // En el futuro podremos agregar: alojamiento, postulación, etc.

    // Estado del formulario
    estado: {
      type: String,
      enum: [
        "EN_ANALISIS",
        "APROBADO",
        "RECHAZADO",
        "PENDIENTE",
        "FINALIZADO",
        "ANULADO",

      ],
      default: "PENDIENTE",
      index: true,
    },

    // Datos dinámicos (campos del formulario)
    datos: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Historial de cambios de estado / intervenciones
    historial: {
      type: [historialSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Evitamos OverwriteModelError si se carga el archivo más de una vez
const Formulario =
  mongoose.models.Formulario ||
  mongoose.model("Formulario", formularioSchema);

module.exports = Formulario;
