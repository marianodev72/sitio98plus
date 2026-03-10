// frontend/src/layouts/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "8px 10px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 800,
    color: isActive ? "white" : "#111",
    background: isActive ? "#111" : "transparent",
    border: "1px solid #e5e5e5",
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
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e5e5",
          padding: "12px 16px",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Panel ADMIN</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {user?.apellido} {user?.nombre} — <b>{String(user?.role || "")}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate(-1)}>Volver</button>
            <button onClick={handleLogout}>Cerrar sesión</button>
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
