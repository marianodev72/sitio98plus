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

const app = express();

// ✅ FIX DEFINITIVO: evita 304 sin body en endpoints /api (rompe axios/fetch.json())
app.set("etag", false);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ allowlist ORIGINS (separados por coma en .env si querés)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const ORIGINS = String(CLIENT_ORIGIN)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const UPLOADS_DIR = path.join(__dirname, "uploads");
const UPLOADS_CSV_DIR = path.join(UPLOADS_DIR, "csv");
const UPLOADS_MENSAJES_DIR = path.join(UPLOADS_DIR, "mensajes");
[UPLOADS_DIR, UPLOADS_CSV_DIR, UPLOADS_MENSAJES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Rutas (core)
const authRoutes = require("./routes/authRoutes");
const liquidacionRoutes = require("./routes/liquidacionRoutes");
const serviciosRoutes = require("./routes/serviciosRoutes");
const formularioRoutes = require("./routes/formularios");
const tareasRoutes = require("./routes/tareasRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const templateRoutes = require("./routes/templateRoutes");
const viviendaRoutes = require("./routes/viviendaRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");

// Middlewares
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });
app.use("/api/", apiLimiter);

// ✅ FIX: headers anti-cache para TODA la API (evita 304 sin body)
app.use("/api", (req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Servidor ZN98 operativo",
    timestamp: new Date().toISOString(),
  });
});

// Rutas API (único backend institucional para anexos: /api/formularios)
app.use("/api/auth", authRoutes);
app.use("/api/liquidaciones", liquidacionRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/formularios", formularioRoutes);
app.use("/api/tareas", tareasRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/viviendas", viviendaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);

// Static
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      // Permitir embebido controlado (img / iframe)
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      // Evitar cache 304 (rompe previews)
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Intentar abrir inline (PDF / imágenes)
      res.setHeader("Content-Disposition", "inline");
    },
  })
);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Recurso no encontrado", path: req.originalUrl });
});

// Error global
app.use((err, req, res, next) => {
  console.error("[ERROR GLOBAL]", err);
  res.status(500).json({ message: "Error interno del servidor" });
});

// Mongo + start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[MongoDB] Conectado");
    console.log(`Servidor escuchando en puerto ${PORT}`);
    app.listen(PORT);
  })
  .catch((err) => {
    console.error("[MongoDB] Error de conexión:", err);
    process.exit(1);
  });

module.exports = app;
