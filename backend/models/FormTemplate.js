// backend/models/FormTemplate.js
// Definición de tipos de formulario (ANEXO 02, 08, 11, etc.)

const mongoose = require("mongoose");

const formTemplateSchema = new mongoose.Schema(
  {
    // Código único: ANEXO_11_PERMISIONARIO, ANEXO_02_PERMISIONARIO, etc.
    codigo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    nombre: { type: String, required: true },
    descripcion: { type: String },

    // Número de anexo (2, 8, 11, etc.)
    numero: { type: Number },

    // Roles que pueden iniciar este formulario
    rolesQuePuedenIniciar: {
      type: [String],
      default: [],
    },

    // Roles que pueden intervenir / cambiar estado
    rolesQuePuedenIntervenir: {
      type: [String],
      default: [],
    },

    // Si este formulario está activo en el sistema
    activo: {
      type: Boolean,
      default: true,
    },

    // Flags de relación
    requiereVivienda: { type: Boolean, default: false },
    requiereAlojamiento: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const FormTemplate =
  mongoose.models.FormTemplate ||
  mongoose.model("FormTemplate", formTemplateSchema);

module.exports = FormTemplate;
