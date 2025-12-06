// models/Liquidacion.js
// Modelo de liquidaciones para usuarios (permisionarios/alojados) — Sistema ZN98

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ESTADOS_LIQUIDACION = [
  'PENDIENTE',  // emitida, sin pagar
  'PARCIAL',    // tiene pagos, pero no cubre el total
  'PAGADA',     // total cubierto
  'VENCIDA',    // pasó la fecha de vencimiento sin pago suficiente
];

const TIPO_TITULAR = ['PERMISIONARIO', 'ALOJADO'];

const cargoSchema = new Schema(
  {
    concepto: {
      type: String,
      required: true,
      trim: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pagoSchema = new Schema(
  {
    fechaPago: {
      type: Date,
      required: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
    medioPago: {
      type: String,
      trim: true, // ej: "EFECTIVO", "TRANSFERENCIA", "DESCUENTO_HABERES"
    },
    observacion: {
      type: String,
      trim: true,
    },
    registradoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User', // ADMIN / ADMIN_GENERAL
    },
  },
  { _id: false }
);

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

const liquidacionSchema = new Schema(
  {
    // Usuario titular de la liquidación (permisionario o alojado)
    titular: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Tipo de titular (semántica administrativa)
    tipoTitular: {
      type: String,
      enum: TIPO_TITULAR,
      required: true,
      index: true,
    },

    // Matrícula (para trazabilidad y para vincular fácilmente con CSV)
    matricula: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Vivienda asociada (si aplica)
    vivienda: {
      type: Schema.Types.ObjectId,
      ref: 'Vivienda',
      index: true,
    },

    // Alojamiento asociado (si aplica)
    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: 'Alojamiento',
      index: true,
    },

    // Periodo de la liquidación (ej: "2025-01")
    periodo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Fecha de emisión
    fechaEmision: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Fecha de vencimiento
    fechaVencimiento: {
      type: Date,
    },

    // Lista de cargos (alquiler, servicios, otros)
    cargos: [cargoSchema],

    // Pagos aplicados a esta liquidación
    pagos: [pagoSchema],

    // Montos calculados
    montoTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    montoPagado: {
      type: Number,
      default: 0,
      min: 0,
    },

    saldoPendiente: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Estado administrativo
    estado: {
      type: String,
      enum: ESTADOS_LIQUIDACION,
      default: 'PENDIENTE',
      index: true,
    },

    // Número o código interno de liquidación (para PDF, referencia administrativa)
    numeroLiquidacion: {
      type: String,
      trim: true,
      index: true,
    },

    // Datos del CSV del que provino (si aplica)
    origenCsv: origenCsvSchema,

    // Observaciones internas (solo administración / admin general)
    observacionesInternas: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

liquidacionSchema.index(
  { titular: 1, periodo: 1 },
  { unique: false }
);
liquidacionSchema.index(
  { matricula: 1, periodo: 1 },
  { unique: false }
);

/**
 * Recalcula montoPagado, saldoPendiente y estado
 * a partir de cargos y pagos.
 */
liquidacionSchema.methods.recalcularEstado = function () {
  const totalCargos = (this.cargos || []).reduce(
    (sum, c) => sum + (c.monto || 0),
    0
  );
  const totalPagos = (this.pagos || []).reduce(
    (sum, p) => sum + (p.monto || 0),
    0
  );

  this.montoTotal = totalCargos;
  this.montoPagado = totalPagos;
  this.saldoPendiente = Math.max(totalCargos - totalPagos, 0);

  if (this.saldoPendiente <= 0 && totalCargos > 0) {
    this.estado = 'PAGADA';
  } else if (this.saldoPendiente > 0 && totalPagos > 0) {
    this.estado = 'PARCIAL';
  } else {
    this.estado = 'PENDIENTE';
  }

  // Si está pendiente/parcial y ya pasó la fecha de vencimiento, marcar VENCIDA
  if (
    this.fechaVencimiento &&
    this.saldoPendiente > 0 &&
    new Date() > this.fechaVencimiento
  ) {
    this.estado = 'VENCIDA';
  }
};

const Liquidacion = mongoose.model('Liquidacion', liquidacionSchema);

module.exports = {
  Liquidacion,
  ESTADOS_LIQUIDACION,
  TIPO_TITULAR,
};
