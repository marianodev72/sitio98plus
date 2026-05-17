const { up } = require("./alojamientoDocumentoStateService");
const AlojamientoNaval = require("../../models/AlojamientoNaval");

const ADMIN_ROLES = new Set(["ADMIN_GENERAL", "ADMIN"]);
const PERMISO_INSPECTOR_ALOJAMIENTOS = "INSPECTOR_ALOJAMIENTOS";

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

function isInspectorAlojamientos(user) {
  return getUserPermisos(user).includes(PERMISO_INSPECTOR_ALOJAMIENTOS);
}

function normalizeLugar(value) {
  return String(value || "").trim().toUpperCase();
}

function getTerritoriosLugar(user) {
  const list = Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento
    : [];

  return Array.from(
    new Set(
      list
        .filter((item) => up(item?.tipo) === "LUGAR")
        .map((item) => normalizeLugar(item?.valor))
        .filter(Boolean)
    )
  );
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

function getLugaresDocumento(documento) {
  const datos = documento?.datos && typeof documento.datos === "object" ? documento.datos : {};
  const alojamiento = documento?.alojamiento && typeof documento.alojamiento === "object"
    ? documento.alojamiento
    : {};

  return Array.from(
    new Set(
      [
        datos.lugar,
        datos.alojamientoLugar,
        datos?.alojamiento?.lugar,
        datos?.alojamientoSnapshot?.lugar,
        datos?.alojamientoDatos?.lugar,
        alojamiento.lugar,
      ]
        .map(normalizeLugar)
        .filter(Boolean)
    )
  );
}

function puedeVerDocumentoPorTerritorio(user, documento) {
  if (!user || !documento || documento.activo === false) return false;
  const territorios = getTerritoriosLugar(user);
  if (!territorios.length) return false;

  const allowed = new Set(territorios);
  return getLugaresDocumento(documento).some((lugar) => allowed.has(lugar));
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildFiltroTerritorialDocumento(user) {
  const territorios = getTerritoriosLugar(user);
  if (!territorios.length) return null;

  const regexes = territorios.map((lugar) => new RegExp(`^${escapeRegex(lugar)}$`, "i"));
  const alojamientosIds = await AlojamientoNaval.find({
    activo: { $ne: false },
    lugar: { $in: regexes },
  }).distinct("_id");

  return {
    $or: [
      { "datos.lugar": { $in: regexes } },
      { "datos.alojamientoLugar": { $in: regexes } },
      { "datos.alojamiento.lugar": { $in: regexes } },
      { "datos.alojamientoSnapshot.lugar": { $in: regexes } },
      { "datos.alojamientoDatos.lugar": { $in: regexes } },
      { alojamiento: { $in: alojamientosIds } },
    ],
  };
}

function puedeVerDocumento(user, documento) {
  if (!user || !documento || documento.activo === false) return false;
  if (isAdminDocumento(user)) return true;
  if (isInspectorAlojamientos(user)) return puedeVerDocumentoPorTerritorio(user, documento);
  if (isTitularDocumento(user, documento)) return true;
  if (isInterviniente(user, documento)) return true;
  return false;
}

module.exports = {
  isAdminDocumento,
  isInspectorAlojamientos,
  hasRolOrPermiso,
  isInterviniente,
  isTitularDocumento,
  puedeVerDocumentoPorTerritorio,
  buildFiltroTerritorialDocumento,
  puedeVerDocumento,
};
