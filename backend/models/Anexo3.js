// backend/models/Anexo3.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const estadoSistemaEnum = ["MB", "B", "R", "M", ""];

const historialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    accion: { type: String, required: true }, // CREADO_INSPECTOR, CONFORME_PERMISIONARIO, etc.
    observaciones: { type: String },
  },
  { _id: false }
);

const anexo3Schema = new Schema(
  {
    numero: {
      type: Number,
      index: true,
    },

    // Relación con permisionario (titular de la vivienda)
    permisionario: {
      usuario: { type: Schema.Types.ObjectId, ref: "User", required: true },
      grado: { type: String },
      nombreCompleto: { type: String },
    },

    // Inspector que realiza el acta
    inspector: {
      usuario: { type: Schema.Types.ObjectId, ref: "User", required: true },
      grado: { type: String },
      nombreCompleto: { type: String },
    },

    // Admin que cierra el trámite
    administradorCierre: {
      usuario: { type: Schema.Types.ObjectId, ref: "User" },
      grado: { type: String },
      nombreCompleto: { type: String },
      fechaCierre: { type: Date },
    },

    // Datos de la vivienda
    vivienda: {
      unidadHabitacional: { type: String, required: true },
      direccion: { type: String },
      localidad: { type: String },
      provincia: { type: String },
    },

    // Material entregado
    material: {
      llavesEdificio: { type: Boolean, default: false },
      llavesVivienda: { type: Boolean, default: false },
      llavesBaulera: { type: Boolean, default: false },
      llaveTerraza: { type: Boolean, default: false },
      llaveCochera: { type: Boolean, default: false },
      mueblesSegunInventario: { type: Boolean, default: false },
      lineaTelefonicaFuncionando: { type: Boolean, default: false },
    },

    // Documentación entregada
    documentacion: {
      reglamentoViviendasFiscales: { type: Boolean, default: false },
      guiaTelefonica: { type: Boolean, default: false },
      reglamentoCopropiedad: { type: Boolean, default: false },
    },

    // Lectura de medidores
    medidores: {
      gasM3: { type: String },
      aguaM3: { type: String },
      luzKwh: { type: String },
      telefonoPulsos: { type: String },
    },

    // Estado de sistemas (MB / B / R / M / "")
    estadoSistemas: {
      agua: { type: String, enum: estadoSistemaEnum, default: "" },
      cloacas: { type: String, enum: estadoSistemaEnum, default: "" },
      electricidad: { type: String, enum: estadoSistemaEnum, default: "" },
      gas: { type: String, enum: estadoSistemaEnum, default: "" },
      pluviales: { type: String, enum: estadoSistemaEnum, default: "" },
      telefono: { type: String, enum: estadoSistemaEnum, default: "" },
      aberturas: { type: String, enum: estadoSistemaEnum, default: "" },
      albaniileria: { type: String, enum: estadoSistemaEnum, default: "" },
      alfombras: { type: String, enum: estadoSistemaEnum, default: "" },
      antenaTv: { type: String, enum: estadoSistemaEnum, default: "" },
      calefactorEstufa: { type: String, enum: estadoSistemaEnum, default: "" },
      calefonTermotanque: {
        type: String,
        enum: estadoSistemaEnum,
        default: "",
      },
      carpinteria: { type: String, enum: estadoSistemaEnum, default: "" },
      cerrajeria: { type: String, enum: estadoSistemaEnum, default: "" },
      cocina: { type: String, enum: estadoSistemaEnum, default: "" },
      desinfeccion: { type: String, enum: estadoSistemaEnum, default: "" },
      herrajes: { type: String, enum: estadoSistemaEnum, default: "" },
      limpieza: { type: String, enum: estadoSistemaEnum, default: "" },
      lustrado: { type: String, enum: estadoSistemaEnum, default: "" },
      parquesJardines: { type: String, enum: estadoSistemaEnum, default: "" },
      pintura: { type: String, enum: estadoSistemaEnum, default: "" },
      pisos: { type: String, enum: estadoSistemaEnum, default: "" },
      porteroElectrico: { type: String, enum: estadoSistemaEnum, default: "" },
      sanitarios: { type: String, enum: estadoSistemaEnum, default: "" },
      vidrios: { type: String, enum: estadoSistemaEnum, default: "" },
      estadoGeneral: { type: String, enum: estadoSistemaEnum, default: "" },
    },

    // Novedades / observaciones
    novedades: {
      type: String,
    },

    // Estados del flujo
    // Inspector crea: PENDIENTE_CONFORME_PERMISIONARIO
    // Permisionario conforme: PENDIENTE_CIERRE_ADMIN
    // Permisionario no conforme: EN_REVISION_INSPECTOR
    // Inspector reenvía: PENDIENTE_CONFORME_PERMISIONARIO
    // Admin cierra: CERRADO
    estado: {
      type: String,
      enum: [
        "PENDIENTE_CONFORME_PERMISIONARIO",
        "CONFORME_PERMISIONARIO",
        "EN_REVISION_INSPECTOR",
        "PENDIENTE_CIERRE_ADMIN",
        "CERRADO",
      ],
      default: "PENDIENTE_CONFORME_PERMISIONARIO",
      index: true,
    },

    historial: [historialSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Anexo3", anexo3Schema);
