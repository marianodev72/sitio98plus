// backend/controllers/mantenimientoController.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { Mantenimiento } = require("../models/Mantenimiento");

// ✅ Carga robusta de Vivienda (case/export tolerant)
let Vivienda = null;
try {
  // 1) Preferido (minúscula)
  const mod = require("../models/vivienda");
  Vivienda = mod?.Vivienda || mod || null;
} catch (_) {
  try {
    // 2) Alternativo (mayúscula)
    const mod2 = require("../models/Vivienda");
    Vivienda = mod2?.Vivienda || mod2 || null;
  } catch (_) {
    Vivienda = null;
  }
}

// Si existe en tu repo, se usa. Si no, se ignora sin romper.
let refreshUserPrivileges = null;
try {
  refreshUserPrivileges = require("../middleware/refreshUserPrivileges").refreshUserPrivileges;
} catch (_) {}

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function isPermisionario(req) {
  return up(req.user?.role) === "PERMISIONARIO";
}

function hasPerm(req, perm) {
  const list = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
  return list.map(up).includes(up(perm));
}

/**
 * ✅ Diseño institucional:
 * INSPECTOR no es un rol; es un PERMISO sobre PERMISIONARIO.
 * No dependemos de role === "INSPECTOR".
 */
function isInspector(req) {
  return hasPerm(req, "INSPECTOR");
}

function isAdminGeneral(req) {
  return up(req.user?.role) === "ADMIN_GENERAL";
}

// Respuesta opaca (no disclosure)
function deny(res, code = "DENY") {
  try {
    console.warn("[MIS-MANTENIMIENTOS][DENY]", code);
  } catch (_) {}
  return res.status(404).json({ message: "Recurso no disponible" });
}

