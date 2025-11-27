// routes/liquidaciones.js
// Importación de liquidaciones mensuales y envío de avisos por mensaje interno

const express = require("express");
const fs = require("fs");
const path = require("path");

const Liquidacion = require("../models/Liquidacion");
const User = require("../models/User");
const Message = require("../models/Message");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// -----------------------------------------------------------------------------
// Helper: solo ADMIN / ADMINISTRACION
// -----------------------------------------------------------------------------
function requireAdmin(req, res) {
  if (!req.user || !["ADMIN", "ADMINISTRACION"].includes(req.user.role)) {
    res.status(403).json({ message: "No tiene permisos para esta operación." });
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// POST /api/liquidaciones/admin/import-csv
// Lee DATA/liquidaciones.csv y lo importa a la colección Liquidacion
// Formato esperado (cabecera):
// MATRICULA;GRADO;APELLIDO;NOMBRE;ALQUILER;EXPENSAS;PERIODO
// -----------------------------------------------------------------------------
router.post("/admin/import-csv", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const filePath = path.join(__dirname, "..", "DATA", "liquidaciones.csv");

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({
        message: "No se encontró DATA/liquidaciones.csv",
      });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return res.status(400).json({
        message: "DATA/liquidaciones.csv no tiene datos suficientes.",
      });
    }

    const header = lines[0].split(";").map((h) => h.trim().toUpperCase());

    const idxMatricula = header.indexOf("MATRICULA");
    const idxGrado = header.indexOf("GRADO");
    const idxApellido = header.indexOf("APELLIDO");
    const idxNombre = header.indexOf("NOMBRE");
    const idxAlquiler = header.indexOf("ALQUILER");
    const idxExpensas = header.indexOf("EXPENSAS");
    const idxPeriodo = header.indexOf("PERIODO");

    if (
      idxMatricula === -1 ||
      idxGrado === -1 ||
      idxApellido === -1 ||
      idxNombre === -1 ||
      idxAlquiler === -1 ||
      idxExpensas === -1 ||
      idxPeriodo === -1
    ) {
      return res.status(400).json({
        message:
          "Cabeceras incorrectas en liquidaciones.csv. Debe incluir al menos: MATRICULA;GRADO;APELLIDO;NOMBRE;ALQUILER;EXPENSAS;PERIODO",
      });
    }

    let insertados = 0;
    let actualizados = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < header.length) continue;

      const matricula = String(cols[idxMatricula] || "").trim();
      if (!matricula) continue;

      const grado = String(cols[idxGrado] || "").trim();
      const apellido = String(cols[idxApellido] || "").trim();
      const nombre = String(cols[idxNombre] || "").trim();
      const alquilerRaw = String(cols[idxAlquiler] || "").replace(",", ".");
      const expensasRaw = String(cols[idxExpensas] || "").replace(",", ".");
      const periodo = String(cols[idxPeriodo] || "").trim();

      const alquiler = Number(alquilerRaw) || 0;
      const expensas = Number(expensasRaw) || 0;

      const result = await Liquidacion.findOneAndUpdate(
        { matricula, periodo },
        {
          matricula,
          grado,
          apellido,
          nombre,
          alquiler,
          expensas,
          periodo,
          importedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.wasNew) {
        insertados++;
      } else {
        actualizados++;
      }
    }

    return res.json({
      ok: true,
      message: "Liquidaciones importadas correctamente",
      insertados,
      actualizados,
    });
  } catch (err) {
    console.error("POST /api/liquidaciones/admin/import-csv", err);
    return res.status(400).json({
      message: "Error importando liquidaciones desde CSV",
      error: String(err.message || err),
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/liquidaciones/admin
// Lista liquidaciones (opcional filtro por periodo)
// -----------------------------------------------------------------------------
router.get("/admin", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { periodo, limit = 50, page = 1 } = req.query;

    const query = {};
    if (periodo) query.periodo = String(periodo).trim();

    const lim = Math.min(Number(limit) || 50, 200);
    const skip = (Number(page) - 1 || 0) * lim;

    const [items, total] = await Promise.all([
      Liquidacion.find(query).sort({ periodo: -1, matricula: 1 }).skip(skip).limit(lim),
      Liquidacion.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      page: Number(page) || 1,
      limit: lim,
      total,
      liquidaciones: items,
    });
  } catch (err) {
    console.error("GET /api/liquidaciones/admin", err);
    return res.status(500).json({ message: "Error obteniendo liquidaciones" });
  }
});

// -----------------------------------------------------------------------------
// POST /api/liquidaciones/admin/notificar
// Envía un mensaje interno a cada usuario con liquidación del PERIODO indicado.
// Parámetros:
//   - query ?periodo=AAAA-MM   (obligatorio)
// -----------------------------------------------------------------------------
router.post("/admin/notificar", requireAuth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const periodo = String(req.query.periodo || "").trim();
    if (!periodo) {
      return res
        .status(400)
        .json({ message: "Debe indicar ?periodo=AAAA-MM para notificar." });
    }

    // 1) Traer liquidaciones del período
    const liquidaciones = await Liquidacion.find({ periodo });

    if (!liquidaciones.length) {
      return res.status(404).json({
        message: `No hay liquidaciones para el período ${periodo}.`,
      });
    }

    // 2) Buscar usuarios con esas matrículas (permisionarios o alojados)
    const matriculas = [
      ...new Set(liquidaciones.map((l) => String(l.matricula).trim())),
    ];

    const usuarios = await User.find({
      matricula: { $in: matriculas },
      role: { $in: ["PERMISIONARIO", "ALOJADO"] },
    }).lean();

    const usuariosPorMatricula = new Map();
    for (const u of usuarios) {
      if (!u.matricula) continue;
      usuariosPorMatricula.set(String(u.matricula).trim(), u);
    }

    let enviados = 0;
    let sinUsuario = 0;

    // 3) Crear mensajes
    for (const liq of liquidaciones) {
      const mat = String(liq.matricula).trim();
      const user = usuariosPorMatricula.get(mat);

      if (!user) {
        sinUsuario++;
        continue;
      }

      const alquiler = typeof liq.alquiler === "number" ? liq.alquiler : Number(liq.alquiler) || 0;
      const expensas = typeof liq.expensas === "number" ? liq.expensas : Number(liq.expensas) || 0;

      const subject = `Liquidación ${periodo} - Matrícula ${mat}`;
      const bodyLines = [
        `Estimado/a ${user.apellido} ${user.nombre || ""}`.trim() + ",",
        "",
        `Le informamos los importes correspondientes al período ${periodo}:`,
        "",
        `• Alquiler: $ ${alquiler.toFixed(2)}`,
        `• Expensas: $ ${expensas.toFixed(2)}`,
        "",
        "Cualquier duda o inconsistencia, comuníquese con Administración.",
        "",
        "Mensaje generado automáticamente por el sistema ZN98.",
      ];

      await Message.create({
        kind: "DIRECT",
        fromUser: req.user.id,
        fromRole: req.user.role,
        fromBarrio: null,
        toUser: user._id,
        toRole: user.role,
        toBarrio: user.barrio || null,
        subject,
        body: bodyLines.join("\n"),
        readAt: null,
      });

      enviados++;
    }

    return res.json({
      ok: true,
      message: `Notificaciones enviadas para período ${periodo}`,
      periodo,
      enviados,
      sinUsuario,
      totalLiquidaciones: liquidaciones.length,
    });
  } catch (err) {
    console.error("POST /api/liquidaciones/admin/notificar", err);
    return res.status(500).json({
      message: "Error enviando notificaciones de liquidaciones",
      error: String(err.message || err),
    });
  }
});

module.exports = router;
