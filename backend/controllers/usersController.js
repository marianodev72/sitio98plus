// backend/controllers/usersController.js
const mongoose = require("mongoose");
const { User } = require("../models/user");
const PDFDocument = require("pdfkit");

function deny(res) {
  // genérico por seguridad
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminGeneral(req) {
  return String(req.user?.role || "").toUpperCase() === "ADMIN_GENERAL";
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ROLES_VALIDOS = [
  "ADMIN_GENERAL",
  "ADMIN",
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO",
  "INSPECTOR",
  "JEFE_DE_BARRIO",
];

const ROLES_CON_BARRIO = ["INSPECTOR", "JEFE_DE_BARRIO"];

function buildFiltro(req) {
  const { q, role, activo, archivado, barrio } = req.query;
  const filtro = {};

  if (archivado === "true") filtro.archivado = true;
  if (archivado === "false") filtro.archivado = false;

  if (role) filtro.role = String(role);

  if (activo === "true") filtro.activo = true;
  if (activo === "false") filtro.activo = false;

  // ✅ filtro por barrioAsignado si lo piden
  if (barrio) filtro.barrioAsignado = String(barrio);

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filtro.$or = [{ nombre: rx }, { apellido: rx }, { email: rx }, { dni: rx }, { matricula: rx }];
  }

  return filtro;
}

function buildSort(req) {
  const { sortBy, sortDir } = req.query;

  const dir = String(sortDir || "asc").toLowerCase() === "desc" ? -1 : 1;
  const sortKey = String(sortBy || "apellido");

  const allowedSort = [
    "apellido",
    "nombre",
    "email",
    "dni",
    "matricula",
    "role",
    "activo",
    "estadoHabitacional",
    "archivadoAt",
    "barrioAsignado",
  ];

  const sort = {};
  if (allowedSort.includes(sortKey)) sort[sortKey] = dir;
  else sort.apellido = dir;

  return sort;
}

async function listar(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const filtro = buildFiltro(req);
    const sort = buildSort(req);

    const usuarios = await User.find(filtro).select("-passwordHash").sort(sort).lean();
    return res.json({ usuarios });
  } catch (err) {
    console.error("[USERS] Error listando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cambiarRol(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const nextRole = String(role || "").toUpperCase();
    if (!nextRole || !ROLES_VALIDOS.includes(nextRole)) return deny(res);

    const user = await User.findById(id);
    if (!user) return deny(res);

    user.role = nextRole;

    // ✅ Si pasa a un rol que NO usa barrio, limpiamos barrioAsignado para evitar inconsistencias
    if (!ROLES_CON_BARRIO.includes(nextRole)) {
      user.barrioAsignado = "";
    }

    await user.save();

    return res.json({ message: "Rol actualizado" });
  } catch (err) {
    console.error("[USERS] Error cambiando rol:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function asignarBarrio(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { barrio } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const user = await User.findById(id);
    if (!user) return deny(res);

    const role = String(user.role || "").toUpperCase();
    if (!ROLES_CON_BARRIO.includes(role)) return deny(res);

    const b = String(barrio || "").trim();
    if (!b || b.length > 80) return deny(res);

    user.barrioAsignado = b;
    await user.save();

    return res.json({ message: "Barrio asignado" });
  } catch (err) {
    console.error("[USERS] Error asignando barrio:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cambiarActivo(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { activo } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);
    if (typeof activo !== "boolean") return deny(res);

    const user = await User.findById(id);
    if (!user) return deny(res);

    user.activo = activo;
    await user.save();

    return res.json({ message: "Estado actualizado" });
  } catch (err) {
    console.error("[USERS] Error cambiando activo:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

function makeTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function resetPassword(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const user = await User.findById(id);
    if (!user) return deny(res);

    const tempPassword = makeTempPassword();
    await user.setPassword(tempPassword);
    await user.save();

    return res.json({ message: "Contraseña reseteada", tempPassword });
  } catch (err) {
    console.error("[USERS] Error reseteando password:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ✅ Archivar (histórico)
async function archivar(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { motivo } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id);
    if (!user) return deny(res);

    user.archivado = true;
    user.archivadoAt = new Date();
    user.archivadoPor = req.user?._id || null;
    user.archivadoMotivo = motivo ? String(motivo).slice(0, 300) : "";

    user.activo = false;
    user.bloqueado = true;

    await user.save();

    return res.json({ message: "Usuario archivado" });
  } catch (err) {
    console.error("[USERS] Error archivando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ✅ PDF (mismos filtros/orden)
async function pdf(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const filtro = buildFiltro(req);
    const sort = buildSort(req);

    const usuarios = await User.find(filtro).select("-passwordHash").sort(sort).lean();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Sitio98_Usuarios.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(16).text("Sitio 98", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(12).text("Listado de Usuarios", { align: "center" });
    doc.moveDown(0.6);

    doc.fontSize(10).text(`Fecha/hora: ${new Date().toLocaleString()}`);
    doc.moveDown(0.5);

    const { q, role, activo, archivado, barrio, sortBy, sortDir } = req.query;
    doc.fontSize(10).text(
      [
        `Búsqueda: ${q ? String(q) : "—"}`,
        `Rol: ${role ? String(role) : "Todos"}`,
        `Barrio: ${barrio ? String(barrio) : "Todos"}`,
        `Activo: ${activo ? String(activo) : "Todos"}`,
        `Archivado: ${archivado ? String(archivado) : "Todos"}`,
        `Orden: ${sortBy ? String(sortBy) : "apellido"} (${String(sortDir || "asc")})`,
      ].join(" | ")
    );
    doc.moveDown(0.8);

    usuarios.forEach((u, i) => {
      doc
        .fontSize(9)
        .text(
          `${i + 1}. ${u.apellido || "-"} ${u.nombre || "-"} | ${u.email || "-"} | DNI: ${u.dni || "-"} | Matr: ${
            u.matricula || "-"
          } | Rol: ${u.role || "-"} | Barrio: ${u.barrioAsignado || "-"} | Activo: ${
            u.activo !== false ? "Sí" : "No"
          } | Archivado: ${u.archivado ? "Sí" : "No"}`
        );
    });

    doc.end();
  } catch (err) {
    console.error("[USERS] Error PDF:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  listar,
  cambiarRol,
  asignarBarrio, // ✅ nuevo
  cambiarActivo,
  resetPassword,
  archivar,
  pdf,
};
