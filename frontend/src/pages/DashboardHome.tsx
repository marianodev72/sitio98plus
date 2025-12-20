// frontend/src/pages/DashboardHome.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function roleToAppPath(role: string) {
  const r = String(role || "").toUpperCase();

  switch (r) {
    case "ADMIN_GENERAL":
      return "/app/admin-general";
    case "ADMIN":
      return "/app/admin";
    case "INSPECTOR":
      return "/app/inspector";
    case "JEFE_DE_BARRIO":
      return "/app/jefe-de-barrio";
    case "PERMISIONARIO":
      return "/app/permisionario";
    case "ALOJADO":
      return "/app/alojado";
    case "POSTULANTE":
      return "/app/postulante";
    default:
      return "/app";
  }
}

export default function DashboardHome() {
  const { user } = useAuth();
  const destino = roleToAppPath(user?.role || "");

  return (
    <div style={{ padding: 24 }}>
      <h1>Inicio</h1>

      <p>
        Usuario: {user?.nombre} {user?.apellido} — Rol: <b>{user?.role}</b>
      </p>

      <p style={{ marginTop: 12 }}>
        <Link to={destino}>Ir a mi panel</Link>
      </p>

      <p style={{ marginTop: 16, opacity: 0.8 }}>
        (Paneles por rol: en progreso)
      </p>
    </div>
  );
}