function fail(res) {
  return res.status(400).json({ message: "No es posible procesar su solicitud" });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function safeFilename(name) {
  return String(name || "documento.pdf").replace(/[/\\"]/g, "_");
}

function safePdfHeaders(res, disposition, filename) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Disposition", `${disposition}; filename="${safeFilename(filename)}"`);
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("X-Frame-Options", "DENY");
}

// --------- Storage root (tiene que coincidir con crear)
function storageRoot() {
  // mismo root que usás hoy en crear()
  return path.join(__dirname, "..", "storage", "mis-mantenimientos");
}
function canonicalPathForFileId(fileId) {
  const root = storageRoot();
  const full = path.join(root, `${fileId}.pdf`);
  const resolvedRoot = path.resolve(root);
  const resolvedFull = path.resolve(full);

  // Anti traversal
  if (!resolvedFull.startsWith(resolvedRoot + path.sep)) return null;
  return resolvedFull;
}
function resolveReadablePath(p) {
  if (!p) return null;
  try {
    const rp = path.resolve(String(p));
    const rr = path.resolve(storageRoot());
    // anti traversal: solo permitimos dentro del root
    if (!rp.startsWith(rr + path.sep)) return null;
    if (!fs.existsSync(rp)) return null;
    return rp;
  } catch {
    return null;
  }
}

// --- PERMISIONARIO ---
// GET /api/mis-mantenimientos
async function listarMis(req, res) {
  try {
    if (!isPermisionario(req)) return deny(res, "LISTAR_MIS_NOT_PERMISIONARIO");

    const items = await Mantenimiento.find({ permisionarioId: String(req.user._id) })
      .sort({ submittedAt: -1 })
      .lean();

    return res.json({ mantenimientos: items });
  } catch {
    return fail(res);
  }
}

// POST /api/mis-mantenimientos (multipart)
async function crear(req, res) {
  try {
    if (!isPermisionario(req)) return deny(res, "CREAR_NOT_PERMISIONARIO");

    // Territorialidad: vivienda obligatoria para el módulo
    const viviendaId = req.user?.viviendaAsignada;
    const barrio = String(req.user?.barrioAsignado || "").trim();
    if (!viviendaId || !barrio) return deny(res, "CREAR_SIN_TERRITORIALIDAD");

    const tipo = String(req.body?.tipoMantenimiento || "").trim();
    const tecnico = String(req.body?.tecnicoInterviniente || "").trim();

    const allowed = new Set([
      "MANTENIMIENTO_ARTEFACTOS_A_GAS",
      "SISTEMA_DE_CALEFACCION_POR_CALDERA",
      "DESAGUES",
      "OTROS",
    ]);
    if (!allowed.has(tipo)) return fail(res);
    if (tecnico.length > 200) return fail(res);

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return fail(res);
    if (files.length > 6) return fail(res);

    // Guardado seguro
    const root = storageRoot();
    ensureDir(root);

    const saved = [];

    for (const f of files) {
      const mimetype = String(f.mimetype || "");
      const orig = String(f.originalname || "documento.pdf");
      if (mimetype !== "application/pdf") return fail(res);

      const fileId = crypto.randomUUID();
      const dest = canonicalPathForFileId(fileId);
      if (!dest) return fail(res);

      if (f.path && fs.existsSync(f.path)) {
        fs.copyFileSync(f.path, dest);
      } else if (f.buffer) {
        fs.writeFileSync(dest, f.buffer);
      } else {
        return fail(res);
      }

      const digest = sha256File(dest);

      saved.push({
        fileId,
        nombre: orig,
        mimetype,
        size: Number(f.size || fs.statSync(dest).size || 0),
        path: dest,
        sha256: digest,
      });
    }

    // ✅ ViviendaDisplay institucional, con fallback seguro
    let viviendaDisplay = String(viviendaId || "");
    try {
      if (Vivienda && viviendaId) {
        const v = await Vivienda.findById(viviendaId).select("codigo").lean();
        if (v?.codigo) viviendaDisplay = String(v.codigo);
      }
    } catch (_) {
      // fallback intencional: mantener viviendaId para no romper validaciones
    }

    const permisionarioDisplay =
      `${String(req.user?.apellido || "").trim()} ${String(req.user?.nombre || "").trim()}`.trim() ||
      "Permisionario";

    const doc = await Mantenimiento.create({
      viviendaId: String(viviendaId),
      viviendaDisplay,
      barrio,
      permisionarioId: String(req.user._id),
      permisionarioDisplay,
      tipoMantenimiento: tipo,
      tecnicoInterviniente: tecnico,
      archivos: saved,
      intervenciones: [
        {
          actorId: String(req.user._id),
          actorRole: up(req.user.role),
          actorNombre: permisionarioDisplay,
          accion: "CREACION",
          resultado: "PENDIENTE",
          fecha: new Date(),
        },
      ],
    });

    return res.status(201).json({ mantenimiento: doc });
  } catch {
    return fail(res);
  }
}

// GET /api/mis-mantenimientos/:id
async function detalle(req, res) {
  try {
    const id = String(req.params.id || "");
    if (!id) return deny(res, "DETALLE_SIN_ID");

    const item = await Mantenimiento.findById(id).lean();
    if (!item) return deny(res, "DETALLE_NO_EXISTE");

    if (isPermisionario(req) && String(item.permisionarioId) !== String(req.user._id)) {
      return deny(res, "DETALLE_DENY_PERMISIONARIO");
    }

    if (isInspector(req)) {
      const b = String(req.user?.barrioAsignado || "").trim();
      if (!b || up(b) !== up(item.barrio)) return deny(res, "DETALLE_DENY_INSPECTOR_BARRIO");
    }

    if (!(isPermisionario(req) || isInspector(req) || isAdminGeneral(req))) {
      return deny(res, "DETALLE_DENY_ROLE");
    }

    const safe = {
      ...item,
      archivos: (item.archivos || []).map((a) => ({
        fileId: a.fileId,
        nombre: a.nombre,
        mimetype: a.mimetype,
        size: a.size,
      })),
    };

    return res.json({ mantenimiento: safe });
  } catch {
    return fail(res);
  }
}

// --- INSPECTOR ---
async function listarBarrioInspector(req, res) {
  try {
    if (!isInspector(req)) return deny(res, "LISTAR_INSPECTOR_NO_PERMISO");

    const barrio = String(req.user?.barrioAsignado || "").trim();
    if (!barrio) return deny(res, "LISTAR_INSPECTOR_SIN_BARRIO");

    const items = await Mantenimiento.find({ barrio }).sort({ submittedAt: -1 }).lean();

    const safe = items.map((it) => ({
      ...it,
      archivos: (it.archivos || []).map((a) => ({
        fileId: a.fileId,
        nombre: a.nombre,
        mimetype: a.mimetype,
        size: a.size,
      })),
    }));

    return res.json({ mantenimientos: safe });
  } catch {
    return fail(res);
  }
}

async function decisionInspector(req, res) {
  try {
    if (!isInspector(req)) return deny(res, "DECISION_INSPECTOR_NO_PERMISO");

    const id = String(req.params.id || "");
    const decision = up(req.body?.decision);
    if (!id) return deny(res, "DECISION_INSPECTOR_SIN_ID");
    if (!(decision === "SI" || decision === "NO")) return fail(res);

    const barrio = String(req.user?.barrioAsignado || "").trim();
    if (!barrio) return deny(res, "DECISION_INSPECTOR_SIN_BARRIO");

    const item = await Mantenimiento.findById(id);
    if (!item) return deny(res, "DECISION_INSPECTOR_NO_EXISTE");
    if (up(item.barrio) !== up(barrio)) return deny(res, "DECISION_INSPECTOR_DENY_BARRIO");

    if (item.isClosed) return deny(res, "DECISION_INSPECTOR_CERRADO");

    item.inspectorDecision = decision;

    item.intervenciones.push({
      actorId: String(req.user._id),
      actorRole: up(req.user.role),
      actorNombre: "",
      accion: "DECISION_INSPECTOR",
      resultado: decision,
      fecha: new Date(),
    });

    await item.save();
    return res.json({ ok: true });
  } catch {
    return fail(res);
  }
}

// --- ADMIN GENERAL ---
async function listarAdminGeneral(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res, "LISTAR_ADMIN_NO_ROLE");

    const q = {};
    const barrio = String(req.query?.barrio || "").trim();
    const vivienda = String(req.query?.vivienda || "").trim();
    const permisionario = String(req.query?.permisionario || "").trim();

    const inspectorDecision = up(req.query?.inspectorDecision || "");
    const adminDecision = up(req.query?.adminDecision || "");
    const isClosedRaw = String(req.query?.isClosed || "").trim();

    if (barrio) q.barrio = barrio;
    if (vivienda) q.viviendaDisplay = new RegExp(vivienda.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (permisionario) {
      q.permisionarioDisplay = new RegExp(
        permisionario.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
    }

    if (inspectorDecision === "SI" || inspectorDecision === "NO" || inspectorDecision === "PENDIENTE") {
      q.inspectorDecision = inspectorDecision;
    }
    if (adminDecision === "SI" || adminDecision === "NO" || adminDecision === "PENDIENTE") {
      q.adminDecision = adminDecision;
    }
    if (isClosedRaw === "true") q.isClosed = true;
    if (isClosedRaw === "false") q.isClosed = false;

    const items = await Mantenimiento.find(q).sort({ submittedAt: -1 }).lean();

    const safe = items.map((it) => ({
      ...it,
      archivos: (it.archivos || []).map((a) => ({
        fileId: a.fileId,
        nombre: a.nombre,
        mimetype: a.mimetype,
        size: a.size,
      })),
    }));

    return res.json({ mantenimientos: safe });
  } catch {
    return fail(res);
  }
}

async function decisionAdminGeneral(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res, "DECISION_ADMIN_NO_ROLE");

    const id = String(req.params.id || "");
    const decision = up(req.body?.decision);
    if (!id) return deny(res, "DECISION_ADMIN_SIN_ID");
    if (!(decision === "SI" || decision === "NO")) return fail(res);

    const item = await Mantenimiento.findById(id);
    if (!item) return deny(res, "DECISION_ADMIN_NO_EXISTE");

    if (item.isClosed) return deny(res, "DECISION_ADMIN_CERRADO");

    item.adminDecision = decision;

    item.intervenciones.push({
      actorId: String(req.user._id),
      actorRole: up(req.user.role),
      actorNombre: "",
      accion: "DECISION_ADMIN_GENERAL",
      resultado: decision,
      fecha: new Date(),
    });

    await item.save();
    return res.json({ ok: true });
  } catch {
    return fail(res);
  }
}

