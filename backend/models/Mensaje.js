// models/Mensaje.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Sanitización backend (sin librerías)
 * - Neutraliza XSS persistente guardando HTML escapado.
 * - Mantiene estructura: solo cambia strings.
 */
function escapeHTML(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Subdocumento para adjuntos de los mensajes
 */
const MensajeAdjuntoSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    nombre: { type: String, default: "" },
    mimetype: { type: String, default: "" },
    size: { type: Number, default: 0 },

    // Path relativo controlado (ya validado en controller al descargar)
    path: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Esquema principal de Mensaje
 *
 * IMPORTANTE:
 * - El controller usa "para" (y los endpoints consultan por "para").
 * - Mantenemos "destinatarios" para compatibilidad interna.
 * - Se sincronizan en pre-save.
 */
const MensajeSchema = new Schema({
  remitente: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ✅ Campo usado por el controller y por /mensajes/entrada
  para: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],

  // ✅ Compatibilidad extra (por si alguna parte usa destinatarios)
  destinatarios: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  asunto: {
    type: String,
    default: "",
    trim: true,
  },

  cuerpo: {
    type: String,
    default: "",
    trim: true,
  },

  adjuntos: {
    type: [MensajeAdjuntoSchema],
    default: [],
  },

  leidoPor: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  replyTo: {
    type: Schema.Types.ObjectId,
    ref: "Mensaje",
    default: null,
  },

  threadId: {
    type: Schema.Types.ObjectId,
    ref: "Mensaje",
    default: null,
  },

  creadoEn: {
    type: Date,
    default: Date.now,
  },
});

/**
 * ✅ FIX A3 (XSS almacenado) + ✅ FIX mensajería (para/destinatarios)
 */
MensajeSchema.pre("save", function (next) {
  try {
    // --- Sanitización XSS persistente ---
    if (this.isModified("asunto")) this.asunto = escapeHTML(this.asunto);
    if (this.isModified("cuerpo")) this.cuerpo = escapeHTML(this.cuerpo);

    // --- Compatibilidad para/destinatarios ---
    const hasPara = Array.isArray(this.para) && this.para.length > 0;
    const hasDest = Array.isArray(this.destinatarios) && this.destinatarios.length > 0;

    // Si llega "para" pero no "destinatarios"
    if (hasPara && !hasDest) {
      this.destinatarios = this.para;
    }

    // Si llega "destinatarios" pero no "para"
    if (hasDest && !hasPara) {
      this.para = this.destinatarios;
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

module.exports =
  mongoose.models.Mensaje || mongoose.model("Mensaje", MensajeSchema);