// validators/anexo25Validator.js
const { z } = require('zod');

/**
 * ANEXO 25 – Acta de Inspección Previa (Alojamiento Naval)
 * Equivalente al ANEXO 08 de vivienda, pero aplicado a alojamiento.
 */

const HuespedSchema = z.object({
  grado: z.string().trim().min(1, 'El grado del huésped es obligatorio'),
  apellido: z.string().trim().min(1, 'El apellido del huésped es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres del huésped son obligatorios'),
  mr: z.string().trim().min(1, 'La matrícula MR es obligatoria'),
  destino: z.string().trim().optional(),
});

const AlojamientoSchema = z.object({
  alojamientoId: z.string().trim().min(1, 'alojamientoId es obligatorio'),
  predio: z.string().trim().optional(),
  edificio: z.string().trim().optional(),
  codigo: z.string().trim().min(1, 'El código de alojamiento es obligatorio'),
  localidad: z.string().trim().min(1, 'La localidad es obligatoria'),
});

const InspectorSchema = z.object({
  apellido: z.string().trim().min(1, 'El apellido del inspector es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres del inspector son obligatorios'),
  grado: z.string().trim().optional(),
});

const ReparacionSchema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción de la reparación es obligatoria'),
  urgente: z.boolean().optional(),
});

const RepresentanteSchema = z.object({
  apellido: z.string().trim().optional(),
  nombres: z.string().trim().optional(),
  dni: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  vinculo: z.string().trim().optional(), // vecino, familiar, etc.
});

const Anexo25MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1, 'El lugar es obligatorio'),
    fecha: z.string().trim().min(1, 'La fecha es obligatoria'),
  }),

  huesped: HuespedSchema,
  alojamiento: AlojamientoSchema,
  inspector: InspectorSchema,

  reparacionesAlcaldia: z.array(ReparacionSchema).optional(),
  reparacionesHuesped: z.array(ReparacionSchema).optional(),

  representantesEnAusencia: z.array(RepresentanteSchema).optional(),

  observaciones: z.string().trim().optional(),
});

const Anexo25CreateSchema = z.object({
  huespedId: z.string().trim().min(1, 'huespedId es obligatorio'),
  alojamientoId: z.string().trim().min(1, 'alojamientoId es obligatorio'),
  metadata: Anexo25MetadataSchema,
});

function validateAnexo25Create(req, res, next) {
  try {
    const parsed = Anexo25CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    return res.status(400).json({
      error: 'Datos inválidos para ANEXO 25',
      detalles: err.errors || err.issues,
    });
  }
}

module.exports = {
  validateAnexo25Create,
  Anexo25MetadataSchema,
  Anexo25CreateSchema,
};
