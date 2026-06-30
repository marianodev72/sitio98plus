// backend/controllers/usersController.js
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { User } = require("../models/user");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");
const MisDatosDeclaradosUpdate = require("../models/MisDatosDeclaradosUpdate");
const { FormSubmission } = require("../models/FormSubmission");
const { normalizarGradoVisual } = require("../utils/normalizarGradoVisual");

// ✅ Vivienda model (minúscula) — IMPORT CORRECTO
// ✅ Vivienda model (robusto)
let Vivienda = null;
try {
  const mod =
    require("../models/vivienda"); // intento 1 (minúscula)

  Vivienda = mod?.Vivienda || mod; // soporta export { Vivienda } o export directo
} catch (e1) {
  try {
    const mod =
      require("../models/Vivienda"); // intento 2 (mayúscula)

    Vivienda = mod?.Vivienda || mod;
  } catch (e2) {
    Vivienda = null;
  }
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

// ✅ ESCRITURA: SOLO ADMIN_GENERAL
function isAdminGeneral(req) {
  return String(req.user?.role || "").toUpperCase().trim() === "ADMIN_GENERAL";
}

// ✅ LECTURA: ADMIN_GENERAL + ADMIN (institucional)
function isAdminStaffReadOnly(req) {
  const r = String(req.user?.role || "").toUpperCase().trim();
  return r === "ADMIN_GENERAL" || r === "ADMIN";
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function up(v) {
  return String(v || "").toUpperCase().trim();
}
function safeStr(v) {
  return String(v || "").trim();
}

function normalizeMatricula(value) {
  return safeStr(value).replace(/[\s.-]+/g, "").toUpperCase();
}

function isObjectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function publicLabel(value) {
  const text = safeStr(value);
  if (!text || isObjectIdLike(text)) return "Sin asignar";
  return text;
}

const TERRITORIOS_ALOJAMIENTO_TIPOS = ["LUGAR"];

function normalizarTerritoriosAlojamiento(value) {
  if (!Array.isArray(value)) {
    const err = new Error("Territorios inválidos");
    err.code = "TERRITORIOS_INVALIDOS";
    throw err;
  }

  const unique = new Map();
  for (const item of value) {
    const tipo = up(item?.tipo);
    const valor = safeStr(item?.valor);
    if (!TERRITORIOS_ALOJAMIENTO_TIPOS.includes(tipo) || !valor) {
      const err = new Error("Territorios inválidos");
      err.code = "TERRITORIOS_INVALIDOS";
      throw err;
    }
    unique.set(`${tipo}:${valor.toUpperCase()}`, { tipo, valor });
  }

  return Array.from(unique.values());
}

function sanitizeUsuarioListItem(user) {
  if (!user || typeof user !== "object") return user;
  user.barrioAsignado = publicLabel(user.barrioAsignado);
  user.viviendaLabel = publicLabel(user.viviendaLabel);
  user.alojamientoLabel = publicLabel(user.alojamientoLabel);
  user.grado = normalizarGradoVisual(user.gradoFinal || user.grado || user.meta?.grado);
  delete user.gradoFinal;
  delete user.meta;
  if (Array.isArray(user.territoriosAlojamiento)) {
    user.territoriosAlojamiento = user.territoriosAlojamiento
      .map((territorio) => {
        const tipo = safeStr(territorio?.tipo).toUpperCase();
        const valor = safeStr(territorio?.valor);
        if (!tipo || !valor || isObjectIdLike(valor)) return null;
        return { tipo, valor };
      })
      .filter(Boolean);
  }
  return user;
}

// Roles base válidos
const ROLES_BASE_VALIDOS = ["ADMIN_GENERAL", "ADMIN", "POSTULANTE", "PERMISIONARIO", "ALOJADO"];

// Permisos válidos
const PERMISOS_VALIDOS = ["INSPECTOR", "JEFE_DE_BARRIO", "INSPECTOR_ALOJAMIENTOS"];

/**
 * ✅ Allowlist institucional para lectura:
 * ADMIN puede leer y procesar info personal (PII), por función institucional.
 * ❌ Excluye campos técnicos (passwordHash, loginEventos, adminEventos, tokenVersion, IPs, etc.) por defecto.
 */
const ADMIN_READ_SELECT =
  "_id nombre apellido email dni matricula grado meta telefono tipoPersonal precedencia grupoJerarquico excepcionTipoDestino role permisos barrioAsignado territoriosAlojamiento estadoHabitacional activo bloqueado archivado archivadoAt viviendaAsignada alojamientoAsignado createdAt updatedAt";

// Legacy roles INSPECTOR/JEFE_DE_BARRIO (si quedaron como role)
function normalizeLegacyRoleToPermisos(user) {
  const r = up(user?.role);

  if (r === "INSPECTOR") {
    user.role = "PERMISIONARIO";
    const list = Array.isArray(user.permisos) ? user.permisos : [];
    const upList = list.map(up);
    if (!upList.includes("INSPECTOR")) user.permisos = [...list, "INSPECTOR"];
    return true;
  }

  if (r === "JEFE_DE_BARRIO") {
    user.role = "PERMISIONARIO";
    const list = Array.isArray(user.permisos) ? user.permisos : [];
    const upList = list.map(up);
    if (!upList.includes("JEFE_DE_BARRIO")) user.permisos = [...list, "JEFE_DE_BARRIO"];
    return true;
  }

  return false;
}

// Revocación inmediata de JWT
function bumpTokenVersion(user) {
  const current = Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0;
  user.tokenVersion = current + 1;
}

// Bitácora institucional en adminEventos (acciones sobre el usuario)
function registrarAdminEvento(user, req, tipo, detalles = {}, observacionRaw = "") {
  if (!user) return;
  try {
    const actorId = req.user?._id || null;
    const actorRole = String(req.user?.role || "");
    const observacion = String(observacionRaw || "").slice(0, 500);

    if (!Array.isArray(user.adminEventos)) user.adminEventos = [];

    user.adminEventos.push({
      fecha: new Date(),
      tipo,
      actor: { id: actorId, role: actorRole },
      detalles: detalles || {},
      observacion,
    });

    if (user.adminEventos.length > 100) {
      user.adminEventos = user.adminEventos.slice(-100);
    }

    if (actorId) user.updatedBy = actorId;
  } catch (err) {
    console.error("[USERS] Error registrando adminEvento:", err);
  }
}

function limpiarBloqueoLogin(user) {
  if (!user) return;
  user.bloqueado = false;
  user.loginFallidos = 0;
  user.loginBloqueadoHasta = null;
}

function buildFiltro(req) {
  const filtro = {};

  // archivado: por default NO, salvo que pidan archivado=true
  const archivadoQ = String(req.query?.archivado || "").toLowerCase();
  if (archivadoQ === "true" || archivadoQ === "1") {
    filtro.archivado = true;
  } else {
    filtro.archivado = { $ne: true };
  }

  const roleQ = safeStr(req.query?.role || req.query?.rol);
  if (roleQ) filtro.role = up(roleQ);

  const estadoQ = safeStr(req.query?.estadoHabitacional);
  if (estadoQ) filtro.estadoHabitacional = estadoQ;

  const activoQ = String(req.query?.activo || "").toLowerCase();
  if (activoQ === "true" || activoQ === "1") filtro.activo = true;
  if (activoQ === "false" || activoQ === "0") filtro.activo = false;

  const bloqueadoQ = String(req.query?.bloqueado || "").toLowerCase();
  if (bloqueadoQ === "true" || bloqueadoQ === "1") filtro.bloqueado = true;
  if (bloqueadoQ === "false" || bloqueadoQ === "0") filtro.bloqueado = false;


  const q = safeStr(req.query?.q || req.query?.buscar || req.query?.texto);
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filtro.$or = [{ email: regex }, { nombre: regex }, { apellido: regex }, { dni: regex }, { matricula: regex }];
  }

  return filtro;
}

function buildSort(req) {
  const by = safeStr(req.query?.sortBy || "apellido").toLowerCase();
  const dir = String(req.query?.sortDir || "asc").toLowerCase() === "desc" ? -1 : 1;

  const allowed = new Set([
    "apellido",
    "nombre",
    "email",
    "dni",
    "matricula",
    "grado",
    "role",
    "barrioasignado",
    "activo",
    "tipopersonal",
    "precedencia",
    "archivadoat",
  ]);
  const key = allowed.has(by) ? by : "apellido";
  const map = { barrioasignado: "barrioAsignado", tipopersonal: "tipoPersonal", archivadoat: "archivadoAt" };

  return { [map[key] || key]: dir };
}

function getGradoFiltro(req) {
  const grado = normalizarGradoVisual(req?.query?.grado);
  return grado && grado !== "TODOS" ? grado : "";
}

function isSortByGrado(req) {
  return safeStr(req?.query?.sortBy).toLowerCase() === "grado";
}

function firstText(...values) {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function collectDocUserIds(doc = {}) {
  const values = [
    doc.usuario,
    doc.userId,
    doc.usuarioId,
    doc.solicitanteId,
    doc.postulanteId,
    doc.datos?.usuarioId,
    doc.datos?.userId,
    doc.datos?.solicitanteId,
    doc.datos?.postulanteId,
    doc.datosPersonales?.usuarioId,
    doc.datosPersonales?.userId,
    doc.datosFormulario?.usuarioId,
    doc.datosFormulario?.userId,
  ];

  return values
    .map((value) => {
      if (!value) return "";
      if (typeof value === "object" && value._id) return String(value._id);
      return String(value);
    })
    .filter(Boolean);
}

function collectDocMatriculas(doc = {}) {
  return [
    doc.matricula,
    doc.datosActualizados?.matricula,
    doc.baseDatos?.matricula,
    doc.datos?.matricula,
    doc.datos?.mr,
    doc.datosPersonales?.matricula,
    doc.datosPersonales?.mr,
    doc.datosFormulario?.matricula,
    doc.datosFormulario?.mr,
  ]
    .map(normalizeMatricula)
    .filter(Boolean);
}

function extractMisDatosGrado(doc = {}) {
  return firstText(doc.datosActualizados?.gradoEscalafon, doc.baseDatos?.gradoEscalafon);
}

function extractAnexo01Grado(doc = {}) {
  return firstText(
    doc.datos?.gradoEscalafon,
    doc.datosPersonales?.gradoEscalafon,
    doc.datosFormulario?.gradoEscalafon
  );
}

function applyDeclaredGradeDoc(doc, usersById, usersByMatricula, resultById, extractor) {
  const grado = normalizarGradoVisual(extractor(doc));
  if (!grado) return;

  const matchedIds = new Set();
  for (const uid of collectDocUserIds(doc)) {
    if (usersById.has(uid)) matchedIds.add(uid);
  }

  for (const mat of collectDocMatriculas(doc)) {
    const ids = usersByMatricula.get(mat);
    if (!ids) continue;
    ids.forEach((uid) => matchedIds.add(uid));
  }

  for (const uid of matchedIds) {
    if (!safeStr(resultById.get(uid))) resultById.set(uid, grado);
  }
}

async function hydrateUsuariosGradoDeclarado(usuarios = []) {
  if (!Array.isArray(usuarios) || usuarios.length === 0) return usuarios;

  const usersById = new Map();
  const usersByMatricula = new Map();
  const resultById = new Map();

  for (const user of usuarios) {
    const uid = String(user?._id || "");
    if (!uid) continue;
    usersById.set(uid, user);
    resultById.set(uid, normalizarGradoVisual(user.grado || user.meta?.grado));

    const mat = normalizeMatricula(user.matricula);
    if (mat) {
      if (!usersByMatricula.has(mat)) usersByMatricula.set(mat, new Set());
      usersByMatricula.get(mat).add(uid);
    }
  }

  const needsDeclarado = Array.from(resultById.values()).some((grado) => !safeStr(grado));
  if (needsDeclarado) {
    const misDatos = await MisDatosDeclaradosUpdate.find({})
      .select("usuario userId usuarioId datosActualizados.gradoEscalafon datosActualizados.matricula baseDatos.gradoEscalafon baseDatos.matricula updatedAt createdAt")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .lean();

    for (const doc of misDatos || []) {
      applyDeclaredGradeDoc(doc, usersById, usersByMatricula, resultById, extractMisDatosGrado);
    }

    const anexos01 = await FormSubmission.find({ codigo: "ANEXO_01" })
      .select("usuario userId usuarioId solicitanteId postulanteId datos.gradoEscalafon datos.matricula datos.mr datos.usuarioId datos.userId datos.postulanteId datosPersonales.gradoEscalafon datosPersonales.matricula datosPersonales.mr updatedAt createdAt")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .lean();

    for (const doc of anexos01 || []) {
      applyDeclaredGradeDoc(doc, usersById, usersByMatricula, resultById, extractAnexo01Grado);
    }

    if (mongoose.connection?.readyState === 1) {
      const postulaciones = await mongoose.connection.collection("postulacions")
        .find({}, {
          projection: {
            usuario: 1,
            userId: 1,
            usuarioId: 1,
            solicitanteId: 1,
            postulanteId: 1,
            datos: 1,
            datosPersonales: 1,
            datosFormulario: 1,
            updatedAt: 1,
            createdAt: 1,
            fechaEnvio: 1,
          },
        })
        .sort({ updatedAt: -1, fechaEnvio: -1, createdAt: -1, _id: -1 })
        .toArray();

      for (const doc of postulaciones || []) {
        applyDeclaredGradeDoc(doc, usersById, usersByMatricula, resultById, extractAnexo01Grado);
      }
    }
  }

  for (const user of usuarios) {
    const uid = String(user?._id || "");
    user.gradoFinal = normalizarGradoVisual(resultById.get(uid));
  }

  return usuarios;
}

function sortUsuariosPorGrado(usuarios = [], dir = 1) {
  return [...usuarios].sort((a, b) => {
    const gA = normalizarGradoVisual(a?.gradoFinal || a?.grado || a?.meta?.grado);
    const gB = normalizarGradoVisual(b?.gradoFinal || b?.grado || b?.meta?.grado);
    const cmpGrado = gA.localeCompare(gB);
    if (cmpGrado !== 0) return cmpGrado * dir;
    const aName = `${safeStr(a?.apellido)} ${safeStr(a?.nombre)}`.trim();
    const bName = `${safeStr(b?.apellido)} ${safeStr(b?.nombre)}`.trim();
    return aName.localeCompare(bName);
  });
}

async function listarUsuariosAdminConGrado(req, options = {}) {
  let filtro = buildFiltro(req);
  const sort = buildSort(req);
  const barrioQ = safeStr(req.query?.barrio);
  filtro = await applyRobustBarrioFilter({ filtro, barrioQ });

  const gradoFiltro = getGradoFiltro(req);
  const sortGrado = isSortByGrado(req);
  const limitQ = Number.parseInt(String(req.query?.limit || "200"), 10);
  const limit = Number.isFinite(limitQ) ? Math.max(1, Math.min(1000, limitQ)) : 200;
  const pageQ = Number.parseInt(String(req.query?.page || "1"), 10);
  const page = Number.isFinite(pageQ) ? Math.max(1, pageQ) : 1;
  const paginate = options.paginate !== false;

  if (gradoFiltro || sortGrado || !paginate) {
    let usuarios = await User.find(filtro)
      .select(ADMIN_READ_SELECT)
      .sort(sortGrado ? { apellido: 1, nombre: 1 } : sort)
      .lean();

    await hydrateUsuariosGradoDeclarado(usuarios);

    if (gradoFiltro) {
      usuarios = usuarios.filter((u) => normalizarGradoVisual(u.gradoFinal || u.grado) === gradoFiltro);
    }

    if (sortGrado) {
      const dir = String(req.query?.sortDir || "asc").toLowerCase() === "desc" ? -1 : 1;
      usuarios = sortUsuariosPorGrado(usuarios, dir);
    }

    const total = usuarios.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pageUsuarios = paginate ? usuarios.slice(start, start + limit) : usuarios;

    return {
      usuarios: pageUsuarios,
      total,
      page: paginate ? safePage : 1,
      limit: paginate ? limit : total,
      totalPages: paginate ? totalPages : 1,
    };
  }

  const skip = (page - 1) * limit;
  const total = await User.countDocuments(filtro);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const usuarios = await User.find(filtro)
    .select(ADMIN_READ_SELECT)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  await hydrateUsuariosGradoDeclarado(usuarios);

  return {
    usuarios,
    total,
    page,
    limit,
    totalPages,
  };
}
async function applyRobustBarrioFilter({ filtro, barrioQ }) {
  try {
    const barrio = safeStr(barrioQ);
    if (!barrio) return filtro;

    const patt = escapeRegex(barrio);

    if (!Vivienda) {
      return { ...filtro, barrioAsignado: { $regex: patt, $options: "i" } };
    }

    const permIds = await Vivienda.distinct("ocupacionActual.permisionario", {
      archivado: { $ne: true },
      barrio: { $regex: patt, $options: "i" },
      "ocupacionActual.permisionario": { $exists: true, $ne: null },
    });

    const or = [];
    or.push({ barrioAsignado: { $regex: patt, $options: "i" } });

    if (Array.isArray(permIds) && permIds.length) {
      or.push({ _id: { $in: permIds } });
    }

    return { ...filtro, $and: [{ ...filtro }, { $or: or }] };
  } catch (err) {
    console.error("[USERS] Error aplicando filtro barrio robusto:", err);
    return filtro;
  }
}

async function attachViviendaOcupadaLabel(usuarios) {
  try {
    if (!Array.isArray(usuarios) || usuarios.length === 0) return usuarios;

    if (!Vivienda) {
      for (const u of usuarios) {
        if (u && up(u.role) === "PERMISIONARIO" && !safeStr(u.viviendaLabel)) u.viviendaLabel = "Sin asignar";
      }
      return usuarios;
    }

    const viviendaIds = usuarios.map((u) => u?.viviendaAsignada).filter(Boolean);
    if (viviendaIds.length) {
      const viviendasAsignadas = await Vivienda.find({ _id: { $in: viviendaIds } })
        .select("codigo")
        .lean();
      const mapViviendaCodigo = new Map(
        (viviendasAsignadas || []).map((v) => [String(v._id), v.codigo || "Sin asignar"])
      );
      for (const u of usuarios) {
        const codigo = mapViviendaCodigo.get(String(u?.viviendaAsignada || ""));
        if (codigo) u.viviendaLabel = codigo;
      }
    }

    const permIds = usuarios
      .filter((u) => u && up(u.role) === "PERMISIONARIO")
      .map((u) => u._id);

    if (!permIds.length) return usuarios;

    const viviendasOcupadas = await Vivienda.find({
      archivado: { $ne: true },
      estado: "OCUPADA",
      "ocupacionActual.permisionario": { $in: permIds },
    })
      .select("codigo ocupacionActual.permisionario")
      .lean();

    const mapUserToVivienda = new Map();
    for (const v of viviendasOcupadas) {
      const uid = v?.ocupacionActual?.permisionario?.toString?.();
      if (!uid) continue;
      mapUserToVivienda.set(uid, v.codigo || "Sin asignar");
    }

    for (const u of usuarios) {
      if (!u || up(u.role) !== "PERMISIONARIO") continue;
      const uid = u._id?.toString?.();
      if (safeStr(u.viviendaLabel)) continue;
      u.viviendaLabel = uid && mapUserToVivienda.get(uid) ? mapUserToVivienda.get(uid) : "Sin asignar";
    }

    return usuarios;
  } catch {
    return usuarios;
  }
}

async function attachAlojamientoActivoLabel(usuarios) {
  try {
    if (!Array.isArray(usuarios) || usuarios.length === 0) return usuarios;

    const alojadoIds = usuarios
      .filter((u) => u && (up(u.role) === "ALOJADO" || u.alojamientoAsignado))
      .map((u) => u._id)
      .filter(Boolean);

    if (!alojadoIds.length) return usuarios;

    const asignaciones = await AsignacionAlojamiento.find({
      estado: "ACTIVA",
      alojado: { $in: alojadoIds },
    })
      .select("alojado alojamiento plaza")
      .populate({ path: "alojamiento", select: "codigo" })
      .populate({ path: "plaza", select: "codigo numeroPlaza" })
      .lean();

    const mapUserToAlojamiento = new Map();
    for (const asignacion of asignaciones || []) {
      const uid = String(asignacion?.alojado || "");
      if (!uid) continue;
      const alojamientoCodigo = safeStr(asignacion?.alojamiento?.codigo);
      const plazaCodigo = safeStr(asignacion?.plaza?.codigo);
      const numeroPlaza = asignacion?.plaza?.numeroPlaza
        ? `Plaza ${asignacion.plaza.numeroPlaza}`
        : "";
      const plazaLabel = plazaCodigo || numeroPlaza;
      const label = [alojamientoCodigo, plazaLabel].filter(Boolean).join(" · ");
      mapUserToAlojamiento.set(uid, label || "Sin asignar");
    }

    for (const u of usuarios) {
      if (!u) continue;
      const uid = String(u._id || "");
      if (mapUserToAlojamiento.has(uid)) {
        u.alojamientoLabel = mapUserToAlojamiento.get(uid);
      } else if (up(u.role) === "ALOJADO") {
        u.alojamientoLabel = "Sin asignar";
      }
    }

    return usuarios;
  } catch (err) {
    console.error("[USERS] Error hidratando alojamiento activo:", err?.message || "Error controlado");
    return usuarios;
  }
}

/**
 * GET /api/users/admin-list
 * ✅ ADMIN_GENERAL + ADMIN (lectura institucional)
 */
async function listar(req, res) {
  try {
    if (!isAdminStaffReadOnly(req)) return deny(res);

    const { usuarios, total, page, limit, totalPages } = await listarUsuariosAdminConGrado(req, { paginate: true });
    await attachViviendaOcupadaLabel(usuarios);
    await attachAlojamientoActivoLabel(usuarios);
    usuarios.forEach(sanitizeUsuarioListItem);

    return res.json({
      usuarios,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (err) {
    console.error("[USERS] Error listar:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/role
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function cambiarRol(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { role, nuevoRol, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const nextRole = up(nuevoRol || role);
    if (!nextRole || !ROLES_BASE_VALIDOS.includes(nextRole)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    normalizeLegacyRoleToPermisos(user);

    user.role = nextRole;

    registrarAdminEvento(user, req, "CAMBIO_ROL", { role: nextRole }, observacion);

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Rol actualizado" });
  } catch (err) {
    console.error("[USERS] Error cambiarRol:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/permisos
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function setPermisos(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { permisos, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const list = Array.isArray(permisos) ? permisos : [];
    const cleaned = list
      .map((p) => up(p))
      .filter((p) => PERMISOS_VALIDOS.includes(p));

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    normalizeLegacyRoleToPermisos(user);

    user.permisos = cleaned;

    registrarAdminEvento(user, req, "SET_PERMISOS", { permisos: cleaned }, observacion);

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Permisos actualizados" });
  } catch (err) {
    console.error("[USERS] Error setPermisos:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/barrio
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function asignarBarrio(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { barrioAsignado, barrio, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const user = await User.findById(id).select("+adminEventos");
    if (!user) return deny(res);

    const nextBarrio = safeStr(barrioAsignado || barrio);
    user.barrioAsignado = nextBarrio;

    registrarAdminEvento(user, req, "ASIGNAR_BARRIO", { barrioAsignado: nextBarrio }, observacion);

    await user.save();
    return res.json({ message: "Barrio asignado" });
  } catch (err) {
    console.error("[USERS] Error asignarBarrio:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/territorios-alojamiento
 * SOLO ADMIN_GENERAL (escritura)
 */
async function asignarTerritoriosAlojamiento(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { territoriosAlojamiento, territorios, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const nextTerritorios = normalizarTerritoriosAlojamiento(
      territoriosAlojamiento ?? territorios
    );

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    user.territoriosAlojamiento = nextTerritorios;

    registrarAdminEvento(
      user,
      req,
      "ASIGNAR_TERRITORIOS_ALOJAMIENTO",
      { territoriosAlojamiento: nextTerritorios },
      observacion
    );

    bumpTokenVersion(user);
    await user.save();
    return res.json({ message: "Territorios de alojamiento asignados" });
  } catch (err) {
    if (err?.code === "TERRITORIOS_INVALIDOS") {
      return res.status(400).json({ message: "Territorios inválidos" });
    }
    console.error("[USERS] Error asignarTerritoriosAlojamiento:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/vivienda
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function asignarVivienda(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const body = req.body || {};

// ✅ Compat: el panel manda viviendaCodigo
const viviendaId = body.viviendaId || null;
const codigo = body.codigo || body.viviendaCodigo || null;

const estado = body.estado;
const observacion = body.observacion;

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const user = await User.findById(id).select("+adminEventos");
    console.log("[asignarVivienda] Vivienda model loaded?", !!Vivienda);
    console.log("[asignarVivienda] codigo recibido:", codigo);

    if (!user) return deny(res);

    let vivienda = null;

    if (Vivienda) {
      if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId)) {
        vivienda = await Vivienda.findById(viviendaId);
      } else if (codigo) {
        vivienda = await Vivienda.findOne({ codigo: safeStr(codigo) });
      }
    }

    if (vivienda && vivienda._id) {
      user.viviendaAsignada = vivienda._id;
    } else if (viviendaId && mongoose.Types.ObjectId.isValid(viviendaId)) {
      user.viviendaAsignada = viviendaId;
    } else {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    if (vivienda) {
      if (estado) vivienda.estado = String(estado);

      if (vivienda.ocupacionActual && typeof vivienda.ocupacionActual === "object") {
        vivienda.ocupacionActual.permisionario = user._id;
      }

      await vivienda.save();
    }

    const eh = safeStr(user.estadoHabitacional);
    if (!eh || eh === "SIN_VIVIENDA" || eh === "POSTULANTE" || eh === "PERMISIONARIO_EN_ESPERA") {
      user.estadoHabitacional = "PERMISIONARIO_ACTIVO";
    }

    registrarAdminEvento(
      user,
      req,
      "ASIGNAR_VIVIENDA",
      {
        viviendaId: String(user.viviendaAsignada || ""),
        codigo: codigo || null,
      },
      observacion
    );

    await user.save();
    return res.json({ message: "Vivienda asignada" });
  } catch (err) {
    console.error("[USERS] Error asignarVivienda:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/reset-asignacion
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function resetAsignacion(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const user = await User.findById(id).select("+adminEventos");
    if (!user) return deny(res);

    user.viviendaAsignada = null;
    user.alojamientoAsignado = null;
    user.estadoHabitacional = "SIN_VIVIENDA";

    registrarAdminEvento(user, req, "RESET_ASIGNACION", {}, observacion);

    await user.save();

    return res.json({ message: "Asignación reseteada" });
  } catch (err) {
    console.error("[USERS] Error resetAsignacion:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/activo
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function cambiarActivo(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { activo, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    user.activo = !!activo;

    registrarAdminEvento(user, req, "CAMBIAR_ACTIVO", { activo: user.activo }, observacion);

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Estado actualizado" });
  } catch (err) {
    console.error("[USERS] Error cambiarActivo:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * PATCH /api/users/:id/bloqueo
 * SOLO ADMIN_GENERAL (escritura)
 */
async function cambiarBloqueo(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { bloqueado, observacion } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    if (typeof bloqueado !== "boolean") {
      return res.status(400).json({
        code: "BLOQUEADO_BOOLEAN_REQUERIDO",
        message: "El campo bloqueado debe ser booleano true/false.",
      });
    }

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id).select(
      "+adminEventos +tokenVersion +loginFallidos +loginBloqueadoHasta"
    );
    if (!user) return deny(res);

    const nextBloqueado = bloqueado === true;

    if (nextBloqueado) {
      user.bloqueado = true;
    } else {
      limpiarBloqueoLogin(user);
    }

    registrarAdminEvento(
      user,
      req,
      nextBloqueado ? "BLOQUEAR_USUARIO" : "DESBLOQUEAR_USUARIO",
      {
        bloqueado: nextBloqueado,
        loginFallidosReiniciados: !nextBloqueado,
        loginBloqueadoHastaLimpiado: !nextBloqueado,
      },
      observacion
    );

    bumpTokenVersion(user);
    await user.save();

    return res.json({
      message: nextBloqueado ? "Usuario bloqueado" : "Usuario desbloqueado",
      bloqueado: user.bloqueado === true,
    });
  } catch (err) {
    console.error("[USERS] Error cambiarBloqueo:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

function makeTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function confirmAdminPassword(req, res) {
  try {
    const adminPassword = String(req.body?.adminPassword || "");
    if (!adminPassword) {
      res.status(400).json({ message: "Se requiere confirmación de contraseña" });
      return null;
    }

    const admin = await User.findById(req.user?._id).select("+passwordHash");
    if (!admin) {
      deny(res);
      return null;
    }

    const ok = await admin.validarPassword(adminPassword);
    if (!ok) {
      res.status(401).json({ message: "Contraseña incorrecta" });
      return null;
    }

    return admin;
  } catch (err) {
    console.error("[USERS] Error confirmando contraseña de admin:", err);
    res.status(500).json({ message: "Error interno" });
    return null;
  }
}
/**
 * POST /api/users/:id/reset-password
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function resetPassword(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { observacion } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const adminConfirmed = await confirmAdminPassword(req, res);
    if (!adminConfirmed) return;

    const user = await User.findById(id).select(
      "+adminEventos +passwordHash +tokenVersion +loginFallidos +loginBloqueadoHasta"
    );
    if (!user) return deny(res);

    const tempPassword = makeTempPassword();
    await user.setPassword(tempPassword);
    user.mustChangePassword = true;
    limpiarBloqueoLogin(user);

    registrarAdminEvento(
      user,
      req,
      "RESET_PASSWORD",
      {
        tempPasswordEmitida: true,
        desbloqueado: true,
        loginFallidosReiniciados: true,
        loginBloqueadoHastaLimpiado: true,
      },
      observacion
    );

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Contraseña reseteada", tempPassword });
  } catch (err) {
    console.error("[USERS] Error reseteando password:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * POST /api/users/:id/reset-mfa
 * ✅ SOLO ADMIN_GENERAL (escritura)
 */
async function resetMFA(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { observacion } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const adminConfirmed = await confirmAdminPassword(req, res);
    if (!adminConfirmed) return;

    const user = await User.findById(id).select(
      "+adminEventos +tokenVersion +mfaEnabled +mfaSecretEnc +mfaChallenge +mfaRecoveryCodes"
    );
    if (!user) return deny(res);

    user.mfaEnabled = false;
    user.mfaSecretEnc = undefined;
    user.mfaChallenge = undefined;

    if (Array.isArray(user.mfaRecoveryCodes)) {
      user.mfaRecoveryCodes = [];
    }

    registrarAdminEvento(
      user,
      req,
      "RESET_MFA",
      { mfaReseteado: true },
      observacion
    );

    bumpTokenVersion(user);
    await user.save();

    return res.json({
      message: "MFA reseteado correctamente. El usuario deberá configurarlo nuevamente."
    });
  } catch (err) {
    console.error("[USERS] Error reseteando MFA:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function archivar(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    const { motivo } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    user.archivado = true;
    user.archivadoAt = new Date();
    user.archivadoPor = req.user?._id || null;
    user.archivadoMotivo = motivo ? String(motivo).slice(0, 300) : "";

    user.activo = false;
    user.bloqueado = true;

    registrarAdminEvento(user, req, "ARCHIVADO", { motivo: user.archivadoMotivo }, motivo);

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Usuario archivado" });
  } catch (err) {
    console.error("[USERS] Error archivando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function desarchivar(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const selfId = String(req.user?._id || "");
    if (selfId && String(id) === selfId) return deny(res);

    const user = await User.findById(id).select("+adminEventos +tokenVersion");
    if (!user) return deny(res);

    user.archivado = false;
    user.archivadoAt = null;
    user.archivadoPor = null;
    user.archivadoMotivo = "";

    user.bloqueado = false;
    user.activo = true;

    registrarAdminEvento(user, req, "DESARCHIVAR", { ok: true }, "Usuario desarchivado");

    bumpTokenVersion(user);
    await user.save();

    return res.json({ message: "Usuario desarchivado" });
  } catch (err) {
    console.error("[USERS] Error desarchivando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

/**
 * GET /api/users/pdf
 * ✅ ADMIN_GENERAL + ADMIN (lectura institucional)
 */
async function pdf(req, res) {
  try {
    if (!isAdminStaffReadOnly(req)) return deny(res);

    const { usuarios } = await listarUsuariosAdminConGrado(req, { paginate: false });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Sitio98_Usuarios.pdf"`);

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(16).text("Sitio 98", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(12).text("Listado de Usuarios", { align: "center" });
    doc.moveDown(0.6);

    doc.fontSize(10).text(`Fecha/hora: ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);

    (usuarios || []).forEach((u, i) => {
      doc.fontSize(9).text(
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
  pdf,
  resetAsignacion,
  cambiarRol,
  setPermisos,
  asignarBarrio,
  asignarTerritoriosAlojamiento,
  asignarVivienda,
  cambiarActivo,
  cambiarBloqueo,
  resetPassword,
  resetMFA,
  archivar,

  // ✅ compat con routes/users.js que usa usersController.unarchivar
  unarchivar: desarchivar,
  desarchivar,
};