async function cierreAdminGeneral(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res, "CIERRE_ADMIN_NO_ROLE");

    const id = String(req.params.id || "");
    if (!id) return deny(res, "CIERRE_ADMIN_SIN_ID");

    const item = await Mantenimiento.findById(id);
    if (!item) return deny(res, "CIERRE_ADMIN_NO_EXISTE");

    if (item.isClosed) return deny(res, "CIERRE_ADMIN_YA_CERRADO");

    if (up(item.adminDecision) !== "SI") return fail(res);

    item.isClosed = true;

    item.intervenciones.push({
      actorId: String(req.user._id),
      actorRole: up(req.user.role),
      actorNombre: "",
      accion: "CIERRE_ADMIN_GENERAL",
      resultado: "CERRADO",
      fecha: new Date(),
    });

    await item.save();
    return res.json({ ok: true });
  } catch {
    return fail(res);
  }
}

// --- ARCHIVOS: download/preview ---
async function previewArchivo(req, res) {
  return servirArchivo(req, res, "inline");
}
async function downloadArchivo(req, res) {
  return servirArchivo(req, res, "attachment");
}

async function servirArchivo(req, res, disposition) {
  try {
    const id = String(req.params.id || "");
    const fileId = String(req.params.fileId || "");
    if (!id || !fileId) return deny(res, "ARCH_SIN_ID_O_FILEID");

    const item = await Mantenimiento.findById(id).lean();
    if (!item) return deny(res, "ARCH_NO_MANTENIMIENTO");

    if (isInspector(req)) {
      const b = String(req.user?.barrioAsignado || "").trim();
      if (!b || up(b) !== up(item.barrio)) return deny(res, "ARCH_DENY_INSPECTOR_BARRIO");
    } else if (isPermisionario(req)) {
      if (String(item.permisionarioId) !== String(req.user._id)) return deny(res, "ARCH_DENY_PERMISIONARIO");
    } else if (!isAdminGeneral(req)) {
      return deny(res, "ARCH_DENY_ROLE");
    }

    const a = (item.archivos || []).find((x) => String(x.fileId) === fileId);
    if (!a) return deny(res, "ARCH_NO_ENLISTADO");

    let readable = resolveReadablePath(a.path);

    if (!readable) {
      const cand = canonicalPathForFileId(fileId);
      if (!cand || !fs.existsSync(cand)) return deny(res, "ARCH_NO_DISCO");
      readable = cand;
    }

    safePdfHeaders(res, disposition, a.nombre || "documento.pdf");
    return fs.createReadStream(readable).pipe(res);
  } catch {
    return fail(res);
  }
}

