// models/FormTemplate.js
// Plantilla de formularios y ANEXOS — Sistema ZN98

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Códigos de anexos/formularios conocidos.
// Se pueden agregar más sin tocar el modelo.
const FORM_CODES = [
  'ANEXO_1',
  'ANEXO_3',
  'ANEXO_4',
  'ANEXO_7',
  'ANEXO_11',
  'ANEXO_13',
  'FORM_REGISTRO_VISITA',
  'FORM_INSPECCION',
  'FORM_INTERNO',
];

const fieldSchema = new Schema(
  {
    nombre: {
      // nombre interno del campo (ej: "domicilio_actual")
      type: String,
      required: true,
      trim: true,
    },
    etiqueta: {
      // etiqueta visible (ej: "Domicilio actual")
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      // text, number, date, select, checkbox, textarea, etc.
      type: String,
      required: true,
      trim: true,
    },
    requerido: {
      type: Boolean,
      default: false,
    },
    opciones: [
      {
        // para selects / radios
        valor: { type: String, trim: true },
        etiqueta: { type: String, trim: true },
      },
    ],
    ayuda: {
      // texto de ayuda, opcional
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const formTemplateSchema = new Schema(
  {
    // Código interno del formulario / anexo
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Nombre legible (ej: "ANEXO 4 - AUSENCIA PROLONGADA")
    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    descripcion: {
      type: String,
      trim: true,
    },

    // Versión del formulario (por si en el futuro cambia estructura)
    version: {
      type: Number,
      default: 1,
    },

    // Campos que debe mostrar el frontend
    campos: [fieldSchema],

    // ¿Está activo para ser usado?
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Roles que PUEDEN crear/envíar este formulario
    rolesQuePuedenCrear: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],

    // Roles que pueden VER/REVISAR envíos
    rolesQuePuedenVer: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],

    // ¿Requiere vincular a Vivienda / Alojamiento?
    requiereVivienda: {
      type: Boolean,
      default: false,
    },
    requiereAlojamiento: {
      type: Boolean,
      default: false,
    },

    // Metadatos administrativos
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ultimaEdicionPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

formTemplateSchema.index({ code: 1, version: 1 }, { unique: true });

const FormTemplate = mongoose.model('FormTemplate', formTemplateSchema);

module.exports = {
  FormTemplate,
  FORM_CODES,
};
