// backend/controllers/serviciosController.js
// MIS SERVICIOS — carga CSV institucional (viviendaCodigo + periodo + DPE/CAMUZZI/DPOSS + MONTO*3)
// Seguridad: Fail-Closed + No-Disclosure (respuestas opacas)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");

const Vivienda = require("../models/vivienda");
const { ServicioVivienda } = require("../models/ServicioVivienda");

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function safeStr(v) {
  return String(v || "").trim();
}

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function deny(res) {
  // No-Disclosure + Fail-Closed
  return res.status(404).json({ message: "Recurso no disponible" });
}

function badRequest(res) {
  // Opaco
  return res.status(400).json({ message: "Solicitud inválida" });
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}
function isAdmin(user) {
  return up(user?.role) === "ADMIN";
}
function isPerm(user) {
  return up(user?.role) === "PERMISIONARIO";
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function detectDelimiter(text) {
  const firstLine = (text || "").split(/\r?\n/)[0] || "";
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function normalizeHeader(h) {
  return up(String(h || "").replace("\ufeff", "").replace(/\u200b/g, "").trim());
}

// período institucional: "2026_01" -> "2026-01"
function normalizePeriodo(raw) {
  const s = safeStr(raw);
  if (!s) return "";
  return s.replace("_", "-");
}
function periodoValido(p) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ""));
}

// Renombrar MONTO repetidos según la columna previa (DPE/CAMUZZI/DPOSS)
function columnsInstitutional(headers) {
  const out = [];
  let prev = "";
  for (const h of headers) {
    const H = normalizeHeader(h);

    if (H === "MONTO") {
      if (prev === "DPE") out.push("MONTO_DPE");
      else if (prev === "CAMUZZI") out.push("MONTO_CAMUZZI");
      else if (prev === "DPOSS") out.push("MONTO_DPOSS");
      else out.push("MONTO");
    } else {
      out.push(H);
      prev = H;
    }
  }
  return out;
}

