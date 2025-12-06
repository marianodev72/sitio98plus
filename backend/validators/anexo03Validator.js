// validators/anexo03Validator.js
const { z } = require('zod');

/**
 * ANEXO 03 – Acta de recepción de vivienda
 *
 * Este validador modela:
 * - Datos del permisionario
 * - Datos de la vivienda
 * - Lecturas de medidores
 * - Estado de sistemas (MB/B/R/M)
 * - Novedades
 * - Autorización de descuentos
 * - Adjuntos (ej: fotos de medidores)
 */

const EstadoElementoEnum = z.enum(['MB', 'B', 'R', 'M']);

const TipoAdjuntoAnexo03Enum = z.enum([
  'FOTO_MEDIDOR',
  'OTRO'
]);

const EstadoSistemaItemSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1, 'El nombre del ítem/sistema es obligatorio'),
  estado: EstadoElementoEnum,
  observaciones: z.string().trim().optional()
});

const MedidoresSchema = z.object({
  gas: z.string().trim().optional(),
  agua: z.string().trim().optional(),
  luz: z.string().trim().optional(),
  telefono: z.string().trim().optional()
});

const AdjuntoAnexo03Schema = z.object({
  tipo: TipoAdjuntoAnexo03Enum,
  fileId: z
    .string()
    .trim()
    .min(1, 'fileId es obligatorio para el adjunto')
});

// Metadata completa del ANEXO 03
const Anexo03MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z
      .string()
      .trim()
      .min(1, 'El lugar es obligatorio'),
    fecha: z
      .string()
      .trim()
      .min(1, 'La fecha es obligatoria')
  }),

  datosPermisionario: z.object({
    grado: z
      .string()
      .trim()
      .min(1, 'El grado es obligatorio'),
    apellido: z
      .string()
      .trim()
      .min(1, 'El apellido es obligatorio'),
    nombres: z
      .string()
      .trim()
      .min(1, 'Los nombres son obligatorios'),
    mr: z
      .string()
      .trim()
      .min(1, 'La matrícula (MR) es obligatoria'),
    destinoActual: z
      .string()
      .trim()
      .min(1, 'El destino actual es obligatorio'),
    destinoFuturo: z.string().trim().optional()
  }),

  vivienda: z.object({
    direccion: z
      .string()
      .trim()
      .min(1, 'La dirección de la vivienda es obligatoria'),
    casaDepartamento: z.string().trim().optional(),
    localidad: z
      .string()
      .trim()
      .min(1, 'La localidad es obligatoria')
  }),

  medidores: MedidoresSchema,

  estadoSistemas: z
    .array(EstadoSistemaItemSchema)
    .optional(),

  novedades: z.string().trim().optional(),

  autorizacionDescuentos: z.object({
    autorizaDescuentos: z.boolean(),
    textoAutorizacion: z.string().trim().optional()
  }),

  adjuntos: z.array(AdjuntoAnexo03Schema).optional(),

  observacionesInternas: z.string().trim().optional()
});

// Body completo para crear ANEXO 03
const Anexo03CreateSchema = z.object({
  permisionarioId: z
    .string()
    .trim()
    .min(1, 'permisionarioId es obligatorio'),
  viviendaId: z
    .string()
    .trim()
    .min(1, 'viviendaId es obligatorio'),
  metadata: Anexo03MetadataSchema
});

function validateAnexo03Create(req, res, next) {
  try {
    const parsed = Anexo03CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos de ANEXO 03 inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    console.error('Error en validateAnexo03Create:', err);
    return res
      .status(500)
      .json({ error: 'Error interno en validación de ANEXO 03' });
  }
}

module.exports = {
  validateAnexo03Create,
  Anexo03CreateSchema,
  Anexo03MetadataSchema
};
