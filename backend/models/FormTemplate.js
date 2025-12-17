// backend/models/FormTemplate.js
// Plantilla de formularios y ANEXOS — Sistema ZN98

const mongoose = require("mongoose");
const { Schema } = mongoose;

// Códigos conocidos (ampliado + normalizado)
const FORM_CODES = [
  "ANEXO_01",
  "ANEXO_02",
  "ANEXO_03",
  "ANEXO_04",
  "ANEXO_07",
  "ANEXO_08",
  "ANEXO_09",
  "ANEXO_11",
  "ANEXO_13",
  "FORM_REGISTRO_VISITA",
  "FORM_INSPECCION",
  "FORM_INTERNO",
];

const fieldSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true }, // id interno
    etiqueta: { type: String, required: true, trim: true }, // label visible
    tipo: { type: String, required: true, trim: true }, // text, number, date, select, checkbox, textarea, file, group, table, etc.
    requerido: { type: Boolean, default: false },
    opciones: [
      {
        valor: { type: String, trim: true },
        etiqueta: { type: String, trim: true },
      },
    ],
    ayuda: { type: String, trim: true },
    // ✅ configuración flexible para tablas/sets/validaciones sin romper nada
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const formTemplateSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },
    version: { type: Number, default: 1 },

    campos: [fieldSchema],

    activo: { type: Boolean, default: true, index: true },

    rolesQuePuedenCrear: [{ type: String, trim: true, uppercase: true }],
    rolesQuePuedenVer: [{ type: String, trim: true, uppercase: true }],

    requiereVivienda: { type: Boolean, default: false },
    requiereAlojamiento: { type: Boolean, default: false },

    creadoPor: { type: Schema.Types.ObjectId, ref: "User" },
    ultimaEdicionPor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

formTemplateSchema.index({ code: 1, version: 1 }, { unique: true });

const FormTemplate =
  mongoose.models.FormTemplate || mongoose.model("FormTemplate", formTemplateSchema);

module.exports = {
  FormTemplate,
  FORM_CODES,
};
