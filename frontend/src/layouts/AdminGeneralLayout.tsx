// frontend/src/layouts/AdminGeneralLayout.tsx

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "12px 16px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.2,
    color: isActive ? "#ffffff" : "rgba(255,255,255,0.86)",
    background: isActive
      ? "linear-gradient(180deg, rgba(56,189,248,0.30), rgba(56,189,248,0.14))"
      : "rgba(255,255,255,0.05)",
    border: isActive
      ? "1px solid rgba(56,189,248,0.42)"
      : "1px solid rgba(255,255,255,0.14)",
    boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.24)" : "none",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  } as const;
}

const actionButtonStyle = {
  padding: "11px 15px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  minHeight: 44,
} as const;

export default function AdminGeneralLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#eaf0ff",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(180deg, #0b1220 0%, #08101d 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "18px 20px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 280 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.76)",
                }}
              >
                Base Naval Ushuaia – Alcaldía ZN98
              </div>

              <h1
                style={{
                  margin: "8px 0 0",
                  fontSize: 28,
                  fontWeight: 950,
                  lineHeight: 1.1,
                  color: "#ffffff",
                  textShadow: "0 2px 14px rgba(0,0,0,0.42)",
                }}
              >
                Panel Admin General
              </h1>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {user?.apellido} {user?.nombre} —{" "}
                <b>{String(user?.role || "")}</b>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => navigate(-1)}
                style={{
                  ...actionButtonStyle,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#ffffff",
                }}
              >
                Volver
              </button>

              <button
                onClick={handleLogout}
                style={{
                  ...actionButtonStyle,
                  border: "1px solid rgba(239,68,68,0.38)",
                  background: "rgba(239,68,68,0.12)",
                  color: "#ffffff",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <nav
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <NavLink to="." end style={linkStyle}>
              Dashboard
            </NavLink>
            <NavLink to="estadisticas" style={linkStyle}>
              Estadísticas
            </NavLink>
            <NavLink to="usuarios" style={linkStyle}>
              Usuarios
            </NavLink>
            <NavLink to="registros" style={linkStyle}>
              Registros
            </NavLink>
            <NavLink to="viviendas" style={linkStyle}>
              Viviendas
            </NavLink>
            <NavLink to="liquidaciones" style={linkStyle}>
              Liquidaciones
            </NavLink>
            <NavLink to="servicios" style={linkStyle}>
              Servicios
            </NavLink>
            <NavLink to="gestiones" style={linkStyle}>
              Gestiones
            </NavLink>
            <NavLink to="mantenimientos" style={linkStyle}>
              Mantenimientos
            </NavLink>
            <NavLink to="mensajeria" style={linkStyle}>
              Mensajería
            </NavLink>
            <NavLink to="auditoria" style={linkStyle}>
              Auditoría Institucional
            </NavLink>
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "24px 20px 32px",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}