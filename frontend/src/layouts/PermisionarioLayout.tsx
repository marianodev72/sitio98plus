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

  // Regla institucional: nunca ambos permisos
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

  // Este layout está montado en /app/permisionario
  // Se mantiene el cálculo original pero sin hardcodear el path completo.
  const isHome =
    location.pathname === "/app/permisionario" ||
    location.pathname === "/app/permisionario/";

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e5e5",
          padding: "12px 16px",
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
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Panel PERMISIONARIO
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {user?.apellido} {user?.nombre} — <b>{role}</b>
              {esInspector ? (
                <span style={{ marginLeft: 8, fontWeight: 900 }}>
                  (INSPECTOR)
                </span>
              ) : null}
              {esJefeBarrio ? (
                <span style={{ marginLeft: 8, fontWeight: 900 }}>
                  (JEFE DE BARRIO)
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate(-1)}>Volver</button>
            <button onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        {/* Navegación (solo UX; seguridad real en backend) */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => navigate(".")} disabled={isHome}>
            Inicio
          </button>

          <button onClick={() => navigate("anexos")}>Mis Anexos</button>

          <button onClick={() => navigate("comunicaciones")}>
            Comunicaciones
          </button>

          {/* ✅ NUEVO */}
          <button onClick={() => navigate("mis-mantenimientos")}>
            Mis Mantenimientos
          </button>

          <button onClick={() => navigate("servicios")}>Mis Servicios</button>

          <button onClick={() => navigate("liquidaciones")}>
            Mis Liquidaciones
          </button>

          <button onClick={() => navigate("novedades")}>Novedades</button>

          {/* Subpaneles (por botón, nunca por redirección automática) */}
          {esInspector ? (
            <button onClick={() => navigate("mi-barrio-inspector")}>
              Mi Barrio (Inspector)
            </button>
          ) : null}

          {esJefeBarrio ? (
            <button onClick={() => navigate("mi-barrio-jefe")}>
              Mi Barrio (Jefe)
            </button>
          ) : null}
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
