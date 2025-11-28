// routes/postulaciones.js
// Gestión de postulaciones (formularios + adjuntos)

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Postulacion = require("../models/Postulacion");
// 👇 CORREGIDO: importamos requireAuth Y requireRole desde middleware/auth
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// -----------------------------------------------------------------------------
// Configuración de subida de archivos (multer)
// -----------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "postulaciones");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, Date.now() + "-" + safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB por archivo
    files: 10, // máximo 10 archivos
  },
});

// -----------------------------------------------------------------------------
// POST /api/postulaciones
// Crear una nueva postulación (requiere estar logueado como POSTULANTE)
// -----------------------------------------------------------------------------

router.post(
  "/",
  requireAuth,
  upload.array("archivos", 10),
  async (req, res) => {
    try {
      const { tipo, datos } = req.body;

      if (!tipo || (tipo !== "VIVIENDA" && tipo !== "ALOJAMIENTO")) {
        return res.status(400).json({
          message: "Tipo de postulación inválido",
        });
      }

      // Solo permitimos que POSTULANTE cree postulaciones
      if (!req.user || req.user.role !== "POSTULANTE") {
        return res.status(403).json({
          message: "No tiene permisos para crear una postulación.",
        });
      }

      let datosParsed = {};
      if (datos) {
        try {
          datosParsed = typeof datos === "string" ? JSON.parse(datos) : datos;
        } catch (e) {
          return res.status(400).json({
            message: "Formato de datos de formulario inválido.",
          });
        }
      }

      const archivos = (req.files || []).map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
        path: path.join("uploads", "postulaciones", f.filename),
      }));

      const postulacion = new Postulacion({
        user: req.user.id,
        tipo,
        estado: "EN_ANALISIS",
        datos: datosParsed,
        archivos,
      });

      await postulacion.save();

      return res.status(201).json({
        ok: true,
        message: "Postulación enviada correctamente.",
        postulacion: {
          id: postulacion._id,
          tipo: postulacion.tipo,
          estado: postulacion.estado,
          createdAt: postulacion.createdAt,
        },
      });
    } catch (err) {
      console.error("POST /api/postulaciones", err);
      return res.status(500).json({
        message: "No se pudo procesar la postulación. Intente más tarde.",
      });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/postulaciones/mias
// -----------------------------------------------------------------------------

router.get("/mias", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const postulaciones = await Postulacion.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      postulaciones: postulaciones.map((p) => ({
        id: p._id,
        tipo: p.tipo,
        estado: p.estado,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/postulaciones/mias", err);
    return res.status(500).json({
      message: "No se pudieron obtener las postulaciones. Intente más tarde.",
    });
  }
});

// -----------------------------------------------------------------------------
// RUTAS DE ADMINISTRACIÓN DE POSTULACIONES
// Solo para ADMIN, ADMINISTRACION, ENCARGADO_GENERAL
// -----------------------------------------------------------------------------

// GET /api/postulaciones
router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"),
  async (req, res) => {
    try {
      const postulaciones = await Postulacion.find({})
        .populate("user", "nombre apellido email matricula grado dni role")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        ok: true,
        postulaciones: postulaciones.map((p) => ({
          id: p._id,
          tipo: p.tipo,
          estado: p.estado,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          usuario: p.user
            ? {
                id: p.user._id,
                nombre: p.user.nombre,
                apellido: p.user.apellido,
                email: p.user.email,
                matricula: p.user.matricula,
                grado: p.user.grado,
                dni: p.user.dni,
                role: p.user.role,
              }
            : null,
        })),
      });
    } catch (err) {
      console.error("GET /api/postulaciones", err);
      return res.status(500).json({
        message:
          "No se pudieron obtener las postulaciones. Intente más tarde.",
      });
    }
  }
);

// GET /api/postulaciones/:id
router.get(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const postulacion = await Postulacion.findById(id)
        .populate("user", "nombre apellido email matricula grado dni role")
        .lean();

      if (!postulacion) {
        return res
          .status(404)
          .json({ message: "Postulación no encontrada." });
      }

      return res.json({
        ok: true,
        postulacion,
      });
    } catch (err) {
      console.error("GET /api/postulaciones/:id", err);
      return res.status(500).json({
        message: "No se pudo obtener la postulación. Intente más tarde.",
      });
    }
  }
);

// PATCH /api/postulaciones/:id/estado
router.patch(
  "/:id/estado",
  requireAuth,
  requireRole("ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, observaciones } = req.body || {};

      const estadosPermitidos = ["EN_ANALISIS", "ACEPTADA", "RECHAZADA"];

      if (!estado || !estadosPermitidos.includes(estado)) {
        return res.status(400).json({
          message:
            "Estado inválido. Debe ser EN_ANALISIS, ACEPTADA o RECHAZADA.",
        });
      }

      const postulacion = await Postulacion.findById(id);
      if (!postulacion) {
        return res
          .status(404)
          .json({ message: "Postulación no encontrada." });
      }

      postulacion.estado = estado;

      if (typeof observaciones === "string") {
        postulacion.observaciones = observaciones;
      }

      await postulacion.save();

      return res.json({
        ok: true,
        message: "Estado de postulación actualizado.",
        postulacion: {
          id: postulacion._id,
          estado: postulacion.estado,
          observaciones: postulacion.observaciones,
          updatedAt: postulacion.updatedAt,
        },
      });
    } catch (err) {
      console.error("PATCH /api/postulaciones/:id/estado", err);
      return res.status(500).json({
        message:
          "No se pudo actualizar el estado de la postulación. Intente más tarde.",
      });
    }
  }
);

module.exports = router;
