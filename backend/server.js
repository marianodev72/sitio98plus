// server.js
// Servidor principal del Sistema ZN98 (Backend)
// Versión reestructurada con auth + liquidaciones + servicios + formularios (ANEXOS) + tareas.

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// ───────────────────────────────────────────────
// CONFIGURACIÓN BÁSICA
// ───────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zn98';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ───────────────────────────────────────────────
// PREPARAR CARPETAS DE UPLOADS
// ───────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOADS_CSV_DIR = path.join(UPLOADS_DIR, 'csv');
const UPLOADS_MENSAJES_DIR = path.join(UPLOADS_DIR, 'mensajes');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
if (!fs.existsSync(UPLOADS_CSV_DIR)) {
  fs.mkdirSync(UPLOADS_CSV_DIR);
}
if (!fs.existsSync(UPLOADS_MENSAJES_DIR)) {
  fs.mkdirSync(UPLOADS_MENSAJES_DIR);
}

// ───────────────────────────────────────────────
// RUTAS PRINCIPALES
// ───────────────────────────────────────────────

const authRoutes = require('./routes/authRoutes');
const liquidacionRoutes = require('./routes/liquidacionRoutes');
const serviciosRoutes = require('./routes/serviciosRoutes');
const formularioRoutes = require('./routes/formularioRoutes');
const tareasRoutes = require('./routes/tareasRoutes');

// Rutas adicionales que fuimos construyendo
const mensajeRoutes = require('./routes/mensajeRoutes');      // mensajería interna + adjuntos
const adminRoutes = require('./routes/adminRoutes');          // panel ADMIN_GENERAL
const anexo01Routes = require('./routes/anexo01Routes');      // ANEXO 01 - Formulario inscripción vivienda
const anexo02Routes = require('./routes/anexo02Routes');      // ANEXO 02 - Acta de asignación vivienda
const anexo03Routes = require('./routes/anexo03Routes');      // ANEXO 03 - Acta de recepción vivienda
// Futuras rutas:
// const viviendaRoutes = require('./routes/viviendaRoutes');
// const alojamientoRoutes = require('./routes/alojamientoRoutes');

// ───────────────────────────────────────────────
// MIDDLEWARES DE SEGURIDAD Y UTILIDAD
// ───────────────────────────────────────────────

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting básico para /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ───────────────────────────────────────────────
// RUTA DE SALUD / TEST
// ───────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend ZN98 operativo',
    timestamp: new Date().toISOString(),
  });
});

// ───────────────────────────────────────────────
// RUTAS API
// ───────────────────────────────────────────────

// Autenticación (login, logout, me, etc.)
app.use('/api/auth', authRoutes);

// Liquidaciones (import CSV + consulta)
app.use('/api/liquidaciones', liquidacionRoutes);

// Servicios (import CSV + consulta)
app.use('/api/servicios', serviciosRoutes);

// Formularios / ANEXOS genéricos (motor de FormSubmission)
app.use('/api/formularios', formularioRoutes);

// Tareas programadas (recordatorios, procesos)
app.use('/api/tareas', tareasRoutes);

// Mensajería interna (bandejas, envío, adjuntos seguros)
app.use('/api/mensajes', mensajeRoutes);

// Panel de Administración (solo ADMIN_GENERAL)
app.use('/api/admin', adminRoutes);

// ANEXOS específicos de Vivienda Fiscal
app.use('/api/anexos/01', anexo01Routes); // Formulario de inscripción
app.use('/api/anexos/02', anexo02Routes); // Acta de asignación
app.use('/api/anexos/03', anexo03Routes); // Acta de recepción

// Futuro:
// app.use('/api/viviendas', viviendaRoutes);
// app.use('/api/alojamientos', alojamientoRoutes);

// ───────────────────────────────────────────────
// ARCHIVOS ESTÁTICOS (adjuntos, CSV, etc.)
// ───────────────────────────────────────────────

app.use('/uploads', express.static(UPLOADS_DIR));

// ───────────────────────────────────────────────
// MANEJO DE 404
// ───────────────────────────────────────────────

app.use((req, res, next) => {
  res.status(404).json({
    message: 'Recurso no encontrado.',
    path: req.originalUrl,
  });
});

// ───────────────────────────────────────────────
// MANEJO CENTRALIZADO DE ERRORES
// ───────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[ERROR GLOBAL]', err);
  res.status(500).json({
    message: 'Error interno del servidor.',
  });
});

// ───────────────────────────────────────────────
// CONEXIÓN A MONGODB Y ARRANQUE DEL SERVER
// ───────────────────────────────────────────────

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('[MongoDB] Conexión exitosa.');
    app.listen(PORT, () => {
      console.log(`Servidor ZN98 escuchando en puerto ${PORT}`);
      console.log(`CORS permitido desde: ${CLIENT_ORIGIN}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Error de conexión:', err);
    process.exit(1);
  });

module.exports = app;
