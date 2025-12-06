// validators/anexo02Validator.js
const { z } = require('zod');

/**
 * Este validador se usa para generar un ANEXO 02
 * a partir de un ANEXO 01 existente.
 *
 * La ruta será algo como:
 * POST /api/anexos/02/generar-desde-anexo01/:anexo01Id
 *
 * El body debe traer:
 * - viviendaId: ID de la vivienda a asignar
 * - fechas: { fechaAsignacion, fechaEntregaPrevista }
 */

const generarAnexo02Schema = z.object({
  viviendaId: z
    .string()
    .trim()
    .min(1, 'viviendaId es obligatorio'),
  fechas: z.object({
    fechaAsignacion: z
      .string()
      .trim()
      .min(1, 'fechaAsignacion es obligatoria'),
    fechaEntregaPrevista: z
      .string()
      .trim()
      .min(1, 'fechaEntregaPrevista es obligatoria')
  })
});

function validateAnexo02Generate(req, res, next) {
  try {
    const parsed = generarAnexo02Schema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos para generar ANEXO 02 inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    console.error('Error en validateAnexo02Generate:', err);
    return res
      .status(500)
      .json({ error: 'Error interno en validación de ANEXO 02' });
  }
}

module.exports = {
  validateAnexo02Generate
};
