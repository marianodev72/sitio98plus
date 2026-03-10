// frontend/src/layouts/PostulanteLayout.tsx
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function PostulanteLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = up(user?.role);

  if (role !== "POSTULANTE") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
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
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Topbar */}
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
            <div style={{ fontSize: 18, fontWeight: 800 }}>Panel POSTULANTE</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {user?.apellido} {user?.nombre} — <b>{role}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigate(-1)}>Volver</button>
            <button onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate(".")}>Inicio</button>
          <button onClick={() => navigate("mis-anexos")}>Mis anexos</button>
          <button onClick={() => navigate("anexo-01")}>Iniciar ANEXO_01</button>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
