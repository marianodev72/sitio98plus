// validators/viviendaValidator.js
const { z } = require('zod');

/**
 * Estados permitidos para una vivienda fiscal.
 * Deben coincidir con el modelo Mongoose ya definido.
 */
const ESTADOS_VIVIENDA = [
  'DISPONIBLE',
  'OCUPADA',
  'EN_REPARACION',
  'RESERVADA',
  'BAJA'
];

const viviendaBaseSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  direccion: z.string().min(1, 'La dirección es obligatoria'),
  barrio: z.string().min(1, 'El barrio es obligatorio'),
  descripcion: z.string().optional(),
  estado: z.enum(ESTADOS_VIVIENDA, {
    errorMap: () => ({ message: 'Estado de vivienda inválido' })
  }).optional()
});

/**
 * Schema para creación.
 * Estado por defecto: DISPPONIBLE.
 */
const viviendaCreateSchema = viviendaBaseSchema.partial({
  estado: true // lo hacemos opcional, y si no viene usamos DISPPONIBLE
}).refine((data) => !!data.codigo && !!data.direccion && !!data.barrio, {
  message: 'codigo, direccion y barrio son obligatorios'
});

/**
 * Schema para actualización.
 * Permitimos cambios parciales.
 * No dejamos tocar campos de ocupación desde este CRUD.
 */
const viviendaUpdateSchema = z.object({
  direccion: z.string().min(1, 'La dirección no puede estar vacía').optional(),
  barrio: z.string().min(1, 'El barrio no puede estar vacío').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(ESTADOS_VIVIENDA, {
    errorMap: () => ({ message: 'Estado de vivienda inválido' })
  }).optional()
});

/**
 * Middleware de validación para creación.
 */
function validateViviendaCreate(req, res, next) {
  try {
    const parsed = viviendaCreateSchema.parse(req.body);
    // Valor por defecto de estado
    if (!parsed.estado) {
      parsed.estado = 'DISPONIBLE';
    }
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos de vivienda inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateViviendaCreate:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

/**
 * Middleware de validación para actualización.
 */
function validateViviendaUpdate(req, res, next) {
  try {
    const parsed = viviendaUpdateSchema.parse(req.body);
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
        error: 'Datos de vivienda inválidos',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateViviendaUpdate:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateViviendaCreate,
  validateViviendaUpdate,
  ESTADOS_VIVIENDA
};
