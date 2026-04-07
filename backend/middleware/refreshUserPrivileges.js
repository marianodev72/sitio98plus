// backend/middleware/refreshUserPrivileges.js
const { User } = require("../models/user");
const { clearAuthCookie } = require("./auth");

const GENERIC_UNAUTH = "No autenticado";

// Compat: si alguien quedó con role INSPECTOR / JEFE_DE_BARRIO en BD
// lo normalizamos a PERMISIONARIO + permisos correspondientes.
// (Mismo criterio que usamos en authController/usersController).
function normalizeLegacyForAuth(userDoc) {
  if (!userDoc) return userDoc;

  const role = String(userDoc.role || "").toUpperCase();
  let permisos = Array.isArray(userDoc.permisos) ? userDoc.permisos : [];
  const permisosUp = permisos.map((p) => String(p).toUpperCase());

  if (role === "INSPECTOR") {
    userDoc.role = "PERMISIONARIO";
    if (!permisosUp.includes("INSPECTOR")) {
      permisos = [...permisos, "INSPECTOR"];
    }
  }

  if (role === "JEFE_DE_BARRIO") {
    userDoc.role = "PERMISIONARIO";
    if (!permisosUp.includes("JEFE_DE_BARRIO")) {
      permisos = [...permisos, "JEFE_DE_BARRIO"];
    }
  }

  userDoc.permisos = permisos;
  return userDoc;
}

/**
 * refreshUserPrivileges
 * ---------------------
 * Objetivo:
 *  - Verificar en BD que el usuario del token:
 *      * sigue existiendo
 *      * está activo
 *      * no está bloqueado / archivado
 *      * tokenVersion coincide (revocación inmediata)
 *  - Si algo falla → se limpia cookie y se responde 401 genérico.
 *  - Si todo OK → se actualiza req.user con la foto actual de BD.
 *
 * Uso:
 *  - Se debe encadenar después de authRequired en rutas sensibles
 *    (auth/me, auth/refresh, usuarios, viviendas, formularios, etc.).
 *
 * NOTA:
 *  - Este middleware NO re-firma el token (para eso está /auth/refresh).
 *  - Solo garantiza que los controladores trabajen con privilegios vigentes.
 */
async function refreshUserPrivileges(req, res, next) {
  try {
    const current = req.user;
    const id = current && current._id ? String(current._id) : "";

    if (!id) {
      clearAuthCookie(res);
      return res.status(401).json({ message: GENERIC_UNAUTH });
    }

    // Buscamos en BD con campos necesarios para seguridad.
    const dbUser = await User.findById(id)
     .select(
       "_id role permisos activo bloqueado archivado barrioAsignado viviendaAsignada alojamientoAsignado tokenVersion"
     )
     .lean();

    if (!dbUser) {
      clearAuthCookie(res);
      return res.status(401).json({ message: GENERIC_UNAUTH });
    }

    // Regla institucional: usuario debe estar activo, no bloqueado ni archivado.
    if (dbUser.activo === false || dbUser.bloqueado === true || dbUser.archivado === true) {
      clearAuthCookie(res);
      return res.status(401).json({ message: GENERIC_UNAUTH });
    }

    // Revocación inmediata: tokenVersion del JWT vs BD.
    const tokenVersionToken = Number.isInteger(current.tokenVersion)
      ? current.tokenVersion
      : 0;
    const tokenVersionDb = Number.isInteger(dbUser.tokenVersion)
      ? dbUser.tokenVersion
      : 0;

    if (tokenVersionToken !== tokenVersionDb) {
      // El token quedó inválido (logout global, cambio crítico, etc.)
      clearAuthCookie(res);
      return res.status(401).json({ message: GENERIC_UNAUTH });
    }

    // Normalizamos legacy (INSPECTOR / JEFE_DE_BARRIO como permisos).
    normalizeLegacyForAuth(dbUser);

    // Actualizamos req.user con la foto actual de BD.
    req.user = {
  _id: String(dbUser._id),
   id: String(dbUser._id), // alias compat
  role: dbUser.role,
  permisos: Array.isArray(dbUser.permisos) ? dbUser.permisos : [],
  activo: dbUser.activo,
  tokenVersion: typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0,
  barrioAsignado: dbUser.barrioAsignado || "",
  viviendaAsignada: dbUser.viviendaAsignada ?? null,
  alojamientoAsignado: dbUser.alojamientoAsignado ?? null,
};

    return next();
  } catch (err) {
    console.error("[refreshUserPrivileges] Error:", err);
    // Por seguridad, ante error interno preferimos tratar como no autenticado.
    clearAuthCookie(res);
    return res.status(401).json({ message: GENERIC_UNAUTH });
  }
}

module.exports = {
  refreshUserPrivileges,
};
