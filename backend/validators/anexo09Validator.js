// validators/anexo09Validator.js
const { z } = require('zod');

/**
 * ANEXO 09 – Acta de entrega de vivienda
 * Campos extraídos del formulario físico.
 */

const EstadoElementoEnum = z.enum(['MB', 'B', 'R', 'M']);

const EstadoSistemaItemSchema = z.object({
  item: z.string().trim().min(1),
  estado: EstadoElementoEnum,
  observaciones: z.string().trim().optional(),
});

const ChecklistItemSchema = z.object({
  nombre: z.string().trim().min(1),
  entregado: z.boolean(),
});

const MedidoresSchema = z.object({
  gas: z.string().trim().optional(),
  agua: z.string().trim().optional(),
  luz: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const DatosPermisionarioSchema = z.object({
  grado: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
  mr: z.string().trim().min(1),
  destino: z.string().trim().optional(),
});

const UnidadHabitacionalSchema = z.object({
  direccion: z.string().trim().min(1),
  localidad: z.string().trim().min(1),
  provincia: z.string().trim().optional(),
  casaDepartamento: z.string().trim().optional(),
});

const InspectorSchema = z.object({
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
  grado: z.string().trim().optional(),
});

const RepresentanteSchema = z.object({
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
  grado: z.string().trim().optional(),
  mr: z.string().trim().optional(),
  destino: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const Anexo09MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1),
    fecha: z.string().trim().min(1),
  }),

  datosPermisionario: DatosPermisionarioSchema,

  unidadHabitacional: UnidadHabitacionalSchema,

  inspector: InspectorSchema,

  checklistMaterial: z.array(ChecklistItemSchema).optional(),

  checklistDocumentacion: z.array(ChecklistItemSchema).optional(),

  medidores: MedidoresSchema,

  estadoSistemas: z.array(EstadoSistemaItemSchema).optional(),

  novedades: z.string().trim().optional(),

  representanteEntrega: RepresentanteSchema.optional(),
});

const Anexo09CreateSchema = z.object({
  permisionarioId: z.string().trim().min(1),
  viviendaId: z.string().trim().min(1),
  metadata: Anexo09MetadataSchema,
});

function validateAnexo09Create(req, res, next) {
  try {
    const parsed = Anexo09CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos para ANEXO 09',
        detalles: err.issues,
      });
    }
    console.error('Error validando ANEXO 09:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateAnexo09Create,
  Anexo09MetadataSchema,
  Anexo09CreateSchema,
};
