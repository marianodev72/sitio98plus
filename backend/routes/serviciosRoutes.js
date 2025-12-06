// routes/serviciosRoutes.js
// Rutas de servicios (Mis servicios) — Sistema ZN98

const express = require('express');
const multer = require('multer');
const path = require('path');

const {
  importServiciosCsv,
  getMisServicios,
} = require('../controllers/serviciosController');

const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para CSVs de servicios
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'csv'));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `servicios_${timestamp}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Solo se permiten archivos CSV.'));
    }
    cb(null, true);
  },
});

// Importar servicios desde CSV (solo ADMIN / ADMIN_GENERAL)
router.post(
  '/import-csv',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  upload.single('file'),
  importServiciosCsv
);

// Obtener mis servicios (usuario logueado)
router.get('/mios', authRequired, getMisServicios);

module.exports = router;
