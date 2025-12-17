// validators/anexo26Validator.js
const { z } = require('zod');

/**
 * ANEXO 26 – Acta de Entrega de Alojamiento Naval
 * Documento institucional con impacto en ocupación.
 */

const EstadoElementoEnum = z.enum(['MB', 'B', 'R', 'M']);

const EstadoSistemaSchema = z.object({
  item: z.string().trim().min(1),
  estado: EstadoElementoEnum,
  observaciones: z.string().trim().optional(),
});

const MaterialEntregadoSchema = z.object({
  nombre: z.string().trim().min(1),
  entregado: z.boolean(),
});

const MedidoresSchema = z.object({
  gas: z.string().trim().optional(),
  agua: z.string().trim().optional(),
  luz: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const DatosHuespedSchema = z.object({
  grado: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
  mr: z.string().trim().min(1),
  destino: z.string().trim().optional(),
});

const AlojamientoSchema = z.object({
  alojamientoId: z.string().trim().min(1),
  predio: z.string().trim().optional(),
  edificio: z.string().trim().optional(),
  codigo: z.string().trim().min(1),
  localidad: z.string().trim().min(1),
});

const InspectorSchema = z.object({
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
  grado: z.string().trim().optional(),
});

const RepresentanteSchema = z.object({
  apellido: z.string().trim().optional(),
  nombres: z.string().trim().optional(),
  grado: z.string().trim().optional(),
  mr: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const Anexo26MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1),
    fecha: z.string().trim().min(1),
  }),

  huesped: DatosHuespedSchema,
  alojamiento: AlojamientoSchema,
  inspector: InspectorSchema,

  materialEntregado: z.array(MaterialEntregadoSchema).optional(),
  estadoSistemas: z.array(EstadoSistemaSchema).optional(),
  medidores: MedidoresSchema.optional(),
  novedades: z.string().trim().optional(),

  representanteEntrega: RepresentanteSchema.optional(),
});

const Anexo26CreateSchema = z.object({
  huespedId: z.string().trim().min(1),
  alojamientoId: z.string().trim().min(1),
  metadata: Anexo26MetadataSchema,
});

function validateAnexo26Create(req, res, next) {
  try {
    req.validatedBody = Anexo26CreateSchema.parse(req.body);
    return next();
  } catch (err) {
    return res.status(400).json({
      error: 'Datos inválidos para ANEXO 26',
      detalles: err.issues,
    });
  }
}

module.exports = {
  validateAnexo26Create,
  Anexo26MetadataSchema,
  Anexo26CreateSchema,
};
