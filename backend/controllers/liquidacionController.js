// backend/controllers/liquidacionController.js
// Controlador de liquidaciones (CSV mensual + confirmación) — Sistema ZN98

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parse } = require("csv-parse/sync");

const { User } = require("../models/user");
const { Liquidacion } = require("../models/Liquidacion");
const { LiquidacionLote } = require("../models/LiquidacionLote");
const PDFDocument = require("pdfkit");


function up(v) {
  return String(v || "").toUpperCase().trim();
}

function safeStr(v) {
  return String(v || "").trim();
}

// MR normalizada: solo texto, sin espacios
function normMR(v) {
  return safeStr(v).replace(/\s+/g, "").toUpperCase();
}

function onlyDigits(v) {
  return String(v || "").replace(/\D+/g, "");
}

function stripLeadingZeros(v) {
  return String(v || "").replace(/^0+/, "");
}

function matriculaCandidates(v) {
  const digits = onlyDigits(v);
  const noZeros = stripLeadingZeros(digits);

  const set = new Set();
  if (digits) set.add(digits);
  if (noZeros) set.add(noZeros);

  return Array.from(set);
}

async function findUserByMatriculaFlexible(mrLike) {
  const candidates = matriculaCandidates(mrLike);
  if (!candidates.length) return null;

  const users = await User.find({
    matricula: { $exists: true, $ne: null },
  })
    .select("_id matricula nombre apellido")
    .lean();

  for (const u of users) {
    const dbCandidates = matriculaCandidates(u?.matricula);
    const match = dbCandidates.some((x) => candidates.includes(x));
    if (match) return u;
  }

  return null;
}

function isAdminGeneral(user) {
  return up(user && user.role) === "ADMIN_GENERAL";
}

function isAdmin(user) {
  return up(user && user.role) === "ADMIN";
}

function isPermOrAloj(user) {
  const r = up(user && user.role);
  return r === "PERMISIONARIO" || r === "ALOJADO";
}

function periodoValido(p) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ""));
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// Columnas EXA (ejemplo)
// Ajustar según CSV real del sistema si cambia el formato.
const COLS = {
  MR: ["MR", "M.R.", "MATRIC.", "MATRICULA", "MAT"],
  GRADO: ["GRADO"],
  APELLIDO: ["APELLIDO Y NOMBRE", "APELLIDO Y NOMBRES", "APELLIDO"],
  VIVIENDA: ["VIVIENDA"],
  COD457: ["COD. 457", "CODIGO 457", "COD457", "COD_457", "457"],
  COD411: ["COD. 411", "CODIGO 411", "COD411", "COD_411", "411"],
};

function pickCol(row, names) {
  for (const k of names) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return "";
}

