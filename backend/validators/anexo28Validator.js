// validators/anexo28Validator.js
const { z } = require('zod');

/**
 * ANEXO 28 – Pedido de Trabajo para Alojamiento Naval
 * Versión “alojamiento” del ANEXO 11.
 */

const HuespedSchema = z.object({
  grado: z.string().trim().min(1, 'Grado obligatorio'),
  apellido: z.string().trim().min(1, 'Apellido obligatorio'),
  nombres: z.string().trim().min(1, 'Nombres obligatorios'),
  mr: z.string().trim().min(1, 'MR obligatorio'),
});

const AlojamientoSchema = z.object({
  alojamientoId: z.string().trim().min(1, 'alojamientoId obligatorio'),
  predio: z.string().trim().optional(),
  edificio: z.string().trim().optional(),
  codigo: z.string().trim().min(1, 'Código de alojamiento obligatorio'),
  localidad: z.string().trim().min(1, 'Localidad obligatoria'),
});

const PromotorSchema = z.object({
  tipo: z.enum(['HUESPED', 'INSPECTOR', 'JEFE_MILITAR', 'OTROS']),
  grado: z.string().trim().optional(),
  apellido: z.string().trim().optional(),
  nombres: z.string().trim().optional(),
});

const PedidoTrabajoSchema = z.object({
  tipoPedido: z.enum(['CAMBIO', 'REPARACION', 'VERIFICACION', 'PROVISION']),
  emergencia: z.boolean(),
  correspondeHuesped: z.boolean(),
  novedadesActaAnterior: z.boolean(),
});

const DescripcionTrabajoSchema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción del trabajo es obligatoria'),
});

const InformeTecnicoSchema = z.object({
  tareaRealizar: z.string().trim().optional(),
  empresasConsultadas: z.string().trim().optional(),
  horasHombre: z.string().trim().optional(),
  dias: z.string().trim().optional(),
  materiales: z.string().trim().optional(),
  manoObra: z.string().trim().optional(),
  precioTotal: z.string().trim().optional(),
});

const AutorizacionSchema = z.object({
  modalidad: z
    .enum(['PERSONAL_PROPIO', 'EMPRESA_PRIVADA'])
    .optional(),
  procedimiento: z
    .enum(['COMPULSA', 'CONTRATACION_DIRECTA'])
    .optional(),
  adjudicarA: z.string().trim().optional(),
  motivo: z.string().trim().optional(),
  garantia: z.string().trim().optional(),
});

const VerificacionSchema = z.object({
  textoInspector: z.string().trim().optional(),
  textoHuesped: z.string().trim().optional(),
});

const Anexo28MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1, 'Lugar obligatorio'),
    fecha: z.string().trim().min(1, 'Fecha obligatoria'),
  }),

  huesped: HuespedSchema,
  alojamiento: AlojamientoSchema,
  promotor: PromotorSchema,

  pedido: PedidoTrabajoSchema,
  descripcionTrabajo: DescripcionTrabajoSchema,

  informeTecnico: InformeTecnicoSchema.optional(),
  autorizacion: AutorizacionSchema.optional(),
  verificacion: VerificacionSchema.optional(),

  observaciones: z.string().trim().optional(),
});

const Anexo28CreateSchema = z.object({
  huespedId: z.string().trim().min(1, 'huespedId obligatorio'),
  alojamientoId: z.string().trim().min(1, 'alojamientoId obligatorio'),
  metadata: Anexo28MetadataSchema,
});

function validateAnexo28Create(req, res, next) {
  try {
    const parsed = Anexo28CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    return res.status(400).json({
      error: 'Datos inválidos para ANEXO 28',
      detalles: err.errors || err.issues,
    });
  }
}

module.exports = {
  validateAnexo28Create,
  Anexo28MetadataSchema,
  Anexo28CreateSchema,
};
