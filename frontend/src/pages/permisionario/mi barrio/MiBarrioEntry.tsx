//frontend/src/pages/permisionario/miBarrio/MiBarrioEntry.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

export default function MiBarrioEntry() {
  const { user } = useAuth();

  const role = up(user?.role);
  if (role !== "PERMISIONARIO" && role !== "INSPECTOR" && role !== "JEFE_DE_BARRIO") {
    return <Navigate to="/app" replace />;
  }

  const esInspector = hasPerm(user, "INSPECTOR") || role === "INSPECTOR";
  const esJefe = hasPerm(user, "JEFE_DE_BARRIO") || role === "JEFE_DE_BARRIO";

  // Seguridad institucional: nunca ambos permisos a la vez
  if (esInspector && esJefe) {
    return <Navigate to="/app/permisionario" replace />;
  }

  if (esInspector) {
    return <Navigate to="/app/permisionario/mi-barrio/inspector" replace />;
  }

  if (esJefe) {
    return <Navigate to="/app/permisionario/mi-barrio/jefe" replace />;
  }

  // Sin permiso territorial
  return <Navigate to="/app/permisionario" replace />;
}
