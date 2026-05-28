// backend/server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

// ✅ NUEVO: requestId middleware
const { requestIdMiddleware } = require("./middleware/requestId");

const app = express();

// evita 304 sin body en endpoints /api (rompe axios/fetch.json())
app.set("etag", false);

// hardening
app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// -------------------------
// Helpers: runtime validation
// -------------------------
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function parseOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Safe require para evitar crash por archivos faltantes (fail-closed)
function safeRequire(label, relPath) {
  try {
    return require(relPath);
  } catch (e) {
    console.error(
      `[BOOT] No se pudo cargar ${label} (${relPath}). Motivo:`,
      e?.message || e
    );

    const router = express.Router();
    router.use((_req, res) => res.status(404).json({ message: "Recurso no disponible" }));
    return router;
  }
}

// -------------------------
// Required env & policy checks
// -------------------------
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

const isProd = process.env.NODE_ENV === "production";

if (isProd) requireEnv("MONGO_URI");

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const ORIGINS = parseOrigins(CLIENT_ORIGIN);

if (isProd) {
  requireEnv("CLIENT_ORIGIN");

  const origins = parseOrigins(process.env.CLIENT_ORIGIN);
  if (origins.length === 0) throw new Error("CLIENT_ORIGIN must include at least one origin in production");

  for (const o of origins) {
    if (!o.startsWith("https://")) {
      throw new Error(`Production origin must be https:// — got: ${o}`);
    }
  }

  if (String(process.env.AUTH_COOKIE_SECURE).toLowerCase() !== "true") {
    throw new Error("AUTH_COOKIE_SECURE must be true in production");
  }
  const ss = String(process.env.AUTH_COOKIE_SAMESITE || "").toLowerCase();
  if (!["lax", "strict", "none"].includes(ss)) {
    throw new Error("AUTH_COOKIE_SAMESITE must be lax|strict|none in production");
  }

  app.set("trust proxy", 1);
}

// -------------------------
// Middlewares base
// -------------------------

// ✅ IMPORTANTE: lo ponemos primero para que TODO tenga requestId
app.use(requestIdMiddleware);

app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
  })
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked origin"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// -------------------------
// Upload dirs
// -------------------------
const UPLOADS_DIR = path.join(__dirname, "uploads");
const UPLOADS_CSV_DIR = path.join(UPLOADS_DIR, "csv");
const UPLOADS_MENSAJES_DIR = path.join(UPLOADS_DIR, "mensajes");

const UPLOADS_PRIVATE_DIR = path.join(__dirname, "uploads_private");
const UPLOADS_PRIVATE_MENSAJES_DIR = path.join(UPLOADS_PRIVATE_DIR, "mensajes");

[
  UPLOADS_DIR,
  UPLOADS_CSV_DIR,
  UPLOADS_MENSAJES_DIR,
  UPLOADS_PRIVATE_DIR,
  UPLOADS_PRIVATE_MENSAJES_DIR,
].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// -------------------------
// Routes
// -------------------------
const authRoutes = safeRequire("authRoutes", "./routes/authRoutes");
const liquidacionRoutes = safeRequire("liquidacionRoutes", "./routes/liquidacionRoutes");
const serviciosRoutes = safeRequire("serviciosRoutes", "./routes/serviciosRoutes");
const mantenimientoRoutes = safeRequire("mantenimientoRoutes", "./routes/mantenimientoRoutes");
const formularioRoutes = safeRequire("formularioRoutes", "./routes/formularios");
const tareasRoutes = safeRequire("tareasRoutes", "./routes/tareasRoutes");
const mensajeRoutes = safeRequire("mensajeRoutes", "./routes/mensajeRoutes");
const adminRoutes = safeRequire("adminRoutes", "./routes/adminRoutes");
const templateRoutes = safeRequire("templateRoutes", "./routes/templateRoutes");
const viviendaRoutes = safeRequire("viviendaRoutes", "./routes/viviendaRoutes");
const statsRoutes = safeRequire("statsRoutes", "./routes/statsRoutes");
const dashboardRoutes = safeRequire("dashboardRoutes", "./routes/dashboardRoutes");
const usersRoutes = safeRequire("usersRoutes", "./routes/users");
const alojamientosNavalesRoutes = safeRequire(
  "alojamientosNavalesRoutes",
  "./modules/alojamientos/routes/alojamientosNavalesRoutes"
);
const alojamientosDashboardRoutes = safeRequire(
  "alojamientosDashboardRoutes",
  "./modules/alojamientos/routes/alojamientosDashboardRoutes"
);
const alojamientosAsignacionesRoutes = safeRequire(
  "alojamientosAsignacionesRoutes",
  "./modules/alojamientos/routes/alojamientosAsignacionesRoutes"
);
const alojamientosDocumentosRoutes = safeRequire(
  "alojamientosDocumentosRoutes",
  "./modules/alojamientos/routes/alojamientosDocumentosRoutes"
);
const alojamientosPlazasRoutes = safeRequire(
  "alojamientosPlazasRoutes",
  "./modules/alojamientos/routes/alojamientosPlazasRoutes"
);
const alojamientosMiRoutes = safeRequire(
  "alojamientosMiRoutes",
  "./modules/alojamientos/routes/alojamientosMiRoutes"
);
const anexo15Routes = safeRequire("anexo15Routes", "./routes/anexo15Routes");

// -------------------------
// Health
// -------------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    corsAllowlist: ORIGINS,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------
// API routes
// -------------------------
app.use("/api/auth", authRoutes);
app.use("/api/liquidaciones", liquidacionRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/mis-mantenimientos", mantenimientoRoutes);
app.use("/api/formularios", formularioRoutes);
app.use("/api/tareas", tareasRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/viviendas", viviendaRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alojamientos-navales", alojamientosNavalesRoutes);
app.use("/api/alojamientos-dashboard", alojamientosDashboardRoutes);
app.use("/api/alojamientos-asignaciones", alojamientosAsignacionesRoutes);
app.use("/api/alojamientos-documentos", alojamientosDocumentosRoutes);
app.use("/api/alojamientos-plazas", alojamientosPlazasRoutes);
app.use("/api/alojamientos-mi", alojamientosMiRoutes);
app.use("/api/anexo-15", anexo15Routes);

// -------------------------
app.use("/uploads", (_req, res) => res.status(404).end());
app.use("/uploads_private", (_req, res) => res.status(404).end());

// -------------------------
app.use((err, _req, res, next) => {
  if (err && String(err.message || "").startsWith("CORS blocked origin")) {
    return res.status(403).json({ message: "CORS bloqueado" });
  }
  return next(err);
});

app.use((_req, res) => {
  res.status(404).json({ message: "Recurso no encontrado" });
});

app.use((err, _req, res, _next) => {
  console.error("[ERROR GLOBAL]", err);
  res.status(500).json({ message: "Error interno del servidor" });
});

// -------------------------
function createServer() {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;

  const hasHttps =
    keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath);

  if (hasHttps) {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    console.log(`[BOOT] HTTPS habilitado con cert=${certPath}`);
    return https.createServer({ key, cert }, app);
  }

  console.log("[BOOT] HTTPS no configurado; usando HTTP");
  return http.createServer(app);
}

// -------------------------
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[MongoDB] Conectado");
    const server = createServer();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor escuchando en puerto ${PORT} (${process.env.NODE_ENV})`);
    });
  })
  .catch((err) => {
    console.error("[MongoDB] Error de conexión:", err);
    process.exit(1);
  });

module.exports = app;
