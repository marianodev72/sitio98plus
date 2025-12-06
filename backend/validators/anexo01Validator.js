// validators/anexo01Validator.js
const { z } = require('zod');

/**
 * Enums y tipos auxiliares
 */
const SexoPersonaEnum = z.enum(['MASCULINO', 'FEMENINO', 'OTRO']);
const VinculoFamiliarEnum = z.enum([
  'ESPOSO',
  'ESPOSA',
  'HIJO',
  'HIJA',
  'PADRE',
  'MADRE',
  'OTRO'
]);

const SexoAnimalEnum = z.enum(['MACHO', 'HEMBRA', 'OTRO']);

const TipoAdjuntoAnexo01Enum = z.enum([
  'FIDOFAC',
  'RECIBO_HABERES',
  'ESCRITURAS_CONTRATOS',
  'CERTIFICADOS_VACUNACION',
  'OTRO'
]);

/**
 * Sub-esquemas
 */

// Grupo familiar
const GrupoFamiliarItemSchema = z.object({
  apellidoNombres: z
    .string()
    .trim()
    .min(1, 'El nombre y apellido del familiar es obligatorio'),
  dni: z.string().trim().optional(),
  sexo: SexoPersonaEnum.optional(),
  edad: z.number().int().nonnegative().optional(),
  relacion: VinculoFamiliarEnum,
  aCargo: z.boolean(),
  diba: z.string().trim().optional()
});

// Animal doméstico
const AnimalDomesticoItemSchema = z.object({
  especie: z
    .string()
    .trim()
    .min(1, 'La especie de la mascota es obligatoria'),
  raza: z.string().trim().optional(),
  edad: z.string().trim().optional(),
  sexo: SexoAnimalEnum.optional(),
  peso: z.string().trim().optional(),
  otrosDatos: z.string().trim().optional()
});

// Representante para acto de asignación
const RepresentanteAsignacionSchema = z.object({
  apellidoNombres: z
    .string()
    .trim()
    .min(1, 'El apellido y nombres del representante es obligatorio'),
  grado: z
    .string()
    .trim()
    .min(1, 'El grado del representante es obligatorio'),
  mr: z
    .string()
    .trim()
    .min(1, 'La matrícula (MR) del representante es obligatoria'),
  destino: z
    .string()
    .trim()
    .min(1, 'El destino del representante es obligatorio'),
  telefono: z
    .string()
    .trim()
    .min(1, 'El teléfono del representante es obligatorio')
});

// Adjunto
const AdjuntoAnexo01Schema = z.object({
  tipo: TipoAdjuntoAnexo01Enum,
  fileId: z
    .string()
    .trim()
    .min(1, 'fileId es obligatorio para el adjunto')
});

/**
 * Esquema principal de metadata del ANEXO 01
 */
const Anexo01MetadataSchema = z.object({
  encabezado: z.object({
    lugar: z
      .string()
      .trim()
      .min(1, 'El lugar es obligatorio'),
    fecha: z
      .string()
      .trim()
      .min(1, 'La fecha es obligatoria'),
    autoridadAsignacion: z
      .literal('SEÑOR JEFE DE LA BASE NAVAL USHUAIA', {
        errorMap: () => ({
          message:
            'La autoridad de asignación debe ser "SEÑOR JEFE DE LA BASE NAVAL USHUAIA"'
        })
      })
  }),

  tipoPostulacion: z.object({
    motivo: z.enum(['NUEVA_VIVIENDA', 'CAMBIO_DE_VIVIENDA'], {
      errorMap: () => ({
        message:
          'El motivo debe ser "NUEVA_VIVIENDA" o "CAMBIO_DE_VIVIENDA"'
      })
    })
  }),

  datosPersonales: z.object({
    mr: z
      .string()
      .trim()
      .min(1, 'La matrícula (MR) es obligatoria'),
    afiliadoDiba: z.string().trim().optional(),
    grado: z
      .string()
      .trim()
      .min(1, 'El grado es obligatorio'),
    escalafon: z.string().trim().optional(),
    apellido: z
      .string()
      .trim()
      .min(1, 'El apellido es obligatorio'),
    nombres: z
      .string()
      .trim()
      .min(1, 'Los nombres son obligatorios'),
    destinoActual: z
      .string()
      .trim()
      .min(1, 'El destino actual es obligatorio'),
    destinoFuturo: z.string().trim().optional(),
    telefonoActual: z
      .string()
      .trim()
      .min(1, 'El teléfono actual es obligatorio'),
    telefonoFuturo: z.string().trim().optional(),
    fechaUltimoAscenso: z.string().trim().optional(),
    aniosServicio: z.number().int().nonnegative().optional()
  }),

  grupoFamiliar: z
    .array(GrupoFamiliarItemSchema)
    .optional()
    // si querés exigir al menos 1, descomentá:
    // .min(1, 'Debe cargar al menos un integrante del grupo familiar')
    ,

  animales: z.object({
    tieneAnimales: z.boolean(),
    detalle: z.array(AnimalDomesticoItemSchema).optional(),
    certificadosVacunacionAdjuntos: z.boolean()
  }),

  propiedadesZonaNaval: z.object({
    tienePropiedades: z.boolean(),
    propiedades: z
      .array(
        z.object({
          direccion: z
            .string()
            .trim()
            .min(1, 'La dirección de la propiedad es obligatoria'),
          observaciones: z.string().trim().optional()
        })
      )
      .optional(),
    verificoArt506_3y4: z.boolean()
  }),

  situacionSocioeconomica: z.object({
    tieneProblemas: z.boolean(),
    oficioReferencia: z.string().trim().optional()
  }),

  declaraciones: z.object({
    fidofacElevadaEsteAnio: z.boolean(),
    esIneptoParaVivienda: z.boolean(),
    reciboHaberesAdjunto: z.boolean(),
    totalAniosOcupacionZonaNaval: z
      .number()
      .int()
      .nonnegative()
      .optional()
  }),

  representantesAsignacion: z.array(RepresentanteAsignacionSchema).optional(),

  autorizaciones: z.object({
    descuentosHaberesVivienda: z.boolean(),
    administradorExpensasAutorizado: z.boolean(),
    fechaEstimadaTrasladoZona: z.string().trim().optional()
  }),

  adjuntos: z.array(AdjuntoAnexo01Schema).optional(),

  observacionesInternas: z.string().trim().optional()
});

/**
 * Esquema completo del body para crear ANEXO 01
 */
const Anexo01CreateSchema = z.object({
  postulanteId: z
    .string()
    .trim()
    .min(1, 'postulanteId es obligatorio'),
  metadata: Anexo01MetadataSchema
});

/**
 * Middleware de validación para creación de ANEXO 01.
 *
 * - Valida toda la estructura según el formulario físico.
 * - Deja el resultado saneado en req.validatedBody.
 */
function validateAnexo01Create(req, res, next) {
  try {
    const parsed = Anexo01CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos de ANEXO 01 inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    console.error('Error en validateAnexo01Create:', err);
    return res
      .status(500)
      .json({ error: 'Error interno en validación de ANEXO 01' });
  }
}

module.exports = {
  validateAnexo01Create,
  Anexo01CreateSchema,
  Anexo01MetadataSchema
};
