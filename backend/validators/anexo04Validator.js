// validators/anexo04Validator.js
const { z } = require('zod');

/**
 * ANEXO 04 – Aviso de Ausencia Prolongada
 *
 * Campos principales:
 * - Período de ausencia (desde/hasta)
 * - Motivo
 * - Representantes para emergencia
 * - Representantes para relación con el organismo
 * - Datos del permisionario (grado, MR, domicilio, teléfono)
 */

const RepresentanteSchema = z.object({
  apellido: z.string().trim().min(1, 'El apellido del representante es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres del representante son obligatorios'),
  dni: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  vinculo: z.string().trim().optional(), // esposo, esposa, vecino, etc.
});

const EncabezadoSchema = z.object({
  lugar: z.string().trim().min(1, 'El lugar es obligatorio'),
  fecha: z.string().trim().min(1, 'La fecha es obligatoria'),
});

const DatosPermisionarioSchema = z.object({
  grado: z.string().trim().min(1, 'El grado es obligatorio'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio'),
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios'),
  mr: z.string().trim().min(1, 'La matrícula (MR) es obligatoria'),
  domicilio: z.string().trim().min(1, 'El domicilio es obligatorio'),
  telefono: z.string().trim().optional(),
});

const PeriodoAusenciaSchema = z.object({
  fechaDesde: z.string().trim().min(1, 'La fecha desde es obligatoria'),
  fechaHasta: z.string().trim().min(1, 'La fecha hasta es obligatoria'),
  lugarEstadia: z.string().trim().optional(), // dónde estará durante la ausencia
});

const Anexo04MetadataSchema = z.object({
  encabezado: EncabezadoSchema,
  datosPermisionario: DatosPermisionarioSchema,
  periodoAusencia: PeriodoAusenciaSchema,
  motivo: z.string().trim().min(1, 'El motivo de la ausencia es obligatorio'),
  representantesEmergencia: z.array(RepresentanteSchema).optional(),
  representantesOrganismo: z.array(RepresentanteSchema).optional(),
  observaciones: z.string().trim().optional(),
});

// Body completo para crear ANEXO 04
const Anexo04CreateSchema = z.object({
  permisionarioId: z.string().trim().min(1, 'permisionarioId es obligatorio'),
  viviendaId: z.string().trim().optional(),
  metadata: Anexo04MetadataSchema,
});

function validateAnexo04Create(req, res, next) {
  try {
    const parsed = Anexo04CreateSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos de ANEXO 04 inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    }

    console.error('Error en validateAnexo04Create:', err);
    return res.status(500).json({
      error: 'Error interno en validación de ANEXO 04',
    });
  }
}

module.exports = {
  validateAnexo04Create,
  Anexo04CreateSchema,
  Anexo04MetadataSchema,
};
