// validators/mensajeValidator.js
const { z } = require('zod');

/**
 * Esquema de validación para crear mensajes.
 *
 * NOTA:
 * - No fijamos una lista cerrada de tipos, porque tu modelo ya usa valores como
 *   "NOTIFICACION", "ANEXO", "SISTEMA", etc.
 * - Si no se especifica "tipo", usamos por defecto "NOTIFICACION", que coincide
 *   con el uso actual del sistema.
 */
const crearMensajeSchema = z.object({
  destinatarioId: z
    .string()
    .trim()
    .min(1, 'destinatarioId es obligatorio'),
  asunto: z
    .string()
    .trim()
    .min(1, 'El asunto es obligatorio')
    .max(200, 'El asunto no puede superar 200 caracteres'),
  cuerpo: z
    .string()
    .trim()
    .min(1, 'El cuerpo es obligatorio')
    .max(5000, 'El cuerpo no puede superar 5000 caracteres'),
  tipo: z
    .string()
    .trim()
    .max(50, 'El tipo de mensaje no puede superar 50 caracteres')
    .optional()
});

/**
 * Middleware de validación para creación de mensajes.
 * Deja el resultado saneado en req.validatedBody.
 */
function validateMensajeCreate(req, res, next) {
  try {
    const parsed = crearMensajeSchema.parse(req.body);

    // Tipo por defecto si no se especifica
    if (!parsed.tipo) {
      parsed.tipo = 'NOTIFICACION';
    }

    req.validatedBody = parsed;
    return next();
  } catch (err) {
    // Errores de Zod
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos de mensaje inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    console.error('Error en validateMensajeCreate:', err);
    return res
      .status(500)
      .json({ error: 'Error interno de validación de mensaje' });
  }
}

module.exports = {
  validateMensajeCreate
};
