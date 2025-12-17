// validators/anexo21Validator.js
const { z } = require('zod');

/**
 * ANEXO 21 – Inscripción para Alojamiento Naval
 */

const RepresentanteSchema = z.object({
  apellidoNombres: z.string().trim().min(1, 'Nombre del representante obligatorio'),
  mr: z.string().trim().optional(),
  grado: z.string().trim().optional(),
  destino: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
});

const EncabezadoSchema = z.object({
  lugar: z.string().trim().min(1, 'Lugar obligatorio'),
  fecha: z.string().trim().min(1, 'Fecha obligatoria'),
  autoridadAsignacion: z
    .literal('SEÑOR JEFE DE LA BASE NAVAL USHUAIA')
    .or(z.string().trim().min(1))
});

const DatosPersonalesSchema = z.object({
  mr: z.string().trim().min(1, 'MR obligatorio'),
  afiliadoIosefa: z.string().trim().optional(),
  grado: z.string().trim().min(1, 'Grado obligatorio'),
  escalafon: z.string().trim().optional(),
  apellido: z.string().trim().min(1, 'Apellido obligatorio'),
  nombres: z.string().trim().min(1, 'Nombres obligatorios'),
  destinoActual: z.string().trim().min(1, 'Destino actual obligatorio'),
  destinoFuturo: z.string().trim().optional(),
  telefonoActual: z.string().trim().min(1, 'Teléfono obligatorio'),
  telefonoFuturo: z.string().trim().optional(),
  fechaUltimoAscenso: z.string().trim().optional(),
  aniosServicio: z.number().int().nonnegative().optional(),
});

const Anexo21MetadataSchema = z.object({
  encabezado: EncabezadoSchema,
  datosPersonales: DatosPersonalesSchema,

  // Declaraciones
  fidofacAdjunta: z.boolean(),
  problemasSocioeconomicos: z.boolean(),
  oficioReferencia: z.string().trim().optional(),
  declaraInepto: z.boolean(),
  totalAniosOcupacionZonaNaval: z.number().int().nonnegative().optional(),

  representantesAsignacion: z.array(RepresentanteSchema).optional(),

  autorizaciones: z.object({
    descuentosHaberes: z.boolean(),
    expensasComunes: z.boolean(),
    fechaEstimadaTrasladoZona: z.string().trim().optional(),
  }),

  adjuntos: z.array(
    z.object({
      tipo: z.enum([
        'FIDOFAC',
        'INDICE_TITULARIDAD',
        'RECIBO_HABERES',
        'OTRO',
      ]),
      fileId: z.string().trim().min(1),
      originalname: z.string().trim().optional(),
      mimetype: z.string().trim().optional(),
      size: z.number().optional(),
    })
  ).optional(),

  observacionesInternas: z.string().trim().optional(),
});

const Anexo21CreateSchema = z.object({
  postulanteId: z.string().trim().min(1, 'postulanteId obligatorio'),
  metadata: Anexo21MetadataSchema,
});

function validateAnexo21Create(req, res, next) {
  try {
    const parsed = Anexo21CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    console.error('Error validando ANEXO 21:', err);
    return res.status(400).json({
      error: 'Datos inválidos para ANEXO 21',
      detalles: err.errors || err.issues,
    });
  }
}

module.exports = {
  validateAnexo21Create,
  Anexo21MetadataSchema,
  Anexo21CreateSchema,
};
