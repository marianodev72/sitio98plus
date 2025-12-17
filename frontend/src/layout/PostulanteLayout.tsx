// src/layout/PostulanteLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function PostulanteLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const isHome = location.pathname === "/app/postulante";
  const isAsignaciones = location.pathname.startsWith("/app/postulante/asignaciones");

  return (
    <div style={{ padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Panel del Postulante</h2>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Postulación (ANEXO 01) y Conformidad (ANEXO 02)
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => navigate("/app/postulante")}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderRadius: 8,
              border: "1px solid #334155",
              background: isHome ? "#0ea5e9" : "#0f172a",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            POSTULACIÓN (ANEXO 01)
          </button>

          <button
            onClick={() => navigate("/app/postulante/asignaciones")}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderRadius: 8,
              border: "1px solid #334155",
              background: isAsignaciones ? "#22c55e" : "#0f172a",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            MIS ASIGNACIONES (ANEXO 02)
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderRadius: 8,
              border: "1px solid #7f1d1d",
              background: "#450a0a",
              color: "#fecaca",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
