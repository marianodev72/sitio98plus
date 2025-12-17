// validators/anexo08Validator.js
const { z } = require('zod');

/**
 * ANEXO 08 – Acta de inspección previa
 *
 * Campos:
 * - Permisionario
 * - Unidad habitacional (dirección, localidad, provincia)
 * - Inspector
 * - Reparaciones/mantenimientos a cargo de la alcaldía
 * - Reparaciones a cargo del permisionario
 * - Representantes en caso de no estar presente
 * - Observaciones
 */

const EncabezadoSchema = z.object({
  lugar: z.string().trim().min(1, 'El lugar es obligatorio'),
  fecha: z.string().trim().min(1, 'La fecha es obligatoria'),
});

const DatosPermisionarioSchema = z.object({
  grado: z.string().trim().min(1, 'El grado es obligatorio'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios'),
  mr: z.string().trim().min(1, 'La matrícula MR es obligatoria'),
});

const UnidadHabitacionalSchema = z.object({
  direccion: z.string().trim().min(1, 'La dirección es obligatoria'),
  localidad: z.string().trim().min(1, 'La localidad es obligatoria'),
  provincia: z.string().trim().optional(),
  codigoVivienda: z.string().trim().optional(), // ej: K01, etc.
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
  urgente: z.boolean().optional(), // opcional, por si querés marcar algo urgente
});

const RepresentanteSchema = z.object({
  apellido: z.string().trim().min(1, 'El apellido del representante es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres del representante son obligatorios'),
  dni: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  vinculo: z.string().trim().optional(), // vecino, familiar, etc.
});

const Anexo08MetadataSchema = z.object({
  encabezado: EncabezadoSchema,
  datosPermisionario: DatosPermisionarioSchema,
  unidadHabitacional: UnidadHabitacionalSchema,
  inspector: InspectorSchema,
  reparacionesAlcaldia: z.array(ReparacionSchema).optional(),
  reparacionesPermisionario: z.array(ReparacionSchema).optional(),
  representantesEnAusencia: z.array(RepresentanteSchema).optional(),
  observaciones: z.string().trim().optional(),
});

const Anexo08CreateSchema = z.object({
  permisionarioId: z.string().trim().min(1, 'permisionarioId es obligatorio'),
  viviendaId: z.string().trim().min(1, 'viviendaId es obligatorio'),
  metadata: Anexo08MetadataSchema,
});

function validateAnexo08Create(req, res, next) {
  try {
    const parsed = Anexo08CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos para ANEXO 08',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    }
    console.error('Error validando ANEXO 08:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateAnexo08Create,
  Anexo08CreateSchema,
  Anexo08MetadataSchema,
};
