import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  badgeStyle,
  cardStyle,
  pageStyle,
  shellStyle,
  subtitleStyle,
  titleStyle,
} from "../pages/permisionario/uiStyles";

function up(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function hasPerm(user: any, permiso: string) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return permisos.map((item: unknown) => up(item)).includes(up(permiso));
}

function getTerritorios(user: any) {
  return Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento.filter(
        (territorio: any) => up(territorio?.tipo) === "LUGAR" && String(territorio?.valor || "").trim()
      )
    : [];
}

export default function AlojamientosInspectorLayout() {
  const { user } = useAuth();
  const territorios = getTerritorios(user);
  const autorizado = Boolean(user && hasPerm(user, "INSPECTOR_ALOJAMIENTOS") && territorios.length > 0);

  if (!autorizado) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <section style={cardStyle}>
            <h1 style={titleStyle}>Acceso no disponible</h1>
            <p style={subtitleStyle}>
              No posee permisos territoriales habilitados para gestionar alojamientos.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={titleStyle}>Inspector Alojamientos</h1>
              <p style={subtitleStyle}>Gestión territorial de alojamientos.</p>
            </div>
            <span style={badgeStyle}>{territorios.length} territorio(s)</span>
          </div>
          <nav style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <NavLink
              to="/app/alojamientos-inspector"
              end
              style={({ isActive }) => ({
                ...badgeStyle,
                textDecoration: "none",
                background: isActive ? "rgba(37,99,235,0.35)" : badgeStyle.background,
              })}
            >
              Inicio
            </NavLink>
            <NavLink
              to="/app/alojamientos-inspector/inventario"
              style={({ isActive }) => ({
                ...badgeStyle,
                textDecoration: "none",
                background: isActive ? "rgba(37,99,235,0.35)" : badgeStyle.background,
              })}
            >
              Inventario
            </NavLink>
          </nav>
        </section>

        <Outlet />
      </div>
    </main>
  );
}
