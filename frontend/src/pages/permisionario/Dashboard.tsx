// frontend/src/pages/DashboardHome.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);

  const target = useMemo(() => {
    if (role === "ADMIN_GENERAL" || role === "ADMIN") return "/app/admin-general";
    if (role === "POSTULANTE") return "/app/postulante";
    if (role === "PERMISIONARIO") return "/app/permisionario";
    // Roles futuros
    return "/app";
  }, [role]);

  const label = useMemo(() => {
    if (role === "ADMIN_GENERAL" || role === "ADMIN") return "Ir al panel ADMIN";
    if (role === "POSTULANTE") return "Ir al panel POSTULANTE";
    if (role === "PERMISIONARIO") return "Ir al panel PERMISIONARIO";
    return "Ir a mi panel";
  }, [role]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Inicio</h2>

      <div style={{ marginTop: 8, opacity: 0.85 }}>
        <div>
          <b>Usuario:</b> {user?.apellido} {user?.nombre}
        </div>
        <div>
          <b>Rol:</b> {user?.role || "—"}
        </div>
        <div>
          <b>Estado habitacional:</b> {user?.estadoHabitacional || "—"}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigate(target)} style={{ fontWeight: 700 }}>
          {label}
        </button>

        {/* Accesos directos útiles */}
        {role === "POSTULANTE" ? (
          <>
            <button onClick={() => navigate("/app/postulante/nueva")}>
              Iniciar postulación (ANEXO_01)
            </button>
          </>
        ) : null}

        {role === "PERMISIONARIO" ? (
          <>
            <button onClick={() => navigate("/app/permisionario/anexos")}>
              Ver mis anexos
            </button>
          </>
        ) : null}
      </div>

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        Si no ve el panel correcto, cierre sesión e ingrese nuevamente (para refrescar el rol en el frontend).
      </div>
    </div>
  );
}
