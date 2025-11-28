// backend/routes/anexo4.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const ROLES = require("../middleware/roles");

const {
  crearAnexo4,
  listarAnexos4Permisionario,
  listarAnexos4JefeBarrio,
  listarAnexos4Administracion,
  obtenerAnexo4Detalle,
  jefeBarrioConfirmaRecepcion,
  generarAnexo4PDF,
} = require("../controllers/anexo4Controller");

// Helpers de rol
const allow = (rol) => (req, res, next) => {
  const role = String(req.user.role || "").toUpperCase();
  if (role !== rol) {
    return res.status(403).json({ ok: false, message: "Permiso denegado." });
  }
  next();
};

// PERMISIONARIO crea
router.post("/", auth, allow(ROLES.PERMISIONARIO), crearAnexo4);

// PERMISIONARIO lista los suyos
router.get("/mis", auth, allow(ROLES.PERMISIONARIO), listarAnexos4Permisionario);

// JEFE DE BARRIO listado
router.get(
  "/jefe-barrio",
  auth,
  allow(ROLES.JEFE_BARRIO),
  listarAnexos4JefeBarrio
);

// ADMIN / ADMINISTRACION listado
router.get("/admin", auth, listarAnexos4Administracion);

// PDF (todos los roles del flujo; control en el controller)
router.get("/:id/pdf", auth, generarAnexo4PDF);

// Detalle accesible según rol (validado en controller)
router.get("/:id", auth, obtenerAnexo4Detalle);

// JEFE DE BARRIO confirma recepción
router.patch(
  "/:id/recibir",
  auth,
  allow(ROLES.JEFE_BARRIO),
  jefeBarrioConfirmaRecepcion
);

module.exports = router;
