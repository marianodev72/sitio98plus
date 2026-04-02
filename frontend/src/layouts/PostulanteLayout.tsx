// frontend/src/layouts/PostulanteLayout.tsx
// frontend/src/layouts/PostulanteLayout.tsx
import { CSSProperties } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#0b1220",
  color: "#ffffff",
};

const headerStyle: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  padding: "12px 16px",
  position: "sticky",
  top: 0,
  zIndex: 5,
  backdropFilter: "blur(6px)",
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#F8FAFC",
};

const subtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#CBD5E1",
};

const neutralButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  background: "rgba(59,130,246,0.20)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const mainStyle: CSSProperties = {
  padding: 16,
};

const deniedStyle: CSSProperties = {
  padding: 32,
  minHeight: "100vh",
  background: "#0b1220",
  color: "#F8FAFC",
};

export default function PostulanteLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = up(user?.role);

  if (role !== "POSTULANTE") {
    return (
      <div style={deniedStyle}>
        <h2 style={{ marginTop: 0, color: "#F8FAFC" }}>La página solicitada no está disponible.</h2>
        <p style={{ color: "#CBD5E1" }}>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // no-op
    } finally {
      // Mejor ir a "/" y dejar que el router decida (normalmente /login)
      navigate("/", { replace: true });
    }
  }

  return (
    <div style={pageStyle}>
      {/* Topbar */}
      <header style={headerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={titleStyle}>Panel POSTULANTE</div>
            <div style={subtitleStyle}>
              {user?.apellido} {user?.nombre} — <b style={{ color: "#F8FAFC" }}>{role}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={neutralButtonStyle} onClick={() => navigate(-1)}>
              Volver
            </button>
            <button style={neutralButtonStyle} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={neutralButtonStyle} onClick={() => navigate(".")}>
            Inicio
          </button>
          <button style={neutralButtonStyle} onClick={() => navigate("mis-anexos")}>
            Mis anexos
          </button>
          <button style={primaryButtonStyle} onClick={() => navigate("anexo-01")}>
            Iniciar ANEXO_01
          </button>
        </div>
      </header>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}