function toNumOrNull(v) {
  const s = safeStr(v);
  if (!s) return null;

  let t = s.replace(/\$/g, "").trim();

  // "1.000,00" => "1000.00"
  if (t.includes(".") && t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(",", ".");
  }
  t = t.replace(/\s+/g, "");

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Fuente de verdad: Vivienda.ocupacionActual.permisionario
async function resolveViviendaOcupadaByUserId(userId) {
  return Vivienda.findOne({
    estado: "OCUPADA",
    "ocupacionActual.permisionario": userId,
  }).lean();
}

// ─────────────────────────────
// ADMIN / ADMIN_GENERAL
// POST /api/servicios/cargar-csv
async function cargarCsv(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) return deny(res);

    if (!req.file || !req.file.path) return badRequest(res);

    const filePath = req.file.path;
    const sha = sha256File(filePath);

    const contentText = fs.readFileSync(filePath, "utf8");
    const delimiter = detectDelimiter(contentText);

    let rows = [];
    try {
      rows = parse(contentText, {
        columns: (headers) => columnsInstitutional(headers),
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter,
        relax_quotes: true,
        relax_column_count: true,
      });
    } catch (e) {
      console.error("[SERVICIOS] CSV inválido (parse):", e?.code || e?.message || e);
      return badRequest(res);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return badRequest(res);
    }

    // Validación mínima del formato institucional
    const sampleKeys = Object.keys(rows[0] || {});
    const must = [
      "VIVIENDACODIGO",
      "PERIODO",
      "DPE",
      "MONTO_DPE",
      "CAMUZZI",
      "MONTO_CAMUZZI",
      "DPOSS",
      "MONTO_DPOSS",
    ];
    const ok = must.every((k) => sampleKeys.includes(k));
    if (!ok) {
      return badRequest(res);
    }

    const now = new Date();

    let filas = 0;
    let creadas = 0;
    let pendientes = 0;
    let invalidas = 0;
    let duplicadas = 0;

    for (const row of rows) {
      filas += 1;

      const viviendaCodigo = up(row.VIVIENDACODIGO);
      const periodo = normalizePeriodo(row.PERIODO);

      if (!viviendaCodigo || !periodoValido(periodo)) {
        invalidas += 1;
        continue;
      }

      // Referencias institucionales (número de servicio por empresa)
      const referenciasInstitucionales = {
        dpeNumeroServicio: safeStr(row.DPE),
        camuzziNumeroServicio: safeStr(row.CAMUZZI),
        dpossNumeroServicio: safeStr(row.DPOSS),
      };

      // Montos institucionales -> modelo funcional
      const electricidad = toNumOrNull(row.MONTO_DPE);
      const gas = toNumOrNull(row.MONTO_CAMUZZI);
      const agua = toNumOrNull(row.MONTO_DPOSS);

      const servicios = {
        electricidad,
        agua,
        gas,
      };

      // Observaciones opcionales (si el CSV no trae, queda vacío)
      const observaciones = safeStr(row.OBSERVACIONES || row.OBSERVACION || row.OBS || "");

      // Validación: vivienda por código institucional
      const viv = await Vivienda.findOne({ codigo: viviendaCodigo }).lean().catch(() => null);

      let estadoVivienda = { ocupada: false, usuarioId: null };
      let requiereAdministracion = false;

      if (!viv) {
        requiereAdministracion = true;
      } else {
        const ocupada = up(viv.estado) === "OCUPADA" && viv?.ocupacionActual?.permisionario;
        if (ocupada) {
          estadoVivienda = { ocupada: true, usuarioId: viv.ocupacionActual.permisionario };
        } else {
          requiereAdministracion = true;
        }
      }

      // ✅ Anti-duplicado (mismo sha + periodo + vivienda)
      const yaExiste = await ServicioVivienda.findOne({
        viviendaCodigo,
        periodo,
        "archivo.sha256": sha,
      }).lean();

      if (yaExiste) {
        duplicadas += 1;
        continue;
      }

      await ServicioVivienda.create({
        viviendaCodigo,
        periodo,
        fechaCarga: now,

        servicios,
        referenciasInstitucionales,
        observaciones,

        estadoVivienda,
        requiereAdministracion,
        alertaActiva: true,

        leidoPorUsuario: false,
        fechaLectura: null,

        fueCorregido: false,
        correcciones: [],

        creadoPor: { userId: user._id, role: user.role },
        creadoEn: now,

        // ✅ Evidencia del archivo (auditoría)
        archivo: {
          originalName: safeStr(req.file.originalname),
          storedName: path.basename(filePath),
          size: Number(req.file.size || 0),
          sha256: sha,
          delimiter,
        },
      });

      creadas += 1;
      if (requiereAdministracion) pendientes += 1;
    }

    return res.status(201).json({
      ok: true,
      archivo: {
        originalName: safeStr(req.file.originalname),
        storedName: path.basename(filePath),
        size: req.file.size,
        sha256: sha,
        delimiter,
      },
      resumen: { filas, creadas, pendientes, invalidas, duplicadas },
    });
  } catch (err) {
    console.error("[SERVICIOS] Error cargarCsv:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/servicios/admin/pendientes
async function listarPendientesAdmin(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) return deny(res);

    const items = await ServicioVivienda.find({ requiereAdministracion: true })
      .sort({ fechaCarga: -1 })
      .limit(500)
      .lean();

    return res.json({ items });
  } catch (err) {
    console.error("[SERVICIOS] Error pendientes:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/servicios/admin/listado?estado=all|leidos|noleidos&vivienda=AB-401
async function listarAdminListado(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) return deny(res);

    const estado = String(req.query?.estado || "all").toLowerCase().trim();
    const vivienda = up(req.query?.vivienda || "");

    const q = {};
    if (vivienda) q.viviendaCodigo = vivienda;

    if (estado === "leidos") {
      q.leidoPorUsuario = true;
    } else if (estado === "noleidos") {
      q.leidoPorUsuario = { $ne: true };
    } else if (estado === "all") {
      // sin filtro
    } else {
      return badRequest(res);
    }

    const items = await ServicioVivienda.find(q)
      .sort({ fechaCarga: -1 })
      .limit(1000)
      .lean();

    return res.json({ items });
  } catch (err) {
    console.error("[SERVICIOS] Error admin listado:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/servicios/vivienda/:codigo/historico
async function historicoPorViviendaCodigo(req, res) {
  try {
    const user = req.user;
    if (!user || (!isAdminGeneral(user) && !isAdmin(user))) return deny(res);

    const codigo = up(req.params?.codigo);
    if (!codigo) return deny(res);

    const items = await ServicioVivienda.find({ viviendaCodigo: codigo })
      .sort({ periodo: -1, fechaCarga: -1 })
      .limit(2000)
      .lean();

    return res.json({ items });
  } catch (err) {
    console.error("[SERVICIOS] Error historico:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// PATCH /api/servicios/:id/corregir  (SOLO ADMIN_GENERAL)
async function corregirServicio(req, res) {
  try {
    const user = req.user;
    if (!user || !isAdminGeneral(user)) return deny(res);

    const id = req.params?.id;
    if (!isObjectId(id)) return deny(res);

    const body = req.body || {};
    const observaciones = safeStr(body.observaciones);
    if (!observaciones) return badRequest(res);

    const doc = await ServicioVivienda.findById(id);
    if (!doc) return deny(res);

    const s = body.servicios && typeof body.servicios === "object" ? body.servicios : null;
    if (s) {
      const sanitize = (v) => (v === null || v === undefined || v === "" ? null : toNumOrNull(v));
      doc.servicios = {
        electricidad: sanitize(s.electricidad),
        agua: sanitize(s.agua),
        gas: sanitize(s.gas),
      };
    }

    const r =
      body.referenciasInstitucionales && typeof body.referenciasInstitucionales === "object"
        ? body.referenciasInstitucionales
        : null;
    if (r) {
      doc.referenciasInstitucionales = {
        dpeNumeroServicio: safeStr(r.dpeNumeroServicio),
        camuzziNumeroServicio: safeStr(r.camuzziNumeroServicio),
        dpossNumeroServicio: safeStr(r.dpossNumeroServicio),
      };
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");

    const leyendaAuto = `Corrección realizada por Órgano Administrador el día ${dd}/${mm}/${yyyy} a ${hh}:${mi} hs`;
    const descripcionExtra = safeStr(body.descripcion || "");
    const descripcion = descripcionExtra ? `${leyendaAuto}. ${descripcionExtra}` : `${leyendaAuto}.`;

    doc.observaciones = observaciones;
    doc.fueCorregido = true;
    doc.correcciones.push({
      fecha: now,
      actorId: user._id,
      actorRole: user.role,
      descripcion,
    });

    // Re-activar alerta y “no leído” para nuevo ocupante también (histórico)
    doc.alertaActiva = true;
    doc.leidoPorUsuario = false;
    doc.fechaLectura = null;

    await doc.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error("[SERVICIOS] Error corregir:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// PERMISIONARIO
// GET /api/servicios/mis-servicios
async function misServicios(req, res) {
  try {
    const user = req.user;
    if (!user || !isPerm(user)) return deny(res);

    const viv = await resolveViviendaOcupadaByUserId(user._id);
    if (!viv?.codigo) return deny(res);

    const codigo = up(viv.codigo);

    const items = await ServicioVivienda.find({ viviendaCodigo: codigo })
      .sort({ periodo: -1, fechaCarga: -1 })
      .limit(2000)
      .lean();

    return res.json({ viviendaCodigo: codigo, items });
  } catch (err) {
    console.error("[SERVICIOS] Error misServicios:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// PATCH /api/servicios/:id/marcar-leido
async function marcarLeido(req, res) {
  try {
    const user = req.user;
    if (!user || !isPerm(user)) return deny(res);

    const id = req.params?.id;
    if (!isObjectId(id)) return deny(res);

    const viv = await resolveViviendaOcupadaByUserId(user._id);
    if (!viv?.codigo) return deny(res);

    const codigo = up(viv.codigo);

    const doc = await ServicioVivienda.findOne({ _id: id, viviendaCodigo: codigo });
    if (!doc) return deny(res);

    doc.leidoPorUsuario = true;
    doc.fechaLectura = new Date();
    doc.alertaActiva = false;

    await doc.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error("[SERVICIOS] Error marcarLeido:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/servicios/:id/pdf
async function pdfServicio(req, res) {
  try {
    const user = req.user;

    const isAdminLike = user && (isAdminGeneral(user) || isAdmin(user));
    const isPermLike = user && isPerm(user);

    // Solo ADMIN/ADMIN_GENERAL o PERMISIONARIO
    if (!isAdminLike && !isPermLike) return deny(res);

    const id = req.params?.id;
    if (!isObjectId(id)) return deny(res);

    // Caso ADMIN / ADMIN_GENERAL: puede descargar por id (no disclosure si no existe)
    if (isAdminLike) {
      const docDb = await ServicioVivienda.findById(id).lean();
      if (!docDb) return deny(res);

      // Headers hardening
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="servicios-${docDb.periodo}-${docDb.viviendaCodigo}.pdf"`
      );
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; frame-ancestors 'none'");
      res.setHeader("X-Frame-Options", "DENY");

      const pdf = new PDFDocument({ size: "A4", margin: 40 });
      pdf.pipe(res);

      pdf.fontSize(16).text("MIS SERVICIOS", { align: "center" });
      pdf.moveDown(1);

      pdf.fontSize(11).text(`Vivienda: ${docDb.viviendaCodigo}`);
      pdf.text(`Período: ${docDb.periodo}`);
      pdf.text(`Fecha de carga: ${new Date(docDb.fechaCarga).toLocaleString("es-AR")}`);
      pdf.moveDown(1);

      const ref = docDb.referenciasInstitucionales || {};
      if (ref.dpeNumeroServicio || ref.camuzziNumeroServicio || ref.dpossNumeroServicio) {
        pdf.fontSize(10).text("Referencias institucionales:", { underline: true });
        if (ref.dpeNumeroServicio) pdf.fontSize(10).text(`DPE: ${ref.dpeNumeroServicio}`);
        if (ref.camuzziNumeroServicio) pdf.fontSize(10).text(`CAMUZZI: ${ref.camuzziNumeroServicio}`);
        if (ref.dpossNumeroServicio) pdf.fontSize(10).text(`DPOSS: ${ref.dpossNumeroServicio}`);
        pdf.moveDown(1);
      }

      pdf.fontSize(12).text("Importes", { underline: true });
      pdf.moveDown(0.5);

      const s = docDb.servicios || {};
      pdf.fontSize(11).text(`Electricidad (DPE): ${s.electricidad ?? "-"}`);
      pdf.text(`Gas (CAMUZZI): ${s.gas ?? "-"}`);
      pdf.text(`Agua (DPOSS): ${s.agua ?? "-"}`);

      if (docDb.observaciones) {
        pdf.moveDown(1);
        pdf.fontSize(10).text("Observaciones:", { underline: true });
        pdf.fontSize(10).text(docDb.observaciones);
      }

      pdf.end();
      return;
    }

    // Caso PERMISIONARIO: debe ocupar la vivienda del registro
    const viv = await resolveViviendaOcupadaByUserId(user._id);
    if (!viv?.codigo) return deny(res);

    const docDb = await ServicioVivienda.findOne({ _id: id, viviendaCodigo: up(viv.codigo) }).lean();
    if (!docDb) return deny(res);

    // Headers hardening
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="servicios-${docDb.periodo}-${docDb.viviendaCodigo}.pdf"`
    );
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; frame-ancestors 'none'");
    res.setHeader("X-Frame-Options", "DENY");

    const pdf = new PDFDocument({ size: "A4", margin: 40 });
    pdf.pipe(res);

    pdf.fontSize(16).text("MIS SERVICIOS", { align: "center" });
    pdf.moveDown(1);

    pdf.fontSize(11).text(`Vivienda: ${docDb.viviendaCodigo}`);
    pdf.text(`Período: ${docDb.periodo}`);
    pdf.text(`Fecha de carga: ${new Date(docDb.fechaCarga).toLocaleString("es-AR")}`);
    pdf.moveDown(1);

    const ref = docDb.referenciasInstitucionales || {};
    if (ref.dpeNumeroServicio || ref.camuzziNumeroServicio || ref.dpossNumeroServicio) {
      pdf.fontSize(10).text("Referencias institucionales:", { underline: true });
      if (ref.dpeNumeroServicio) pdf.fontSize(10).text(`DPE: ${ref.dpeNumeroServicio}`);
      if (ref.camuzziNumeroServicio) pdf.fontSize(10).text(`CAMUZZI: ${ref.camuzziNumeroServicio}`);
      if (ref.dpossNumeroServicio) pdf.fontSize(10).text(`DPOSS: ${ref.dpossNumeroServicio}`);
      pdf.moveDown(1);
    }

    pdf.fontSize(12).text("Importes", { underline: true });
    pdf.moveDown(0.5);

    const s = docDb.servicios || {};
    pdf.fontSize(11).text(`Electricidad (DPE): ${s.electricidad ?? "-"}`);
    pdf.text(`Gas (CAMUZZI): ${s.gas ?? "-"}`);
    pdf.text(`Agua (DPOSS): ${s.agua ?? "-"}`);

    if (docDb.observaciones) {
      pdf.moveDown(1);
      pdf.fontSize(10).text("Observaciones:", { underline: true });
      pdf.fontSize(10).text(docDb.observaciones);
    }

    pdf.end();
  } catch (err) {
    console.error("[SERVICIOS] Error pdf:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  cargarCsv,
  listarPendientesAdmin,
  listarAdminListado,
  historicoPorViviendaCodigo,
  corregirServicio,
  misServicios,
  marcarLeido,
  pdfServicio,
};
