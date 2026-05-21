import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { panelPathForUser } from "../routes/panelPathForUser";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function canAccessAlojado(user: any) {
  return up(user?.role) === "ALOJADO";
}

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
    whiteSpace: "nowrap",
    maxWidth: "100%",
  } as const;
}

export default function AlojadoLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!canAccessAlojado(user)) {
    const target = user ? panelPathForUser(user) : "/login";
    return <Navigate to={target === "/app/alojado" ? "/app" : target} replace />;
  }

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
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: "clamp(10px, 2vw, 16px)",
          position: "sticky",
          top: 0,
          zIndex: 5,
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff" }}>Panel ALOJADO</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
              {user?.apellido} {user?.nombre} - <b>{String(user?.role || "")}</b>
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
              Cerrar sesion
            </button>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", overflowX: "auto" }}>
          <NavLink to="." end style={linkStyle}>
            Inicio
          </NavLink>
          <NavLink to="anexos" style={linkStyle}>
            Mis Anexos
          </NavLink>
          <NavLink to="ocupaciones" style={linkStyle}>
            Historial de ocupacion
          </NavLink>
          <NavLink to="liquidaciones" style={linkStyle}>
            Mis Liquidaciones
          </NavLink>
          <NavLink to="novedades" style={linkStyle}>
            Novedades
          </NavLink>
        </nav>
      </header>

      <main style={{ padding: "clamp(12px, 2vw, 16px)", minWidth: 0, boxSizing: "border-box" }}>
        <Outlet />
      </main>
    </div>
  );
}
