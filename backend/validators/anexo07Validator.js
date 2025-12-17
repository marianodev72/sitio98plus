// validators/anexo07Validator.js
const { z } = require('zod');

/**
 * ANEXO 07 – Planilla de Ampliación de Novedades
 * Campos extraídos directamente del formulario físico.
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
});

const InspectorSchema = z.object({
  apellido: z.string().trim().min(1, 'El apellido del inspector es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres del inspector son obligatorios'),
  grado: z.string().trim().optional(),
});

const Anexo07MetadataSchema = z.object({
  encabezado: EncabezadoSchema,
  datosPermisionario: DatosPermisionarioSchema,
  unidadHabitacional: UnidadHabitacionalSchema,
  inspector: InspectorSchema,
  novedadesAdicionales: z.string().trim().min(1, 'Debe cargar las novedades adicionales'),
  observaciones: z.string().trim().optional(),
});

const Anexo07CreateSchema = z.object({
  permisionarioId: z.string().trim().min(1, 'permisionarioId es obligatorio'),
  viviendaId: z.string().trim().min(1, 'viviendaId es obligatorio'),
  metadata: Anexo07MetadataSchema,
});

function validateAnexo07Create(req, res, next) {
  try {
    const parsed = Anexo07CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos para ANEXO 07',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    }
    console.error('Error validando ANEXO 07:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateAnexo07Create,
  Anexo07CreateSchema,
  Anexo07MetadataSchema,
};
