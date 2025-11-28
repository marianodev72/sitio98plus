// backend/models/permisionarioModel.js

const mongoose = require("mongoose");

// Subdocumento para grupo familiar
const GrupoFamiliarSchema = new mongoose.Schema(
  {
    nombreCompleto: { type: String },
    relacion: { type: String },
    aCargo: { type: String }, // "SI" / "NO"
    edad: { type: Number },
    dni: { type: String },
    diba: { type: String },
  },
  { _id: false }
);

// Subdocumento para animales
const AnimalSchema = new mongoose.Schema(
  {
    especie: { type: String },
    raza: { type: String },
    edad: { type: Number },
    sexo: { type: String },
    pesoKg: { type: Number },
  },
  { _id: false }
);

const PermisionarioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Datos básicos de identidad (pueden venir del usuario o del Anexo)
  nombreCompleto: { type: String },
  dni: { type: String },
  cuit: { type: String },

  // Contacto
  telefono: { type: String },
  email: { type: String },
  domicilio: { type: String },

  // Destino y carrera
  destinoActual: { type: String },
  grado: { type: String },
  fechaUltimoAscenso: { type: Date },

  // Grupo familiar durante la ocupación
  grupoFamiliar: {
    type: [GrupoFamiliarSchema],
    default: [],
  },

  // Animales durante la ocupación
  animales: {
    type: [AnimalSchema],
    default: [],
  },

  // 🔹 Datos de servicios de la vivienda (llenados por CSV)
  casaNumero: { type: String },     // ej: "123" o "B-15"
  servicioLuz: { type: String },    // N° de contrato / cliente luz
  servicioAgua: { type: String },   // N° cuenta agua
  servicioGas: { type: String },    // N° cuenta gas

  fechaAlta: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Permisionario", PermisionarioSchema);
