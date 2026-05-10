// frontend/src/layouts/PermisionarioLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(permiso));
}

export default function PermisionarioLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const role = up(user?.role);
  const esPermisionarioBase = role === "PERMISIONARIO";

  if (!esPermisionarioBase) {
    return (
      <div style={{ padding: 32 }}>
        <h2>{GENERIC_UI_ERROR}</h2>
      </div>
    );
  }

  const esInspector = hasPermiso(user, "INSPECTOR");
  const esJefeBarrio = hasPermiso(user, "JEFE_DE_BARRIO");

  if (esInspector && esJefeBarrio) {
    return (
      <div style={{ padding: 32 }}>
        <h2>{GENERIC_UI_ERROR}</h2>
      </div>
    );
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  }

  const isHome =
    location.pathname === "/app/permisionario" ||
    location.pathname === "/app/permisionario/";

  const navButton = (active = false) => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: active
      ? "1px solid #2563eb"
      : "1px solid rgba(255,255,255,0.15)",
    background: active ? "#2563eb" : "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
    maxWidth: "100%",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e5e7eb",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "clamp(12px, 2vw, 20px)",
          background: "rgba(11,18,32,0.85)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          {/* TOP BAR */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#ffffff",
                }}
              >
                Panel Permisionario
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {user?.apellido} {user?.nombre} — <b>{role}</b>

                {esInspector && (
                  <span style={{ marginLeft: 8 }}>(INSPECTOR)</span>
                )}

                {esJefeBarrio && (
                  <span style={{ marginLeft: 8 }}>(JEFE DE BARRIO)</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "100%" }}>
              <button
                style={navButton()}
                onClick={() => navigate(-1)}
              >
                Volver
              </button>

              <button
                style={{
                  ...navButton(),
                  background: "#dc2626",
                  border: "none",
                }}
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* NAV */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              overflowX: "auto",
              paddingBottom: 4,
              maxWidth: "100%",
            }}
          >
            <button
              style={navButton(isHome)}
              onClick={() => navigate(".")}
              disabled={isHome}
            >
              Inicio
            </button>

            <button style={navButton()} onClick={() => navigate("anexos")}>
              Mis Anexos
            </button>

            <button style={navButton()} onClick={() => navigate("comunicaciones")}>
              Comunicaciones
            </button>

            <button style={navButton()} onClick={() => navigate("mis-mantenimientos")}>
              Mis Mantenimientos
            </button>

            <button style={navButton()} onClick={() => navigate("servicios")}>
              Mis Servicios
            </button>

            <button style={navButton()} onClick={() => navigate("liquidaciones")}>
              Mis Liquidaciones
            </button>

            <button style={navButton()} onClick={() => navigate("novedades")}>
              Novedades
            </button>

            {esInspector && (
              <button style={navButton()} onClick={() => navigate("mi-barrio-inspector")}>
                Mi Barrio (Inspector)
              </button>
            )}

            {esJefeBarrio && (
              <button style={navButton()} onClick={() => navigate("mi-barrio-jefe")}>
                Mi Barrio (Jefe)
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ padding: "clamp(12px, 2vw, 20px)", minWidth: 0, boxSizing: "border-box" }}>
        <Outlet />
      </main>
    </div>
  );
}
