// backend/controllers/registerPostulanteController.js
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ✅ IMPORT CORRECTO (tu modelo exporta { User: ... })
const { User } = require("../models/User");

// 📁 CSV real
const CSV_MATRICULAS_PATH = path.join(__dirname, "..", "data", "matriculas.csv");

function cargarMatriculasHabilitadas() {
  try {
    if (!fs.existsSync(CSV_MATRICULAS_PATH)) {
      console.error("[REGISTRO] No se encontró el CSV de matrículas:", CSV_MATRICULAS_PATH);
      return new Set();
    }

    const contenido = fs.readFileSync(CSV_MATRICULAS_PATH, "utf8");
    const lineas = contenido.split(/\r?\n/);

    const set = new Set();
    for (const linea of lineas) {
      const m = String(linea || "").trim();
      if (!m) continue;

      const lower = m.toLowerCase();
      if (lower === "matricula" || lower === "matrícula") continue;

      const firstCol = m.split(/[;,]/)[0].trim();
      if (firstCol) set.add(firstCol);
    }
    return set;
  } catch (err) {
    console.error("[REGISTRO] Error leyendo CSV matrículas:", err);
    return new Set();
  }
}

async function verificarTurnstile(captchaToken) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("[REGISTRO] Falta TURNSTILE_SECRET_KEY en backend/.env");
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: captchaToken,
    }).toString();

    const resp = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 7000 }
    );

    return !!resp.data?.success;
  } catch (err) {
    console.error("[REGISTRO] Error verificando Turnstile:", err?.message || err);
    return false;
  }
}

exports.registrarPostulante = async (req, res) => {
  try {
    const {
      email,
      password,
      confirmarPassword,
      matricula,
      nombre,
      apellido,
      grado,
      captchaToken,
    } = req.body;

    // Mensaje genérico para TODO
    const deny = (status = 400) =>
      res.status(status).json({ message: "No es posible procesar el registro en este momento." });

    // 1) Validaciones mínimas
    if (
      !email ||
      !password ||
      !confirmarPassword ||
      !matricula ||
      !nombre ||
      !apellido ||
      !grado
    ) {
      return deny(400);
    }

    if (password !== confirmarPassword) {
      return deny(400);
    }

    // 2) Turnstile obligatorio
    if (!captchaToken) {
      return deny(400);
    }

    const okCaptcha = await verificarTurnstile(String(captchaToken));
    if (!okCaptcha) {
      return deny(403);
    }

    // 3) Matrícula contra CSV
    const matriculasValidas = cargarMatriculasHabilitadas();
    const matriculaTrim = String(matricula).trim();

    if (!matriculasValidas.has(matriculaTrim)) {
      return deny(403);
    }

    // 4) Email único (genérico)
    const emailNorm = String(email).trim().toLowerCase();
    const existente = await User.findOne({ email: emailNorm });
    if (existente) {
      return deny(400);
    }

    // 5) Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 6) Crear usuario POSTULANTE inactivo
    const nuevoUsuario = new User({
      email: emailNorm,
      passwordHash,
      role: "POSTULANTE",
      activo: false,
      matricula: matriculaTrim,
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      meta: {
        grado: String(grado).trim(),
        origenRegistro: "REGISTRO_PUBLICO",
      },
    });

    await nuevoUsuario.save();

    return res.status(201).json({
      message: "Registro recibido. Su solicitud será evaluada por el administrador.",
    });
  } catch (error) {
    console.error("[REGISTRO POSTULANTE] Error:", error);
    return res.status(500).json({
      message: "No es posible procesar el registro en este momento.",
    });
  }
};
