// backend/controllers/anexo07Controller.js
// Gestión específica de ANEXO_07 (ampliación de novedades)

const mongoose = require("mongoose");
const { FormSubmission } = require("../models/FormSubmission");

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const up = (v) => String(v || "").toUpperCase().trim();

function genericDenied(res) {
  return res.status(403).json({ message: "Recurso no disponible" });
}

function badRequest(res) {
  return res.status(400).json({ message: "Datos inválidos" });
}

function isInspectorLikeUser(user) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos.map(up)
    : [];
  return role === "INSPECTOR_DISABLED" || permisos.includes("INSPECTOR");
}

function isInspectorInterviniente(anexo, userId) {
  const list = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];
  return list.some(
    (x) => String(x.userId) === String(userId) && up(x.rol) === "INSPECTOR"
  );
}

/* ───────────── ANEXO_07: revisión / observaciones de INSPECTOR ───────────── */

function sanitizeDatosAnexo07Inspector(prevDatos, nextDatos, userId) {
  const prev =
    prevDatos && typeof prevDatos === "object" ? prevDatos : {};
  const next =
    nextDatos && typeof nextDatos === "object" ? nextDatos : {};

  const cleaned = { ...prev };

  if (typeof next.observacionesInspector === "string") {
    cleaned.observacionesInspector = next.observacionesInspector.trim();
  }

  cleaned.conformidadInspector = {
    ok: true,
    fecha: new Date(),
    usuario: userId,
    observacion:
      typeof next.observacionesInspector === "string"
        ? next.observacionesInspector.trim() || undefined
        : undefined,
  };

  return cleaned;
}

async function actualizarDatosAnexo07(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user.role) return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);
    if (!isInspectorLikeUser(user)) return genericDenied(res);
    if (!user.barrioAsignado) return genericDenied(res);

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") return badRequest(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    if (up(anexo.codigo) !== "ANEXO_07") return genericDenied(res);
    if (up(anexo.estado) !== "ENVIADO") return genericDenied(res);

    const anexoBarrio =
      anexo?.barrioAsignado !== undefined
        ? anexo.barrioAsignado
        : anexo?.barrio !== undefined
        ? anexo.barrio
        : undefined;

    if (!anexoBarrio) return genericDenied(res);
    if (String(anexoBarrio) !== String(user.barrioAsignado)) return genericDenied(res);

    if (!isInspectorInterviniente(anexo, user._id)) return genericDenied(res);

    anexo.datos = sanitizeDatosAnexo07Inspector(
      anexo.datos || {},
      datos,
      user._id
    );

    // El inspector deja constancia y el trámite pasa a revisión de ADMIN_GENERAL
    anexo.cambiarEstado(
      "EN_REVISION",
      user._id,
      "Revisión / observaciones del inspector (ANEXO_07)"
    );

    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── ANEXO_07: cierre ADMIN_GENERAL ───────────── */

function sanitizeDatosAnexo07Admin(prevDatos, nextDatos, userId) {
  const prev =
    prevDatos && typeof prevDatos === "object" ? prevDatos : {};
  const next =
    nextDatos && typeof nextDatos === "object" ? nextDatos : {};

  // Campos “institucionales” que sí puede tocar ADMIN_GENERAL
  const cleaned = { ...prev };

  // Observación / fundamento institucional
  if (typeof next.observacionesAdminGeneral === "string") {
    cleaned.observacionesAdminGeneral =
      next.observacionesAdminGeneral.trim();
  }

  // Opcionalmente podría ajustar la lista de novedades si en el futuro
  // permitimos una edición desde el panel administrativo:
  if (Array.isArray(next.novedades)) {
    cleaned.novedades = next.novedades.map((x) => String(x || "").trim());
  }

  // Registramos conformidad / cierre institucional
  cleaned.conformidadAdminGeneral = {
    ok: true,
    fecha: new Date(),
    usuario: userId,
    observacion:
      typeof next.observacionesAdminGeneral === "string"
        ? next.observacionesAdminGeneral.trim() || undefined
        : undefined,
  };

  return cleaned;
}

async function cerrarAnexo07AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const role = up(user?.role);

    if (!user || !user.role) return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);
    if (role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") {
      datos = {};
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    if (up(anexo.codigo) !== "ANEXO_07") return genericDenied(res);

    // Si ya está cerrado devolvemos tal cual sin romper nada
    if (up(anexo.estado) === "CERRADO") {
      return res.json({ anexo: anexo.toObject() });
    }

    anexo.datos = sanitizeDatosAnexo07Admin(
      anexo.datos || {},
      datos,
      user._id
    );

    anexo.cambiarEstado(
      "CERRADO",
      user._id,
      "Cierre ADMIN_GENERAL (ANEXO_07)"
    );

    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

module.exports = {
  actualizarDatosAnexo07,
  cerrarAnexo07AdminGeneral,
};
