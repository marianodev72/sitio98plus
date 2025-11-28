// backend/models/Anexo4.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const historialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    accion: { type: String, required: true },
    observaciones: { type: String },
  },
  { _id: false }
);

const anexo4Schema = new Schema(
  {
    numero: { type: Number, index: true },

    // Permisionario que genera el formulario
    permisionario: {
      usuario: { type: Schema.Types.ObjectId, ref: "User", required: true },
      grado: { type: String },
      nombreCompleto: { type: String },
    },

    // Jefe de Barrio que recibe el formulario
    jefeBarrio: {
      usuario: { type: Schema.Types.ObjectId, ref: "User" },
      grado: { type: String },
      nombreCompleto: { type: String },
      fechaRecepcion: { type: Date },
    },

    // Datos del formulario
    // Nota: unidadHabitacional = barrio, dpto = vivienda, nombreConyuge = datos del representante
    datos: {
      unidadHabitacional: { type: String, required: true }, // Barrio
      dpto: { type: String }, // Vivienda
      nombreConyuge: { type: String }, // Datos del representante
      destinosFamiliares: { type: String },
      observaciones: { type: String },
      fechaSalida: { type: Date },
      fechaRegreso: { type: Date },
    },

    // Estado del trámite
    estado: {
      type: String,
      enum: ["ENVIADO_PERMISIONARIO", "RECIBIDO_JEFE_BARRIO"],
      default: "ENVIADO_PERMISIONARIO",
      index: true,
    },

    historial: [historialSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Anexo4", anexo4Schema);
