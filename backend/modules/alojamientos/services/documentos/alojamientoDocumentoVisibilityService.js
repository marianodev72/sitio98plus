const { up } = require("./alojamientoDocumentoStateService");

const ADMIN_ROLES = new Set(["ADMIN_GENERAL", "ADMIN"]);

function getUserRole(user) {
  return up(user?.role);
}

function getUserPermisos(user) {
  return Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
}

function isAdminDocumento(user) {
  return ADMIN_ROLES.has(getUserRole(user));
}

function hasRolOrPermiso(user, rol) {
  const rolUp = up(rol);
  return getUserRole(user) === rolUp || getUserPermisos(user).includes(rolUp);
}

function isInterviniente(user, documento) {
  const userId = String(user?._id || "");
  if (!userId) return false;

  const list = Array.isArray(documento?.intervinientes) ? documento.intervinientes : [];
  return list.some((item) => String(item?.userId || "") === userId);
}

function isTitularDocumento(user, documento) {
  const userId = String(user?._id || "");
  if (!userId || !documento) return false;

  return (
    String(documento.solicitante || "") === userId ||
    String(documento.alojado || "") === userId ||
    String(documento.inspector || "") === userId ||
    String(documento.creadoPor || "") === userId
  );
}

function puedeVerDocumento(user, documento) {
  if (!user || !documento || documento.activo === false) return false;
  if (isAdminDocumento(user)) return true;
  if (isTitularDocumento(user, documento)) return true;
  if (isInterviniente(user, documento)) return true;
  return false;
}

module.exports = {
  isAdminDocumento,
  hasRolOrPermiso,
  isInterviniente,
  isTitularDocumento,
  puedeVerDocumento,
};
