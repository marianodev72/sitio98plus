const mongoose = require("mongoose");
const { Schema } = mongoose;

const TIPOS_IMPORTACION = ["PERSONAL", "VIVIENDAS"];
const ESTADOS_IMPORTACION = ["PENDIENTE_CONFIRMACION", "CANCELADO"];

const masterImportJobSchema = new Schema(
  {
    tipo: {
      type: String,
      required: true,
      enum: TIPOS_IMPORTACION,
      uppercase: true,
      trim: true,
      index: true,
    },
    estado: {
      type: String,
      required: true,
      enum: ESTADOS_IMPORTACION,
      default: "PENDIENTE_CONFIRMACION",
      uppercase: true,
      trim: true,
      index: true,
    },
    archivoOriginalNombre: { type: String, default: "", trim: true, maxlength: 255 },
    archivoSha256: { type: String, required: true, trim: true, lowercase: true },
    mime: { type: String, default: "", trim: true, maxlength: 160 },
    size: { type: Number, default: 0, min: 0 },
    creadoPor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dryRunSummary: { type: Schema.Types.Mixed, default: {} },
    warnings: { type: [Schema.Types.Mixed], default: [] },
    errors: { type: [Schema.Types.Mixed], default: [] },
    diff: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false, suppressReservedKeysWarning: true }
);

masterImportJobSchema.index({ tipo: 1, estado: 1, createdAt: -1 });
masterImportJobSchema.index({ creadoPor: 1, createdAt: -1 });
masterImportJobSchema.index({ archivoSha256: 1, tipo: 1 });

const MasterImportJob =
  mongoose.models.MasterImportJob || mongoose.model("MasterImportJob", masterImportJobSchema);

module.exports = {
  MasterImportJob,
  TIPOS_IMPORTACION,
  ESTADOS_IMPORTACION,
};
