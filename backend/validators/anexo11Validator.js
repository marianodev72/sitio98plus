// validators/anexo11Validator.js
const { z } = require('zod');

const PermisionarioSchema = z.object({
  grado: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  nombres: z.string().trim().min(1),
});

const UnidadSchema = z.object({
  tipo: z.enum(['DPTO', 'MB', 'MZ', 'CASA', 'OTRO']),
  numero: z.string().trim().optional(),
});

const PromotorSchema = z.object({
  tipo: z.enum(['PERMISIONARIO', 'INSPECTOR', 'JEFE_MILITAR', 'OTROS']),
  grado: z.string().trim().optional(),
  apellido: z.string().trim().optional(),
  nombres: z.string().trim().optional(),
});

const PedidoTrabajoSchema = z.object({
  tipoPedido: z.enum(['CAMBIO', 'REPARACION', 'VERIFICACION', 'PROVISION']),
  emergencia: z.boolean(),
  correspondePermisionario: z.boolean(),
  novedadesActaAnterior: z.boolean(),
});

const DescripcionTrabajoSchema = z.object({
  descripcion: z.string().trim().min(1, 'La descripción del trabajo es obligatoria'),
});

const InformeEmpresaSchema = z.object({
  tareaRealizar: z.string().trim().optional(),
  empresasConsultadas: z.string().trim().optional(),
  horasHombre: z.string().trim().optional(),
  dias: z.string().trim().optional(),
  materiales: z.string().trim().optional(),
  manoObra: z.string().trim().optional(),
  precioTotal: z.string().trim().optional(),
});

const AutorizacionSchema = z.object({
  modalidad: z.enum(['PERSONAL_PROPIO', 'EMPRESA_PRIVADA']).optional(),
  procedimiento: z.enum(['COMPULSA', 'CONTRATACION_DIRECTA']).optional(),
  adjudicarA: z.string().trim().optional(),
  motivo: z.string().trim().optional(),
  garantia: z.string().trim().optional(),
});

const VerificacionSchema = z.object({
  textoInspector: z.string().trim().optional(),
  textoPermisionario: z.string().trim().optional(),
});

const Anexo11MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z.string().trim().min(1),
    fecha: z.string().trim().min(1),
  }),

  unidad: UnidadSchema,
  permisionario: PermisionarioSchema,
  promotor: PromotorSchema,

  pedido: PedidoTrabajoSchema,
  descripcionTrabajo: DescripcionTrabajoSchema,

  informeTecnico: InformeEmpresaSchema.optional(),
  autorizacion: AutorizacionSchema.optional(),
  verificacion: VerificacionSchema.optional(),
  observaciones: z.string().trim().optional(),
});

const Anexo11CreateSchema = z.object({
  permisionarioId: z.string().trim().min(1),
  viviendaId: z.string().trim().min(1),
  metadata: Anexo11MetadataSchema,
});

function validateAnexo11Create(req, res, next) {
  try {
    const parsed = Anexo11CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos para ANEXO 11',
        detalles: err.issues,
      });
    }
    console.error('Error validando ANEXO 11:', err);
    return res.status(500).json({
      error: 'Error interno en validación de ANEXO 11',
    });
  }
}

module.exports = {
  validateAnexo11Create,
  Anexo11MetadataSchema,
  Anexo11CreateSchema,
};
