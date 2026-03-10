// frontend/src/layouts/AuthLayout.tsx
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { panelPathForUser } from "../routes/panelPathForUser";

/**
 * Layout PÚBLICO:
 * - si NO hay user => deja pasar (login/registro)
 * - si YA hay user => redirige al panel (ruta existente)
 */
export default function AuthLayout() {
  const { initialized, user } = useAuth();
  const loc = useLocation();

  if (!initialized) {
    return <div style={{ padding: 24 }}>Cargando…</div>;
  }

  const path = String(loc.pathname || "");
  const esPublica = path.startsWith("/login") || path.startsWith("/registro");

  if (user && esPublica) {
    return <Navigate to={panelPathForUser(user)} replace />;
  }

  return <Outlet />;
}
