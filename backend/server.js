// backend/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const connectDB = require("./config/db");

// ⚠️ Middleware de autenticación genérico
// Este archivo debe exportar un middleware (función) compatible:
//   const authMiddleware = require("./middleware/auth");
const authMiddleware = require("./middleware/auth");

// Rutas principales
const usersRouter = require("./routes/users");
const postulacionesRouter = require("./routes/postulaciones");
const postulantesRouter = require("./routes/postulantes");
const viviendasRouter = require("./routes/viviendas");
const alojamientosRouter = require("./routes/alojamientos");
const estadisticasRouter = require("./routes/estadisticas");
const formulariosRouter = require("./routes/formularios");
const liquidacionesRouter = require("./routes/liquidaciones");
const mensajesRouter = require("./routes/mensajes");
const panelRouter = require("./routes/panel");

// Rutas del rol PERMISIONARIO (panel, mis datos, etc.)
const permisionarioRouter = require("./routes/permisionario");

// Rutas de Anexo 11 (por ahora sólo stub / en desarrollo)
const anexo11Router = require("./routes/anexo11");

const app = express();

// ========================
// Middlewares globales
// ========================
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Conexión a la base de datos
connectDB();

// ========================
// Rutas públicas / generales
// ========================
app.use("/api/users", usersRouter);
app.use("/api/postulaciones", postulacionesRouter);
app.use("/api/postulantes", postulantesRouter);
app.use("/api/viviendas", viviendasRouter);
app.use("/api/alojamientos", alojamientosRouter);
app.use("/api/estadisticas", estadisticasRouter);
app.use("/api/formularios", formulariosRouter);
app.use("/api/liquidaciones", liquidacionesRouter);
app.use("/api/panel", panelRouter);

// ========================
// Rutas protegidas
// ========================

// Mensajería interna – requiere usuario autenticado
app.use("/api/mensajes", authMiddleware, mensajesRouter);

// Rutas del permisionario – requiere token válido
app.use("/api/permisionario", authMiddleware, permisionarioRouter);

// Anexo 11 – por ahora sólo responde "en desarrollo"
// (el router devuelve siempre 503 controlado)
app.use("/api/anexo11", authMiddleware, anexo11Router);

// ========================
// Servir frontend estático (si lo usás desde Node)
// ========================
// app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://127.0.0.1:${PORT}`);
});
