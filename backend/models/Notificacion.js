const mongoose = require("mongoose");
const { Schema } = mongoose;

const PRIORIDADES = Object.freeze(["INFO", "IMPORTANTE", "CRITICA"]);

const NotificacionSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    mensaje: { type: String, required: true, trim: true, maxlength: 800 },
    accionTexto: { type: String, default: "", trim: true, maxlength: 80 },
    accionUrl: { type: String, default: "", trim: true, maxlength: 240 },

    tipo: { type: String, required: true, trim: true, maxlength: 80 },
    prioridad: { type: String, enum: PRIORIDADES, default: "INFO", index: true },

    entidadTipo: { type: String, default: "", trim: true, maxlength: 80 },
    entidadId: { type: Schema.Types.ObjectId, default: null },

    leida: { type: Boolean, default: false, index: true },
    leidaAt: { type: Date, default: null },
    confirmada: { type: Boolean, default: false, index: true },
    confirmadaAt: { type: Date, default: null },
    requiereConfirmacion: { type: Boolean, default: false, index: true },

    creadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    metadataSegura: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

NotificacionSchema.index({ usuario: 1, leida: 1, prioridad: 1, createdAt: -1 });
NotificacionSchema.index({ usuario: 1, confirmada: 1, requiereConfirmacion: 1 });
NotificacionSchema.index({ entidadTipo: 1, entidadId: 1, tipo: 1, usuario: 1 });

const Notificacion =
  mongoose.models.Notificacion || mongoose.model("Notificacion", NotificacionSchema);

module.exports = { Notificacion, PRIORIDADES };
