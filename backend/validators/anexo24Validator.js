// validators/anexo24Validator.js
const { z } = require('zod');

/**
 * ANEXO 24 – Ampliación de novedades del Acta de Recepción de Alojamiento
 * Es el equivalente al ANEXO 07 pero para ALOJAMIENTO NAVAL.
 */

const DatosHuespedSchema = z.object({
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

const Anexo24MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1, 'El lugar es obligatorio'),
    fecha: z.string().trim().min(1, 'La fecha es obligatoria'),
  }),

  huesped: DatosHuespedSchema,
  alojamiento: AlojamientoSchema,
  inspector: InspectorSchema,

  novedadesAdicionales: z
    .string()
    .trim()
    .min(1, 'Debe registrar las novedades adicionales'),
  observaciones: z.string().trim().optional(),
});

const Anexo24CreateSchema = z.object({
  huespedId: z.string().trim().min(1, 'huespedId es obligatorio'),
  alojamientoId: z.string().trim().min(1, 'alojamientoId es obligatorio'),
  metadata: Anexo24MetadataSchema,
});

function validateAnexo24Create(req, res, next) {
  try {
    const parsed = Anexo24CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    return res.status(400).json({
      error: 'Datos inválidos para ANEXO 24',
      detalles: err.errors || err.issues,
    });
  }
}

module.exports = {
  validateAnexo24Create,
  Anexo24MetadataSchema,
  Anexo24CreateSchema,
};
