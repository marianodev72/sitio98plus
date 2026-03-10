// frontend/src/pages/DashboardHome.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function DashboardHome() {
  const { user } = useAuth();
  const role = up(user?.role);

  // Si por algún motivo todavía no está cargado el usuario
  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Cargando…</h2>
      </div>
    );
  }

  // ✅ Redirección por rol
  if (role === "ADMIN_GENERAL") return <Navigate to="/app/admin-general" replace />;
  if (role === "ADMIN") return <Navigate to="/app/admin-general" replace />;

  if (role === "POSTULANTE") return <Navigate to="/app/postulante" replace />;
  if (role === "PERMISIONARIO") return <Navigate to="/app/permisionario" replace />;

  // Otros roles (a futuro)
  return (
    <div style={{ padding: 32 }}>
      <h2>La página solicitada no está disponible.</h2>
      <p>Por favor, contacte al administrador.</p>
      <p style={{ opacity: 0.7 }}>Rol detectado: <b>{role || "—"}</b></p>
    </div>
  );
}
