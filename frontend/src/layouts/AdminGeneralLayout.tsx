// frontend/src/layouts/AdminGeneralLayout.tsx

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  pageStyle,
  shellStyle,
  secondaryButtonStyle,
  titleStyle,
  subtitleStyle,
  cardStyle,
} from "../pages/permisionario/uiStyles";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "12px 16px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    lineHeight: 1.2,
    color: "#ffffff",
    background: isActive
      ? "rgba(255,255,255,0.10)"
      : "rgba(255,255,255,0.05)",
    border: isActive
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid rgba(255,255,255,0.14)",
    boxShadow: isActive ? "0 8px 20px rgba(0,0,0,0.24)" : "none",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    whiteSpace: "nowrap",
    maxWidth: "100%",
  } as const;
}

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
    <div style={pageStyle}>
      <style>{`
        @media (max-width: 640px) {
          .admin-general-layout-header {
            position: static !important;
          }
        }
      `}</style>

      <header
        className="admin-general-layout-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(180deg, #0b1220 0%, #08101d 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ ...shellStyle, maxWidth: 1440, padding: "clamp(12px, 2vw, 20px)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
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

              <h1 style={{ ...titleStyle, marginTop: 8, fontSize: 28 }}>
                Panel Admin General
              </h1>

              <div style={{ ...subtitleStyle, marginTop: 8 }}>
                {user?.apellido} {user?.nombre} — <b>{String(user?.role || "")}</b>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <button
                onClick={() => navigate(-1)}
                style={secondaryButtonStyle}
              >
                Volver
              </button>

              <button
                onClick={handleLogout}
                style={{
                  ...secondaryButtonStyle,
                  border: "1px solid rgba(239,68,68,0.30)",
                  background: "rgba(239,68,68,0.12)",
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
              overflowX: "auto",
              paddingBottom: 4,
              maxWidth: "100%",
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
            <NavLink to="alojamientos" style={linkStyle}>
              Alojamientos
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
            <NavLink to="bases-maestras" style={linkStyle}>
              Bases maestras
            </NavLink>
            <NavLink to="perfil" style={linkStyle}>
              Perfil
            </NavLink>
          </nav>
        </div>
      </header>

      <main style={{ ...shellStyle, maxWidth: 1440, padding: "clamp(16px, 2vw, 24px) clamp(12px, 2vw, 20px) 32px" }}>
        <div style={cardStyle}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