function toNum(v) {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function buildLiquidacionPatch({ tipo, loteId, cod457, cod411 }) {
  const patch = {};

  if (tipo === "PRINCIPAL") {
    patch.principal = {
      cod457: Number(cod457 || 0),
      cod411: Number(cod411 || 0),
    };
    patch["origen.lotePrincipalId"] = loteId;
    return patch;
  }

  if (tipo === "DESCUENTOS") {
    patch.descuentosParticulares = {
      cod457: Number(cod457 || 0),
      cod411: Number(cod411 || 0),
    };
    patch["origen.loteDescuentosId"] = loteId;
    return patch;
  }

  if (tipo === "REINTEGROS") {
    patch.reintegrosParticulares = {
      cod457: Number(cod457 || 0),
      cod411: Number(cod411 || 0),
    };
    patch["origen.loteReintegrosId"] = loteId;
    return patch;
  }

  if (tipo === "PARTICULARES") {
    patch.descuentosParticulares = {
      cod457: Number(cod457 || 0),
      cod411: Number(cod411 || 0),
    };
    patch["origen.loteParticularesId"] = loteId;
    return patch;
  }

  return patch;
}

function computeVista(liq) {
  const p = liq && liq.principal ? liq.principal : { cod457: 0, cod411: 0 };
  const r = liq && liq.reintegrosParticulares ? liq.reintegrosParticulares : { cod457: 0, cod411: 0 };

  const total457 = Number(p.cod457 || 0) - Number(r.cod457 || 0);
  const total411 = Number(p.cod411 || 0) - Number(r.cod411 || 0);

  const etiqueta = (n) => (n > 0 ? "DESCUENTO" : n < 0 ? "REINTEGRO" : "0");

  return {
    _id: liq._id,
    periodo: liq.periodo,
    apellidoNombre: liq.apellidoNombre || "",
    mr: liq.mr,
    principal: p,
    reintegros: r,
    total: {
      cod457: total457,
      cod411: total411,
      etiqueta457: etiqueta(total457),
      etiqueta411: etiqueta(total411),
    },
    estadoEntrega: liq.estadoEntrega,
  };
}

// ✅ FIX: resolve MR from DB because req.user is minimized (A5)
async function resolveMrFromDb(userId) {
  if (!userId) return "";

  // authRequired ya valida activo/bloqueado/archivado y tokenVersion,
  // pero acá necesitamos matricula (no viene en req.user por minimización A5).
  const dbUser = await User.findById(userId).select("_id role matricula activo bloqueado archivado").lean();
  if (!dbUser) return "";

  // Defensa en profundidad: si el usuario fue desactivado luego de autenticarse, fail-closed
  if (dbUser.activo === false || dbUser.bloqueado === true || dbUser.archivado === true) return "";

  // Solo PERMISIONARIO / ALOJADO pueden consumir /mis
  if (!isPermOrAloj(dbUser)) return "";

  return normMR(dbUser.matricula);
}

// ─────────────────────────────
// PERMISIONARIO / ALOJADO: mis liquidaciones

async function getUltimaMia(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "Recurso no disponible" });

    // ⚠️ req.user está minimizado (A5): no trae matricula.
    // Se obtiene desde DB para calcular MR y filtrar estrictamente "mis" liquidaciones.
    const mr = await resolveMrFromDb(user._id);
    if (!mr) return res.status(404).json({ message: "Recurso no disponible" });

    // Robustez: algunas liquidaciones históricas pueden no tener userId materializado.
    // Seguridad: el filtro sigue siendo por MR (identidad institucional) del usuario autenticado.
    const liq = await Liquidacion.findOne({
      mr,
      $or: [{ userId: user._id }, { userId: null }],
    })
      .sort({ periodo: -1 })
      .lean();

    if (!liq) return res.json({ liquidacion: null });

    return res.json({ liquidacion: computeVista(liq) });
  } catch (err) {
    console.error("[LIQUIDACIONES] Error ultima mia:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getHistorialMio(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "Recurso no disponible" });

    const mr = await resolveMrFromDb(user._id);
    if (!mr) return res.status(404).json({ message: "Recurso no disponible" });

    const list = await Liquidacion.find({
      mr,
      $or: [{ userId: user._id }, { userId: null }],
    })
      .sort({ periodo: -1 })
      .limit(24)
      .lean();

    return res.json({ liquidaciones: list.map(computeVista) });
  } catch (err) {
    console.error("[LIQUIDACIONES] Error historial mio:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// ADMIN / ADMIN_GENERAL: lectura global

async function getAdmin(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const periodo = safeStr(req.query.periodo);
    const mr = normMR(req.query.mr);
    const qSearch = safeStr(req.query.q);
    const estado = up(req.query.estado);

    const q = {};

    // últimos 12 meses por defecto
    const now = new Date();
    const minDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const minPeriodo = `${minDate.getFullYear()}-${String(
      minDate.getMonth() + 1
    ).padStart(2, "0")}`;

    q.periodo = { $gte: minPeriodo };

    // si viene período válido, pisa el rango automático
    if (periodo && periodoValido(periodo)) {
      q.periodo = periodo;
    }

    // filtro exacto por MR
    if (mr) {
      q.mr = mr;
    }

    // búsqueda libre por MR o apellidoNombre
    if (qSearch) {
      const rx = new RegExp(qSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      if (q.mr) {
        q.$or = [{ apellidoNombre: rx }];
      } else {
        q.$or = [{ mr: rx }, { apellidoNombre: rx }];
      }
    }

    // filtro por estado
    if (estado === "ENTREGADA") {
      q.estadoEntrega = "ENTREGADA";
    } else if (estado === "NO_ENTREGADA") {
      q.estadoEntrega = { $ne: "ENTREGADA" };
    }

    const list = await Liquidacion.find(q)
      .sort({ periodo: -1, apellidoNombre: 1, mr: 1 })
      .limit(500)
      .lean();

    return res.json({
      liquidaciones: list.map(computeVista),
    });
  } catch (err) {
    console.error("[LIQUIDACIONES] Error admin:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getAdminResumen(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const periodo = safeStr(req.query.periodo);
    const qSearch = safeStr(req.query.q);

    const results = [];

    // 🔹 FILTRO 12 MESES
    const now = new Date();
    const minDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const minPeriodo = `${minDate.getFullYear()}-${String(
      minDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // =========================
    // 1. LIQUIDACIONES
    // =========================
    const qLiq = {
      periodo: periodo || { $gte: minPeriodo },
    };

    const liquidaciones = await Liquidacion.find(qLiq).lean();

    for (const liq of liquidaciones) {
      results.push({
        tipoRegistro: "LIQUIDACION",

        periodo: liq.periodo,
        mr: liq.mr,
        apellidoNombre: liq.apellidoNombre || "",

        cod457:
          (liq.principal?.cod457 || 0) -
          (liq.reintegrosParticulares?.cod457 || 0),

        cod411:
          (liq.principal?.cod411 || 0) -
          (liq.reintegrosParticulares?.cod411 || 0),

        estado: liq.estadoEntrega || "ENTREGADA",

        lote: liq.origen?.loteParticularesId || null,
      });
    }

    // =========================
    // 2. PENDIENTES DE LOTES
    // =========================
    const qLote = {
      periodo: periodo || { $gte: minPeriodo },
    };

    const lotes = await LiquidacionLote.find(qLote).lean();

    for (const lote of lotes) {
      for (const p of lote.pendientes || []) {
        results.push({
          tipoRegistro: "PENDIENTE",

          periodo: lote.periodo,
          mr: p.mr || "",
          apellidoNombre: p.apellidoNombre || "",

          cod457: p.cod457 || 0,
          cod411: p.cod411 || 0,

          estado: p.motivo || "PENDIENTE",

          lote: lote._id,
        });
      }
    }

    // =========================
    // 3. FILTRO DE BUSQUEDA
    // =========================
    let final = results;

    if (qSearch) {
      const qLower = qSearch.toLowerCase();

      final = final.filter((r) => {
        return (
          String(r.mr || "").toLowerCase().includes(qLower) ||
          String(r.apellidoNombre || "").toLowerCase().includes(qLower)
        );
      });
    }

    // =========================
    // 4. ORDEN
    // =========================
    final.sort((a, b) => {
      if (a.periodo !== b.periodo) return b.periodo.localeCompare(a.periodo);
      return (a.apellidoNombre || "").localeCompare(b.apellidoNombre || "");
    });

    return res.json({ registros: final });
  } catch (err) {
    console.error("[LIQUIDACIONES] admin-resumen:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getAdminResumenPDF(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const periodo = safeStr(req.query.periodo);
    const qSearch = safeStr(req.query.q);

    const results = [];

    const now = new Date();
    const minDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const minPeriodo = `${minDate.getFullYear()}-${String(
      minDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // 🔹 LIQUIDACIONES
    const qLiq = {
      periodo: periodo || { $gte: minPeriodo },
    };

    const liquidaciones = await Liquidacion.find(qLiq).lean();

    for (const liq of liquidaciones) {
      results.push({
        tipoRegistro: "LIQUIDACION",
        periodo: liq.periodo,
        mr: liq.mr,
        apellidoNombre: liq.apellidoNombre || "",
        cod457:
          (liq.principal?.cod457 || 0) -
          (liq.reintegrosParticulares?.cod457 || 0),
        cod411:
          (liq.principal?.cod411 || 0) -
          (liq.reintegrosParticulares?.cod411 || 0),
        estado: liq.estadoEntrega || "ENTREGADA",
      });
    }

    // 🔹 LOTES (PENDIENTES)
    const qLote = {
      periodo: periodo || { $gte: minPeriodo },
    };

    const lotes = await LiquidacionLote.find(qLote).lean();

    for (const lote of lotes) {
      for (const p of lote.pendientes || []) {
        results.push({
          tipoRegistro: "PENDIENTE",
          periodo: lote.periodo,
          mr: p.mr || "",
          apellidoNombre: p.apellidoNombre || "",
          cod457: p.cod457 || 0,
          cod411: p.cod411 || 0,
          estado: p.motivo || "PENDIENTE",
        });
      }
    }

    // 🔹 BUSQUEDA
    let final = results;

    if (qSearch) {
      const qLower = qSearch.toLowerCase();
      final = final.filter(
        (r) =>
          String(r.mr || "").toLowerCase().includes(qLower) ||
          String(r.apellidoNombre || "").toLowerCase().includes(qLower)
      );
    }

    // 🔹 ORDEN
    final.sort((a, b) => {
      if (a.periodo !== b.periodo) return b.periodo.localeCompare(a.periodo);
      return (a.apellidoNombre || "").localeCompare(b.apellidoNombre || "");
    });

        // 🔹 PDF
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=liquidaciones_resumen.pdf"
    );

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 30;
    const top = 30;
    const bottom = 30;

    const cols = {
      periodo: { x: left, width: 60 },
      mr: { x: 95, width: 70 },
      nombre: { x: 170, width: 190 },
      cod457: { x: 365, width: 55 },
      cod411: { x: 425, width: 55 },
      estado: { x: 485, width: 220 },
      tipo: { x: 710, width: 70 },
    };

    function drawHeader() {
      doc.fontSize(16).font("Helvetica-Bold").text("Resumen de Liquidaciones", left, top, {
        align: "center",
        width: pageWidth - left * 2,
      });

      const headerY = top + 28;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Periodo", cols.periodo.x, headerY, { width: cols.periodo.width });
      doc.text("MR", cols.mr.x, headerY, { width: cols.mr.width });
      doc.text("Nombre", cols.nombre.x, headerY, { width: cols.nombre.width });
      doc.text("457", cols.cod457.x, headerY, { width: cols.cod457.width });
      doc.text("411", cols.cod411.x, headerY, { width: cols.cod411.width });
      doc.text("Estado", cols.estado.x, headerY, { width: cols.estado.width });
      doc.text("Tipo", cols.tipo.x, headerY, { width: cols.tipo.width });

      doc.moveTo(left, headerY + 14)
        .lineTo(pageWidth - left, headerY + 14)
        .stroke();

      return headerY + 20;
    }

    function rowHeight(r) {
      const nombre = String(r.apellidoNombre || "");
      const estado = String(r.estado || "");

      const hNombre = doc.heightOfString(nombre, {
        width: cols.nombre.width,
        align: "left",
      });

      const hEstado = doc.heightOfString(estado, {
        width: cols.estado.width,
        align: "left",
      });

      return Math.max(18, hNombre, hEstado) + 6;
    }

    let y = drawHeader();
    doc.font("Helvetica").fontSize(9);

    final.forEach((r) => {
      const h = rowHeight(r);

      if (y + h > pageHeight - bottom) {
        doc.addPage();
        y = drawHeader();
        doc.font("Helvetica").fontSize(9);
      }

      doc.text(String(r.periodo || ""), cols.periodo.x, y, {
        width: cols.periodo.width,
      });

      doc.text(String(r.mr || ""), cols.mr.x, y, {
        width: cols.mr.width,
      });

      doc.text(String(r.apellidoNombre || ""), cols.nombre.x, y, {
        width: cols.nombre.width,
      });

      doc.text(String(r.cod457 ?? 0), cols.cod457.x, y, {
        width: cols.cod457.width,
      });

      doc.text(String(r.cod411 ?? 0), cols.cod411.x, y, {
        width: cols.cod411.width,
      });

      doc.text(String(r.estado || ""), cols.estado.x, y, {
        width: cols.estado.width,
      });

      doc.text(String(r.tipoRegistro || ""), cols.tipo.x, y, {
        width: cols.tipo.width,
      });

      doc.moveTo(left, y + h - 3)
        .lineTo(pageWidth - left, y + h - 3)
        .strokeColor("#dddddd")
        .stroke();

      y += h;
    });

    doc.end();
  } catch (err) {
    console.error("[PDF] Error:", err);
    res.status(500).json({ message: "Error generando PDF" });
  }
}

// ─────────────────────────────
// Pendientes (lotes)

async function getPendientes(req, res) {
  try {
    const user = req.user;
    if (!user || !isAdminGeneral(user)) return res.status(404).json({ message: "Recurso no disponible" });

    const periodo = safeStr(req.query.periodo);
    if (!periodoValido(periodo)) return res.status(400).json({ message: "Periodo inválido" });

    const lotes = await LiquidacionLote.find({ periodo }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ lotes });
  } catch (err) {
    console.error("[LIQUIDACIONES] Error pendientes:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// Carga CSV (preview + confirmar) — mantiene estructura existente

async function previewCarga(req, res) {
  try {
    const user = req.user;
    if (!user || !isAdminGeneral(user)) return res.status(404).json({ message: "Recurso no disponible" });

    const periodo = safeStr(req.params.periodo);
    const tipo = up(req.params.tipo);

    if (!periodoValido(periodo)) return res.status(400).json({ message: "Periodo inválido" });
    if (!["PRINCIPAL", "DESCUENTOS", "REINTEGROS", "PARTICULARES"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo inválido" });
    }

    if (!req.file || !req.file.path) return res.status(400).json({ message: "Archivo requerido" });

    const sha = sha256File(req.file.path);

    const content = fs.readFileSync(req.file.path);
    const rows = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  delimiter: ";",
  bom: true,
});

    const pendientes = [];
    const duplicadas = new Set();
    const invalidas = [];

    let filas = 0;

  // 🔢 Obtener última versión para este período y tipo
const last = await LiquidacionLote.findOne({ periodo, tipo })
  .sort({ version: -1 })
  .select("version")
  .lean();

const nextVersion = last ? last.version + 1 : 1;

// Lote borrador
const retenerHasta = new Date();
retenerHasta.setFullYear(retenerHasta.getFullYear() + 1);

const lote = await LiquidacionLote.create({
  periodo,
  tipo,
  version: nextVersion, // 👈 CLAVE

  estado: "BORRADOR",
  cargadoPor: req.user?._id,
  retenerHasta,

  archivo: {
    originalName: req.file.originalname,
    storedName: path.basename(req.file.path),
    path: req.file.path,
    size: req.file.size,
    sha256: sha,
  },

  resumen: { filas: 0, asignadas: 0, pendientes: 0, duplicadas: 0, invalidas: 0 },
  pendientes: [],
});

    // Procesamiento básico (esto es "preview": no altera liquidaciones finales)
    const seen = new Set();

    for (const row of rows) {
      filas += 1;

      const mr = normMR(pickCol(row, COLS.MR));
      if (!mr) {
        invalidas.push({ fila: filas, motivo: "MR vacío" });
        continue;
      }

      const key = `${periodo}-${mr}`;
      if (seen.has(key)) {
        duplicadas.add(key);
        continue;
      }
      seen.add(key);

                 // En preview marcamos pendiente si no hay usuario por MR
      const u = await findUserByMatriculaFlexible(mr).catch(() => null);

      if (!u) {
        const apellidoNombre = safeStr(pickCol(row, COLS.APELLIDO));
        const vivienda = safeStr(pickCol(row, COLS.VIVIENDA));
        const grado = safeStr(pickCol(row, COLS.GRADO));
        const cod457 = toNum(pickCol(row, COLS.COD457));
        const cod411 = toNum(pickCol(row, COLS.COD411));

        pendientes.push({
          mr,
          apellidoNombre,
          vivienda,
          grado,
          cod457,
          cod411,
          motivo: "Sin usuario vinculado por matrícula",
          fila: filas,
        });
      }
    }

    lote.resumen = {
      filas,
      asignadas: filas - pendientes.length - invalidas.length - duplicadas.size,
      pendientes: pendientes.length,
      duplicadas: duplicadas.size,
      invalidas: invalidas.length,
    };
    lote.pendientes = pendientes;
    await lote.save();

    return res.json({
      loteId: String(lote._id),
      periodo,
      tipo,
      estado: lote.estado,
      resumen: lote.resumen,
      pendientesCount: pendientes.length,
      pendientes: lote.pendientes,
    });

  } catch (err) {
    console.error("[LIQUIDACIONES] Error preview:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function confirmarCarga(req, res) {
  try {
    const user = req.user;
    if (!user || !isAdminGeneral(user)) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const periodo = safeStr(req.params.periodo);
    const tipo = up(req.params.tipo);
    const loteId = safeStr(req.params.loteId || req.body.loteId);

    if (!periodoValido(periodo)) {
      return res.status(400).json({ message: "Periodo inválido" });
    }

    if (!["PRINCIPAL", "DESCUENTOS", "REINTEGROS", "PARTICULARES"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo inválido" });
    }

    if (!loteId) {
      return res.status(400).json({ message: "Lote requerido" });
    }

    const lote = await LiquidacionLote.findById(loteId);
    if (!lote) {
      return res.status(404).json({ message: "Lote no encontrado" });
    }

    if (String(lote.periodo) !== periodo || String(lote.tipo) !== tipo) {
      return res.status(400).json({ message: "El lote no coincide con período/tipo" });
    }

    if (lote.estado !== "BORRADOR") {
      return res.status(400).json({ message: "El lote no está en estado BORRADOR" });
    }

    if (!lote.archivo || !lote.archivo.path) {
      return res.status(400).json({ message: "El lote no tiene archivo asociado" });
    }

    const content = fs.readFileSync(lote.archivo.path);
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ";",
      bom: true,
    });

    const seen = new Set();

    let procesadas = 0;
    let creadas = 0;
    let actualizadas = 0;
    let omitidas = 0;
    const errores = [];

    for (const row of rows) {
      procesadas += 1;

      const mr = normMR(pickCol(row, COLS.MR));
      if (!mr) {
        omitidas += 1;
        continue;
      }

      const key = `${periodo}-${mr}`;
      if (seen.has(key)) {
        omitidas += 1;
        continue;
      }
      seen.add(key);

      const u = await findUserByMatriculaFlexible(mr).catch(() => null);
      if (!u) {
        omitidas += 1;
        continue;
      }

      const apellidoNombre = safeStr(pickCol(row, COLS.APELLIDO));
      const vivienda = safeStr(pickCol(row, COLS.VIVIENDA));
      const grado = safeStr(pickCol(row, COLS.GRADO));
      const cod457 = toNum(pickCol(row, COLS.COD457));
      const cod411 = toNum(pickCol(row, COLS.COD411));

      const baseSet = {
        periodo,
        mr,
        userId: u._id,
        apellidoNombre,
        vivienda,
        grado,
        estadoEntrega: "ENTREGADA",
        motivoPendiente: "",
        retenerHasta: lote.retenerHasta,
      };

      const patchByTipo = buildLiquidacionPatch({
        tipo,
        loteId: lote._id,
        cod457,
        cod411,
      });

      try {
        const existing = await Liquidacion.findOne({ periodo, mr }).select("_id").lean();

        await Liquidacion.updateOne(
          { periodo, mr },
          {
            $set: {
              ...baseSet,
              ...patchByTipo,
            },
          },
          { upsert: true }
        );

        if (existing) {
          actualizadas += 1;
        } else {
          creadas += 1;
        }
      } catch (err) {
        errores.push({
          mr,
          error: err.message,
        });
      }
    }

    lote.estado = "CONFIRMADO";
    await lote.save();

    return res.json({
      ok: true,
      loteId: String(lote._id),
      periodo,
      tipo,
      estado: lote.estado,
      resultado: {
        procesadas,
        creadas,
        actualizadas,
        omitidas,
        errores: errores.length,
      },
      detalleErrores: errores,
    });
  } catch (err) {
    console.error("[LIQUIDACIONES] Error confirmar:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cargarParticular(req, res) {
  try {
    const user = req.user;
    if (!user || !isAdminGeneral(user)) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const loteId = safeStr(req.body?.loteId);
    const mrOriginal = normMR(req.body?.mrOriginal);
    const mrCorregido = normMR(req.body?.mrCorregido);
    const fila = Number(req.body?.fila);

    if (!loteId) return res.status(400).json({ message: "loteId requerido" });
    if (!mrCorregido) return res.status(400).json({ message: "MR corregido requerido" });
    if (!Number.isFinite(fila)) return res.status(400).json({ message: "fila requerida" });

    const lote = await LiquidacionLote.findById(loteId);
    if (!lote) return res.status(404).json({ message: "Lote no encontrado" });

    const pendientes = Array.isArray(lote.pendientes) ? lote.pendientes : [];

    const idx = pendientes.findIndex((p) => {
      const mismaFila = Number(p?.fila) === fila;
      const mismoMr = mrOriginal ? normMR(p?.mr) === mrOriginal : true;
      return mismaFila && mismoMr;
    });

    if (idx < 0) {
      return res.status(404).json({ message: "Pendiente no encontrado en el lote" });
    }

    const usuario = await findUserByMatriculaFlexible(mrCorregido);

if (!usuario) {
  return res.status(400).json({ message: "No existe un usuario con la matrícula indicada" });
}

// 📦 pendiente actual
const pendiente = pendientes[idx];

// 📅 retención (1 año)
const retenerHasta = new Date();
retenerHasta.setFullYear(retenerHasta.getFullYear() + 1);

// 🧾 Crear liquidación REAL alineada al schema
const patch = buildLiquidacionPatch({
  tipo: lote.tipo,
  loteId: lote._id,
  cod457: pendiente?.cod457,
  cod411: pendiente?.cod411,
});

await Liquidacion.updateOne(
  { periodo: lote.periodo, mr: mrCorregido },
  {
    $set: {
      periodo: lote.periodo,
      mr: mrCorregido,
      userId: usuario._id,

      grado: pendiente?.grado || "",
      apellidoNombre: pendiente?.apellidoNombre || "",
      vivienda: pendiente?.vivienda || "",

      estadoEntrega: "ENTREGADA",
      motivoPendiente: "",
      retenerHasta,

      ...patch,
    },
  },
  { upsert: true }
);

const liq = await Liquidacion.findOne({
  periodo: lote.periodo,
  mr: mrCorregido,
})
  .select("_id")
  .lean();
    return res.json({
  message: "Pendiente resuelto y liquidación creada",
  loteId: String(lote._id),
  resumen: lote.resumen,
  pendientes: lote.pendientes || [],
  liquidacionId: liq ? String(liq._id) : null,
  usuarioVinculado: {
    _id: String(usuario._id),
    matricula: usuario.matricula,
    nombre: usuario.nombre || "",
    apellido: usuario.apellido || "",
  },
});

  } catch (err) {
    console.error("[LIQUIDACIONES] Error particular:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}
module.exports = {
  previewCarga,
  confirmarCarga,
  cargarParticular,
  getUltimaMia,
  getHistorialMio,
  getAdmin,
  getPendientes,
  getAdminResumen,
  getAdminResumenPDF,
};
