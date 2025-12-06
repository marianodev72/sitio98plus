// backend/routes/users.js

const express = require("express");
const router = express.Router();

// Controladores principales
const {
  login,
  register, // si tu userController lo usa en otro contexto, lo mantenemos importado
  getMe,
  getUsers,
  logout,
} = require("../controllers/userController");

const auth = require("../middleware/auth");
const ROLES = require("../middleware/roles");
const User = require("../models/user");

const {
  validarRegistro,
  registerPostulante,
} = require("../controllers/registerPostulanteController");

// -----------------------------------------------------------------------------
// Helpers internos de permisos
// -----------------------------------------------------------------------------
function esAdminGeneral(user) {
  if (!user || !user.role) return false;
  return String(user.role).trim().toUpperCase() === ROLES.ADMIN;
}

function esAdministracionLike(user) {
  if (!user || !user.role) return false;
  const role = String(user.role).trim().toUpperCase();
  return role === ROLES.ADMIN || role === ROLES.ADMINISTRACION;
}

// -----------------------------------------------------------------------------
// Rutas públicas de autenticación
// -----------------------------------------------------------------------------

// Registro de POSTULANTE (valida matrícula contra CSV)
router.post("/register", validarRegistro, registerPostulante);

// Login (usa JWT RS256 + cookie HttpOnly)
router.post("/login", login);

// Logout (limpia cookie)
router.post("/logout", auth, logout);

// -----------------------------------------------------------------------------
// Rutas de usuario autenticado
// -----------------------------------------------------------------------------

// Perfil propio
router.get("/me", auth, getMe);

// Listado de usuarios (ejemplo: solo ADMIN / ADMINISTRACION)
// Si ya tenías un getUsers más complejo en userController, podés usarlo acá:
// router.get("/", auth, (req, res, next) => {
//   if (!esAdministracionLike(req.user)) {
//     return res
//       .status(403)
//       .json({ message: "No tiene permisos para ver usuarios." });
//   }
//   return getUsers(req, res, next);
// });

// Si preferís algo sencillo dentro del router:
router.get("/", auth, async (req, res) => {
  try {
    if (!esAdministracionLike(req.user)) {
      return res
        .status(403)
        .json({ message: "No tiene permisos para ver usuarios." });
    }

    const usuarios = await User.find().lean();

    const lista = usuarios.map((u) => ({
      id: u._id.toString(),
      email: u.email || "",
      role: u.role || "",
      activo: u.activo !== false,
    }));

    res.json({ ok: true, users: lista });
  } catch (err) {
    console.error("[USERS LIST] Error:", err);
    return res
      .status(500)
      .json({ message: "Error al obtener la lista de usuarios." });
  }
});

// Actualización de usuario (rol / activo) por ADMIN / ADMINISTRACION
router.put("/:id", auth, async (req, res) => {
  try {
    if (!esAdministracionLike(req.user)) {
      return res
        .status(403)
        .json({ message: "No tiene permisos para modificar usuarios." });
    }

    const { role, activo } = req.body;
    const update = {};

    if (role) {
      const nuevoRol = String(role).trim().toUpperCase();

      // Solo ADMIN GENERAL puede asignar el rol ADMIN
      if (nuevoRol === ROLES.ADMIN && !esAdminGeneral(req.user)) {
        return res.status(403).json({
          message: "Solo ADMIN GENERAL puede asignar el rol ADMIN.",
        });
      }

      update.role = nuevoRol;
    }

    if (typeof activo === "boolean") {
      update.activo = activo;
    }

    const usuarioActualizado = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const respuesta = {
      id: usuarioActualizado._id.toString(),
      email: usuarioActualizado.email || "",
      role: usuarioActualizado.role || "",
      activo: usuarioActualizado.activo !== false,
    };

    res.json({ ok: true, user: respuesta });
  } catch (err) {
    console.error("[USERS ADMIN UPDATE] Error:", err);
    return res
      .status(500)
      .json({ message: "Error al actualizar el usuario." });
  }
});

module.exports = router;
