// validators/anexo22Validator.js
const { z } = require('zod');

/**
 * VALIDADOR ANEXO 22 (Asignación de Alojamiento Naval)
 */

const Anexo22GenerateSchema = z.object({
  alojamientoId: z.string().trim().min(1, 'alojamientoId obligatorio'),
  fechas: z.object({
    fechaAsignacion: z.string().trim().min(1),
    fechaEntregaPrevista: z.string().trim().min(1),
  }),
});

function validateGenerarAnexo22(req, res, next) {
  try {
    req.validatedBody = Anexo22GenerateSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Datos inválidos para generar ANEXO 22',
      detalles: error.issues,
    });
  }
}

module.exports = {
  validateGenerarAnexo22,
};
