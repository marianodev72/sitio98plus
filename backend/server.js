// backend/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");

// Middlewares
const authMiddleware = require("./middleware/authMiddleware");

// Rutas existentes…
const usersRouter = require("./routes/users");
const panelRouter = require("./routes/panel");
const permisionarioRouter = require("./routes/permisionario");
const anexo11Router = require("./routes/anexo11");
const anexo3Router = require("./routes/anexo3");

// NUEVO
const anexo4Router = require("./routes/anexo4");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

// Rutas públicas
app.use("/api/users", usersRouter);
app.use("/api/panel", panelRouter);

// Rutas autenticadas
app.use("/api/permisionario", authMiddleware, permisionarioRouter);
app.use("/api/anexo11", authMiddleware, anexo11Router);
app.use("/api/anexo3", authMiddleware, anexo3Router);

// NUEVO ANEXO 4
app.use("/api/anexo4", authMiddleware, anexo4Router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://127.0.0.1:${PORT}`);
});