// --- FORMULARIO BLANK ---
async function formularioBlank(req, res) {
  try {
    if (!req.user?._id) return deny(res, "FORM_BLANK_NO_AUTH");

    safePdfHeaders(res, "attachment", "formulario-mantenimiento-blank.pdf");

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("MIS MANTENIMIENTOS - FORMULARIO", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(11).text("VIVIENDA: ____________________________");
    doc.text("PERMISIONARIO: _______________________");
    doc.text("FECHA Y HORA: ________________________");
    doc.text("TIPO DE MANTENIMIENTO: _______________");
    doc.text("TECNICO INTERVINIENTE: _______________");
    doc.moveDown(1);

    doc.text("OBSERVACIONES / DETALLE:", { underline: true });
    doc.moveDown(0.5);
    doc.text("__________________________________________________________");
    doc.text("__________________________________________________________");
    doc.text("__________________________________________________________");
    doc.moveDown(1);

    doc.text("FIRMA TECNICO: ________________________      ACLARACION: ________________________");
    doc.text("DNI: _________________________________");
    doc.end();
  } catch {
    return fail(res);
  }
}

// --- CONSTANCIA PDF ---
async function constanciaPdf(req, res) {
  try {
    const id =
      String(req.params.id || "") ||
      String(req.params.mantenimientoId || "") ||
      String(req.query?.id || "");

    if (!id) return deny(res, "CONST_SIN_ID");

    const item = await Mantenimiento.findById(id).lean();
    if (!item) return deny(res, "CONST_NO_MANTENIMIENTO");

    if (isInspector(req)) {
      const b = String(req.user?.barrioAsignado || "").trim();
      if (!b || up(b) !== up(item.barrio)) return deny(res, "CONST_DENY_INSPECTOR_BARRIO");
    } else if (isPermisionario(req)) {
      if (String(item.permisionarioId) !== String(req.user._id)) return deny(res, "CONST_DENY_PERMISIONARIO");
    } else if (!isAdminGeneral(req)) {
      return deny(res, "CONST_DENY_ROLE");
    }

    safePdfHeaders(res, "attachment", `constancia-${id}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(14).text("CONSTANCIA - MIS MANTENIMIENTOS", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Vivienda: ${item.viviendaDisplay || "-"}`);
    doc.text(`Permisionario: ${item.permisionarioDisplay || "-"}`);
    doc.text(`Tipo: ${item.tipoMantenimiento || "-"}`);
    doc.text(`Técnico: ${item.tecnicoInterviniente || "-"}`);
    doc.text(`Enviado: ${item.submittedAt ? new Date(item.submittedAt).toLocaleString("es-AR") : "-"}`);
    doc.text(`Aprobación Inspector: ${item.inspectorDecision || "PENDIENTE"}`);
    doc.text(`Aprobación Admin: ${item.adminDecision || "PENDIENTE"}${item.isClosed ? " (CERRADO)" : ""}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Historial de intervenciones", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const hist = Array.isArray(item.intervenciones) ? item.intervenciones : [];
    if (!hist.length) {
      doc.text("Sin intervenciones registradas.");
    } else {
      hist.forEach((h, idx) => {
        const fecha = h.fecha ? new Date(h.fecha).toLocaleString("es-AR") : "-";
        doc.text(`${idx + 1}. ${h.actorRole || "-"} - ${fecha} - ${h.accion} (${h.resultado})`);
      });
    }

    doc.end();
  } catch {
    return fail(res);
  }
}

module.exports = {
  refreshUserPrivileges,

  listarMis,
  crear,
  detalle,

  listarBarrioInspector,
  decisionInspector,

  listarAdminGeneral,
  decisionAdminGeneral,
  cierreAdminGeneral,

  previewArchivo,
  downloadArchivo,

  formularioBlank,
  constanciaPdf,
};
