// frontend/src/routes/panelPathForUser.ts

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, permiso: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(permiso));
}

/**
 * panelPathForUser(user)
 * ----------------------
 * Fuente canónica de destinos por rol/permisos.
 * Reglas:
 * - ADMIN_GENERAL -> /app/admin-general
 * - ADMIN -> /app/admin
 * - PERMISIONARIO + INSPECTOR_ALOJAMIENTOS -> /app/alojamientos-inspector
 * - PERMISIONARIO + INSPECTOR -> /app/permisionario/mi-barrio-inspector
 * - PERMISIONARIO + JEFE_DE_BARRIO -> /app/permisionario/mi-barrio-jefe
 * - PERMISIONARIO -> /app/permisionario
 * - ALOJADO -> /app/alojado
 * - POSTULANTE -> /app/postulante
 * - Default -> /app
 */
export function panelPathForUser(user: any) {
  const role = up(user?.role);

  if (role === "ADMIN_GENERAL") return "/app/admin-general";
  if (role === "ADMIN") return "/app/admin";
  if (role === "ALOJADO") return "/app/alojado";

  if (role === "PERMISIONARIO") {
    if (hasPerm(user, "INSPECTOR_ALOJAMIENTOS")) return "/app/alojamientos-inspector";
    if (hasPerm(user, "INSPECTOR")) return "/app/permisionario/mi-barrio-inspector";
    if (hasPerm(user, "JEFE_DE_BARRIO")) return "/app/permisionario/mi-barrio-jefe";
    return "/app/permisionario";
  }

  if (role === "POSTULANTE") return "/app/postulante";
  if (user?.alojamientoAsignado) return "/app/alojado";

  // Fail-closed y sin inventar rutas
  return "/app";
}
