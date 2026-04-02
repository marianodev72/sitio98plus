// frontend/src/layouts/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 800,
    color: "#ffffff",
    background: isActive ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.14)",
    display: "inline-flex",
    alignItems: "center",
    minHeight: 40,
    boxSizing: "border-box",
  } as const;
}

export default function AdminLayout() {
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
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: "12px 16px",
          position: "sticky",
          top: 0,
          zIndex: 5,
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>Panel ADMIN</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
              {user?.apellido} {user?.nombre} — <b>{String(user?.role || "")}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Volver
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <NavLink to="." end style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="usuarios" style={linkStyle}>
            Usuarios
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
          <NavLink to="mensajeria" style={linkStyle}>
            Mensajería
          </NavLink>
        </nav>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}