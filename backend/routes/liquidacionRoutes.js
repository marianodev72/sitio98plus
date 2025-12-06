// routes/liquidacionRoutes.js
// Rutas de liquidaciones — Sistema ZN98

const express = require('express');
const multer = require('multer');
const path = require('path');

const {
  importLiquidacionesCsv,
  getMisLiquidaciones,
} = require('../controllers/liquidacionController');

const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para subir CSVs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'csv'));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `liquidaciones_${timestamp}_${file.originalname}`);
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

// Importar liquidaciones desde CSV (solo ADMIN / ADMIN_GENERAL)
router.post(
  '/import-csv',
  authRequired,
  requireRole('ADMIN', 'ADMIN_GENERAL'),
  upload.single('file'),
  importLiquidacionesCsv
);

// Obtener mis liquidaciones (usuario logueado)
router.get('/mias', authRequired, getMisLiquidaciones);

module.exports = router;
