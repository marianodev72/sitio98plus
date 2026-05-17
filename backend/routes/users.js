// backend/routes/users.js
const express = require("express");
const router = express.Router();

const { authRequired, requireRole } = require("../middleware/auth");
const { refreshUserPrivileges } = require("../middleware/refreshUserPrivileges");
const { audit, attachAuditHelpers } = require("../middleware/audit");
const usersController = require("../controllers/usersController");

let Vivienda = null;
try {
  Vivienda = require("../models/vivienda");
} catch {
  Vivienda = null;
}

let User = null;
try {
  ({ User } = require("../models/User"));
} catch {
  try {
    ({ User } = require("../models/user"));
  } catch {
    User = null;
  }
}

function up(v) {
  return String(v || "").toUpperCase().trim();
}
function safeStr(v) {
  return String(v || "").trim();
}
function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BASE_ROLES = new Set(["PERMISIONARIO", "ALOJADO", "ADMIN_GENERAL", "ADMIN"]);

function hasPerm(u, perm) {
  const perms = Array.isArray(u?.permisos) ? u.permisos : [];
  const upPerms = perms.map((p) => String(p || "").toUpperCase().trim());
  return upPerms.includes(String(perm || "").toUpperCase().trim());
}

function pickSort(sortByRaw, sortDirRaw) {
  const sortDir = String(sortDirRaw || "asc").toLowerCase() === "desc" ? -1 : 1;
  const sortBy = String(sortByRaw || "apellido").toLowerCase();

  const allowed = new Set(["apellido", "nombre", "email", "role", "barrioasignado", "activo"]);
  const key = allowed.has(sortBy) ? sortBy : "apellido";
  const map = { barrioasignado: "barrioAsignado" };

  return { sort: { [map[key] || key]: sortDir } };
}

function clampInt(n, min, max) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function maxUsersForRole(roleUp) {
  if (roleUp === "ADMIN_GENERAL" || roleUp === "ADMIN") return 1000;
  return 200;
}

// ✅ Mensajería: allowlist SIN DNI/MATRÍCULA
const USER_SAFE_SELECT =
  "_id nombre apellido email role permisos barrioAsignado estadoHabitacional activo archivado";

async function attachViviendaLabel(usuarios) {
  try {
    if (!Array.isArray(usuarios) || usuarios.length === 0) return usuarios;

    if (!Vivienda) {
      for (const u of usuarios) {
        if (u && up(u.role) === "PERMISIONARIO") u.viviendaLabel = "—";
      }
      return usuarios;
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
      mapUserToVivienda.set(uid, v.codigo || "—");
    }

    for (const u of usuarios) {
      if (!u || up(u.role) !== "PERMISIONARIO") continue;
      const uid = u._id?.toString?.();
      u.viviendaLabel = uid && mapUserToVivienda.get(uid) ? mapUserToVivienda.get(uid) : "—";
    }

    return usuarios;
  } catch {
    return usuarios;
  }
}

// Auth + helpers para auditoría A6
router.use(authRequired, refreshUserPrivileges);
router.use(attachAuditHelpers);

// -----------------------------
// Listados / lecturas
// -----------------------------

router.get("/permisionarios-barrio", async (req, res) => {
  try {
    if (!User) return res.status(404).json({ message: "Recurso no disponible" });

    const me = req.user;
    const role = up(me?.role);
    const barrio = safeStr(me?.barrioAsignado);

    if (role !== "PERMISIONARIO") return res.status(403).json({ message: "No autorizado" });
    if (!hasPerm(me, "JEFE_DE_BARRIO")) return res.status(403).json({ message: "No autorizado" });
    if (!barrio) return res.status(400).json({ message: "BarrioAsignado requerido" });

    const { sort } = pickSort(req.query.sortBy, req.query.sortDir);

    const q = {
      role: "PERMISIONARIO",
      barrioAsignado: barrio,
      $or: [{ archivado: { $exists: false } }, { archivado: false }],
    };

    const list = await User.find(q).select(USER_SAFE_SELECT).sort(sort).lean();
    await attachViviendaLabel(list);

    return res.json({ users: list });
  } catch (e) {
    console.error("[users] Error /permisionarios-barrio:", e);
    return res.status(500).json({ message: "Error interno" });
  }
});

