// backend/models/MisDatosDeclaradosUpdate.js
const mongoose = require("mongoose");

const MisDatosDeclaradosUpdateSchema = new mongoose.Schema(
  {
    // quién hizo la actualización
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // desde qué base se tomó (último ANEXO_01 aprobado o el último disponible)
    baseAnexoId: { type: mongoose.Schema.Types.ObjectId, ref: "FormSubmission" },

    // snapshot de lo que se tomó como base (para auditoría)
    baseDatos: { type: Object, default: {} },

    // datos actualizados (lo que el permisionario declara ahora)
    datosActualizados: { type: Object, default: {} },

    // motivo opcional
    motivo: { type: String, default: "" },

    // resumen breve para tabla de historial
    resumen: { type: String, default: "" },

    // estado institucional simple (si querés aprobar luego, etc.)
    estado: { type: String, default: "REGISTRADO" },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "MisDatosDeclaradosUpdate",
  MisDatosDeclaradosUpdateSchema
);
