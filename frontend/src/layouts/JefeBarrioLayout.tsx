// frontend/src/layouts/JefeBarrioLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray((user as any)?.permisos)
    ? (user as any).permisos
    : [];
  return list.map(up).includes(up(permiso));
}

export default function JefeBarrioLayout() {
  const { user } = useAuth();
  const role = up(user?.role);

  const permisos = Array.isArray((user as any)?.permisos)
    ? (user as any).permisos.map(up)
    : [];

  const esJefeLike = role === "JEFE_DE_BARRIO" || permisos.includes("JEFE_DE_BARRIO");

  // Fail-closed
  if (role !== "PERMISIONARIO" || !esJefeLike) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al administrador.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #ddd",
          padding: 16,
          background: "#f9f9f9",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Mi Barrio — Jefe de Barrio</h3>

        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
          Barrio: <b>{String((user as any)?.barrioAsignado || "—")}</b>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavLink
            to="."
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
            end
          >
            Inicio
          </NavLink>

          <NavLink
            to="gestiones"
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Gestiones
          </NavLink>

          <NavLink
            to="crear-anexo-11"
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Crear ANEXO 11
          </NavLink>

          <NavLink
            to="mensajeria"
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Mensajes
          </NavLink>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
