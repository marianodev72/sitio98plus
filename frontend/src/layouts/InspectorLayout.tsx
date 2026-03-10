// frontend/src/layouts/InspectorLayout.tsx
import {
  Outlet,
  NavLink,
  Navigate,
  useLocation,
  matchPath,
} from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

type InspectorLayoutProps = {
  basePath?: string; // default: "/app/permisionario/mi-barrio"
  allowJefe?: boolean; // default: true
};

/**
 * InspectorLayout (robustecido)
 * - INSPECTOR y JEFE_DE_BARRIO se tratan como PERMISOS territoriales del rol PERMISIONARIO.
 * - Se mantiene compatibilidad con "roles legacy" (INSPECTOR/JEFE_DE_BARRIO) solo como tolerancia.
 * - Links: preferimos relativos cuando corresponde, evitando concatenación frágil de strings.
 * - Legacy redirects: usando matchPath para mayor robustez.
 */
export default function InspectorLayout(props: InspectorLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();

  const role = up(user?.role);

  // ✅ Regla institucional: permisos territoriales sobre PERMISIONARIO
  const permInspector = role === "PERMISIONARIO" && hasPerm(user, "INSPECTOR");
  const permJefe = role === "PERMISIONARIO" && hasPerm(user, "JEFE_DE_BARRIO");

  // Compat tolerante (por si backend/env antiguos entregan role raro)
  const legacyRoleInspector = role === "INSPECTOR";
  const legacyRoleJefe = role === "JEFE_DE_BARRIO";

  const allowJefe = props.allowJefe !== false;

  const esInspector = permInspector || legacyRoleInspector;
  const esJefeRaw = permJefe || legacyRoleJefe;
  const esJefe = allowJefe ? esJefeRaw : false;

  // Fail-closed (no cambia)
  if (!esInspector && !esJefe) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al
        administrador.
      </div>
    );
  }
  if (esInspector && esJefe) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al
        administrador.
      </div>
    );
  }

  const modo = esInspector ? "inspector" : "jefe";
  const titulo = esInspector ? "Mi Barrio — Inspector" : "Mi Barrio — Jefe de Barrio";

  // Base del módulo (se mantiene el contrato actual: RoleRoutes pasa basePath absoluto)
  const base = props.basePath || "/app/permisionario/mi-barrio";

  // En el subpanel INSPECTOR nuevo NO usamos /inspector; el index es directo.
  const isNewInspectorPanel = base === "/app/permisionario/mi-barrio-inspector";

  const path = location.pathname;

  // Index robusto: permite base o base/ + query/hash sin afectar
  const isIndex =
    matchPath({ path: base, end: true }, path) != null ||
    matchPath({ path: `${base}/`, end: true }, path) != null;

  /**
   * Legacy:
   * Si el módulo es el base viejo "/app/permisionario/mi-barrio"
   * y entran directo a submódulos sin /inspector o /jefe,
   * redirigimos a `${base}/${modo}` (misma conducta anterior).
   */
  const isLegacyBase = base === "/app/permisionario/mi-barrio";

  const isLegacyModule =
    isLegacyBase &&
    (matchPath({ path: `${base}/viviendas/*` }, path) != null ||
      matchPath({ path: `${base}/mensajeria/*` }, path) != null ||
      matchPath({ path: `${base}/gestiones/*` }, path) != null ||
      matchPath({ path: `${base}/inspector/mantenimientos/*` }, path) != null);

  if (!isNewInspectorPanel && (isIndex || isLegacyModule)) {
    return <Navigate to={`${base}/${modo}`} replace />;
  }

  /**
   * root:
   * - Nuevo panel inspector: root = base (index directo)
   * - Módulo legacy: root = `${base}/${modo}`
   */
  const root = isNewInspectorPanel ? base : `${base}/${modo}`;

  /**
   * Link helper:
   * Evita concatenaciones frágiles de strings.
   * Acepta segment sin slash inicial ("viviendas") para armar `/root/viviendas`.
   */
  const link = (segment: string) => {
    const seg = String(segment || "").replace(/^\/+/, "");
    return `${root}/${seg}`;
  };

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <aside
        style={{
          width: 240,
          borderRight: "1px solid #ddd",
          padding: 16,
          background: "#f9f9f9",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{titulo}</h3>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavLink
            to={root}
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
            to={link("viviendas")}
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Viviendas
          </NavLink>

          <NavLink
            to={link("mensajeria")}
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Mensajería
          </NavLink>

          <NavLink
            to={link("gestiones")}
            style={({ isActive }) => ({
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#000" : "#333",
            })}
          >
            Gestiones
          </NavLink>

          {/* ✅ SOLO INSPECTOR: MANTENIMIENTOS */}
          {esInspector ? (
            <NavLink
              to={link("mantenimientos")}
              style={({ isActive }) => ({
                textDecoration: "none",
                fontWeight: isActive ? "bold" : "normal",
                color: isActive ? "#000" : "#333",
              })}
            >
              Mantenimientos
            </NavLink>
          ) : null}

          {esJefe ? (
            <NavLink
              to={link("usuarios")}
              style={({ isActive }) => ({
                textDecoration: "none",
                fontWeight: isActive ? "bold" : "normal",
                color: isActive ? "#000" : "#333",
              })}
            >
              Usuarios
            </NavLink>
          ) : null}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
