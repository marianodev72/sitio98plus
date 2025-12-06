// backend/controllers/anexo7Controller.js

const Anexo7 = require("../models/anexo7");

function getUserId(req) {
  return req.user?.id || req.user?._id || null;
}

function ensureRole(req) {
  const role = (req.user?.role || "").toUpperCase();
  return role === "PERMISIONARIO";
}

module.exports = {
  // Listar anexos del permisionario
  async getMisAnexos7(req, res) {
    try {
      if (!ensureRole(req)) {
        return res.status(403).json({ ok: false, msg: "Acceso denegado" });
      }

      const userId = getUserId(req);
      const anexos = await Anexo7.find({ usuario: userId });

      return res.json({ ok: true, anexos });
    } catch (err) {
      console.error("Error getMisAnexos7:", err);
      return res.status(500).json({ ok: false, msg: "Error en el servidor" });
    }
  },

  // Obtener un Anexo 7
  async getAnexo7ById(req, res) {
    try {
      if (!ensureRole(req)) return res.status(403).json({ ok: false, msg: "Acceso denegado" });

      const userId = getUserId(req);
      const { id } = req.params;

      const anexo = await Anexo7.findOne({ _id: id, usuario: userId });

      if (!anexo) return res.status(404).json({ ok: false, msg: "No encontrado" });

      return res.json({ ok: true, anexo });
    } catch (err) {
      console.error("Error getAnexo7ById:", err);
      return res.status(500).json({ ok: false, msg: "Error en el servidor" });
    }
  },

  // Crear Anexo 7
  async crearAnexo7(req, res) {
    try {
      if (!ensureRole(req)) return res.status(403).json({ ok: false, msg: "Acceso denegado" });

      const userId = getUserId(req);

      const nuevo = new Anexo7({
        usuario: userId,
        ...req.body,
      });

      await nuevo.save();

      return res.json({ ok: true, msg: "Anexo 7 creado correctamente" });
    } catch (err) {
      console.error("Error crearAnexo7:", err);
      return res.status(500).json({ ok: false, msg: "Error creando Anexo 7" });
    }
  },

  // Editar
  async editarAnexo7(req, res) {
    try {
      if (!ensureRole(req)) return res.status(403).json({ ok: false, msg: "Acceso denegado" });

      const userId = getUserId(req);
      const { id } = req.params;

      const editado = await Anexo7.findOneAndUpdate(
        { _id: id, usuario: userId },
        req.body,
        { new: true }
      );

      if (!editado) return res.status(404).json({ ok: false, msg: "No encontrado" });

      return res.json({ ok: true, msg: "Anexo 7 actualizado", anexo: editado });
    } catch (err) {
      console.error("Error editarAnexo7:", err);
      return res.status(500).json({ ok: false, msg: "Error editando Anexo 7" });
    }
  },

  // Enviar a inspector
  async enviarAInspector(req, res) {
    try {
      if (!ensureRole(req)) return res.status(403).json({ ok: false, msg: "Acceso denegado" });

      const userId = getUserId(req);
      const { id } = req.params;

      const anexo = await Anexo7.findOne({ _id: id, usuario: userId });
      if (!anexo) return res.status(404).json({ ok: false, msg: "No encontrado" });

      anexo.estado = "ENVIADO_A_INSPECTOR";
      await anexo.save();

      return res.json({ ok: true, msg: "Anexo enviado correctamente" });
    } catch (err) {
      console.error("Error enviarAInspector:", err);
      return res.status(500).json({ ok: false, msg: "Error enviando Anexo 7" });
    }
  },
};
