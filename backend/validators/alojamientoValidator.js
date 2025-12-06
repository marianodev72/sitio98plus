// validators/alojamientoValidator.js
const { z } = require('zod');

/**
 * Estados permitidos para un alojamiento naval.
 * Deben coincidir con el modelo Mongoose ya definido.
 */
const ESTADOS_ALOJAMIENTO = [
  'DISPONIBLE',
  'OCUPADO',
  'EN_REPARACION',
  'RESERVADO',
  'BAJA'
];

const alojamientoBaseSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  barrio: z.string().min(1, 'El barrio es obligatorio'),
  descripcion: z.string().optional(),
  estado: z.enum(ESTADOS_ALOJAMIENTO, {
    errorMap: () => ({ message: 'Estado de alojamiento inválido' })
  }).optional()
});

/**
 * Schema para creación.
 * Estado por defecto: DISPONIBLE.
 */
const alojamientoCreateSchema = alojamientoBaseSchema.partial({
  estado: true // opcional, si no viene usamos DISPONIBLE
}).refine((data) => !!data.codigo && !!data.barrio, {
  message: 'codigo y barrio son obligatorios'
});

/**
 * Schema para actualización.
 * Permitimos cambios parciales.
 * No dejamos tocar campos de ocupación desde este CRUD.
 */
const alojamientoUpdateSchema = z.object({
  barrio: z.string().min(1, 'El barrio no puede estar vacío').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(ESTADOS_ALOJAMIENTO, {
    errorMap: () => ({ message: 'Estado de alojamiento inválido' })
  }).optional()
});

/**
 * Middleware de validación para creación.
 */
function validateAlojamientoCreate(req, res, next) {
  try {
    const parsed = alojamientoCreateSchema.parse(req.body);
    // Valor por defecto de estado
    if (!parsed.estado) {
      parsed.estado = 'DISPONIBLE';
    }
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos de alojamiento inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateAlojamientoCreate:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

/**
 * Middleware de validación para actualización.
 */
function validateAlojamientoUpdate(req, res, next) {
  try {
    const parsed = alojamientoUpdateSchema.parse(req.body);
    if (Object.keys(parsed).length === 0) {
      return res.status(400).json({
        error: 'No se enviaron campos válidos para actualizar'
      });
    }
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos de alojamiento inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateAlojamientoUpdate:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateAlojamientoCreate,
  validateAlojamientoUpdate,
  ESTADOS_ALOJAMIENTO
};
