import mongoose from "mongoose";

const PedidoTrabajoSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      enum: [
        "BORRADOR",
        "ENVIADO_A_INSPECTOR",
        "EN_PROCESO_INSPECTOR",
        "PENDIENTE_CONSENTIMIENTO_PERMISIONARIO",
        "EN_REVISION_ADMIN_GENERAL",
        "CERRADO",
      ],
      default: "BORRADOR",
    },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // -------------------------------------------------
    //   SECCIÓN PERMISIONARIO
    // -------------------------------------------------
    permisionario: {
      grado: String,
      apellidoNombre: String,
      promotor: {
        type: String,
        enum: ["PERMISIONARIO", "INSPECTOR", "JEFE_MILITAR", "OTROS"],
        default: "PERMISIONARIO",
      },
      solicita: {
        type: String,
        enum: ["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"],
      },
      descripcionPedido: String,
      fechaEnvio: Date,
    },

    historialEstados: [
      {
        estado: String,
        cambiadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fecha: Date,
        comentario: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("PedidoTrabajo", PedidoTrabajoSchema);
