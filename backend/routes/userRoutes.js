// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middleware/auth");
const usersController = require("../controllers/usersController");

router.use(authRequired);

router.get("/", usersController.listar);
router.get("/pdf", usersController.pdf);

router.patch("/:id/role", usersController.cambiarRol);
router.patch("/:id/activo", usersController.cambiarActivo);

// ✅ NUEVO: asignación de barrio (solo INSPECTOR / JEFE_DE_BARRIO)
router.patch("/:id/barrio", usersController.asignarBarrio);

router.post("/:id/reset-password", usersController.resetPassword);

// ✅ archivado histórico
router.post("/:id/archive", usersController.archivar);

module.exports = router;
