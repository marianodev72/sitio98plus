// models/ServicioRegistro.js
// Registro de servicios (luz/gas/agua/otros) importados desde CSV — Sistema ZN98

const mongoose = require('mongoose');
const { Schema } = mongoose;

const TIPOS_SERVICIO = ['LUZ', 'GAS', 'AGUA', 'OTRO'];

const origenCsvSchema = new Schema(
  {
    nombreArchivo: {
      type: String,
      trim: true,
    },
    lineaArchivo: {
      type: Number,
    },
    fechaImportacion: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const servicioRegistroSchema = new Schema(
  {
    // Usuario titular del servicio (permisionario o alojado)
    titular: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tipoTitular: {
      type: String,
      enum: ['PERMISIONARIO', 'ALOJADO'],
      required: true,
      index: true,
    },

    matricula: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    vivienda: {
      type: Schema.Types.ObjectId,
      ref: 'Vivienda',
      index: true,
    },

    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: 'Alojamiento',
      index: true,
    },

    // Tipo de servicio (LUZ / GAS / AGUA / OTRO)
    tipoServicio: {
      type: String,
      enum: TIPOS_SERVICIO,
      required: true,
      index: true,
    },

    // Periodo al que corresponde (ej: "2025-01")
    periodo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Datos relevantes del CSV (pueden variar según proveedor)
    numeroMedidor: {
      type: String,
      trim: true,
    },

    consumo: {
      type: Number, // kWh, m3, etc. (interpretación administrativa)
      min: 0,
    },

    importe: {
      type: Number,
      min: 0,
    },

    fechaVencimiento: {
      type: Date,
    },

    // Guardamos los datos crudos adicionales, si hace falta
    datosExtra: {
      type: Object,
      default: {},
    },

    origenCsv: origenCsvSchema,
  },
  {
    timestamps: true,
  }
);

servicioRegistroSchema.index({ titular: 1, periodo: 1, tipoServicio: 1 });

const ServicioRegistro = mongoose.model(
  'ServicioRegistro',
  servicioRegistroSchema
);

module.exports = {
  ServicioRegistro,
  TIPOS_SERVICIO,
};
