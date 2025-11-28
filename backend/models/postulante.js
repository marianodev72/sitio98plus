// models/PrePostulante.js
// Pre-registro de postulantes (antes de crear la cuenta real)

const mongoose = require("mongoose");

const prePostulanteSchema = new mongoose.Schema(
  {
    apellido: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },

    matricula: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    grado: { type: String, required: true, trim: true },

    dni: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Código enviado por mail
    codigoVerificacion: {
      type: String,
      required: true,
    },

    // Fecha/hora de expiración del código
    // TTL: cuando se cumple esta fecha, MongoDB eliminará el documento.
    codigoExpira: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL: expira exactamente en codigoExpira
    },

    // Si el código ya fue verificado
    verificado: {
      type: Boolean,
      default: false,
    },

    // Cantidad de intentos fallidos de verificación de código
    intentos: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PrePostulante", prePostulanteSchema);