router.get("/", async (req, res) => {
  try {
    if (!User) return res.status(404).json({ message: "Recurso no disponible" });

    const me = req.user;
    const role = up(me?.role);
    const barrio = safeStr(me?.barrioAsignado);

    const hardMax = maxUsersForRole(role);
    const requestedLimit = req.query.limit;
    const limit = requestedLimit ? clampInt(requestedLimit, 1, hardMax) : hardMax;

    if (!BASE_ROLES.has(role)) return res.status(404).json({ message: "Recurso no disponible" });
    if (role === "ALOJADO") return res.status(404).json({ message: "Recurso no disponible" });

    const { sort } = pickSort(req.query.sortBy, req.query.sortDir);
    const base = { archivado: { $ne: true } };

    if (role === "ADMIN" || role === "ADMIN_GENERAL") {
      const usuarios = await User.find(base).select(USER_SAFE_SELECT).sort(sort).limit(limit).lean();
      await attachViviendaLabel(usuarios);
      return res.json({ usuarios });
    }

    if (role === "PERMISIONARIO" && hasPerm(me, "INSPECTOR")) {
      const or = [{ role: { $in: ["ADMIN", "ADMIN_GENERAL"] } }];

      if (barrio) {
        if (Vivienda) {
          const patt = escapeRegex(barrio);
          const permIds = await Vivienda.distinct("ocupacionActual.permisionario", {
            archivado: { $ne: true },
            barrio: { $regex: patt, $options: "i" },
            "ocupacionActual.permisionario": { $exists: true, $ne: null },
          });
          if (Array.isArray(permIds) && permIds.length) {
            or.push({ _id: { $in: permIds }, role: "PERMISIONARIO" });
          }
        } else {
          or.push({ role: "PERMISIONARIO", barrioAsignado: barrio });
        }

        or.push({
          role: "PERMISIONARIO",
          barrioAsignado: barrio,
          permisos: { $in: ["INSPECTOR", "JEFE_DE_BARRIO"] },
        });
      }

      const usuarios = await User.find({ ...base, $or: or })
        .select(USER_SAFE_SELECT)
        .sort(sort)
        .limit(limit)
        .lean();

      await attachViviendaLabel(usuarios);
      return res.json({ usuarios });
    }

    return res.status(404).json({ message: "Recurso no disponible" });
  } catch (err) {
    console.error("[USERS] Error listando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

// Lecturas sensibles para panel admin (auditar acceso)
router.get(
  "/admin-list",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_USERS_LIST", { targetType: "User" }),
  usersController.listar
);

router.get(
  "/pdf",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_USERS_EXPORT_PDF", { targetType: "User" }),
  usersController.pdf
);

// -----------------------------
// Mutaciones críticas (A6)
// -----------------------------

router.patch(
  "/:id/reset-asignacion",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_RESET_ASSIGNMENT", {
    targetType: "User",
    metaAllowlist: ["params.id"],
  }),
  usersController.resetAsignacion
);

router.patch(
  "/:id/role",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_CHANGE_ROLE", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.role", "body.nuevoRol"],
  }),
  usersController.cambiarRol
);

router.patch(
  "/:id/permisos",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_SET_PERMISSIONS", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.permisos"],
  }),
  usersController.setPermisos
);

router.patch(
  "/:id/barrio",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_ASSIGN_BARRIO", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.barrioAsignado", "body.barrio"],
  }),
  usersController.asignarBarrio
);

router.patch(
  "/:id/territorios-alojamiento",
  requireRole("ADMIN_GENERAL"),
  audit("ADMIN_ASSIGN_ALOJAMIENTOS_TERRITORIES", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.territoriosAlojamiento", "body.territorios"],
  }),
  usersController.asignarTerritoriosAlojamiento
);

router.patch(
  "/:id/vivienda",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_ASSIGN_VIVIENDA", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.viviendaId", "body.codigo", "body.estado"],
  }),
  usersController.asignarVivienda
);

router.patch(
  "/:id/activo",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_TOGGLE_ACTIVE", {
    targetType: "User",
    metaAllowlist: ["params.id", "body.activo"],
  }),
  usersController.cambiarActivo
);

router.post(
  "/:id/reset-password",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_RESET_PASSWORD", {
    targetType: "User",
    metaAllowlist: ["params.id"],
  }),
  usersController.resetPassword
);

router.post(
  "/:id/reset-mfa",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_RESET_MFA", {
    targetType: "User",
    metaAllowlist: ["params.id"],
  }),
  usersController.resetMFA
);

router.post(
  "/:id/archive",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_ARCHIVE_USER", {
    targetType: "User",
    metaAllowlist: ["params.id"],
  }),
  usersController.archivar
);

router.post(
  "/:id/unarchive",
  requireRole("ADMIN", "ADMIN_GENERAL"),
  audit("ADMIN_UNARCHIVE_USER", {
    targetType: "User",
    metaAllowlist: ["params.id"],
  }),
  usersController.unarchivar
);

module.exports = router;
