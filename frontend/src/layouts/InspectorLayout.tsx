// frontend/src/layouts/InspectorLayout.tsx
import {
  Outlet,
  NavLink,
  Navigate,
  useLocation,
  matchPath,
} from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  cardStyle,
  pageStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../pages/permisionario/uiStyles";

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
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>La página solicitada no está disponible.</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
              Por favor, contacte al administrador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (esInspector && esJefe) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>La página solicitada no está disponible.</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
              Por favor, contacte al administrador.
            </p>
          </div>
        </div>
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

  const navItemStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: "none",
    fontWeight: 700,
    borderRadius: 10,
    padding: "10px 12px",
    border: isActive
      ? "1px solid rgba(255,255,255,0.18)"
      : "1px solid transparent",
    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
    color: "#ffffff",
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ ...pageStyle, minHeight: "100vh" }}>
      <div style={{ ...shellStyle, maxWidth: 1280 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <aside style={cardStyle}>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ ...titleStyle, fontSize: 24 }}>{titulo}</h1>
              <p style={subtitleStyle}>
                Acceso territorial a módulos operativos del barrio.
              </p>
            </div>

            <div style={softCardStyle}>
              <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavLink to={root} style={navItemStyle} end>
                  Inicio
                </NavLink>

                <NavLink to={link("viviendas")} style={navItemStyle}>
                  Viviendas
                </NavLink>

                <NavLink to={link("mensajeria")} style={navItemStyle}>
                  Mensajería
                </NavLink>

                <NavLink to={link("gestiones")} style={navItemStyle}>
                  Gestiones
                </NavLink>

                {esInspector ? (
                  <NavLink to={link("mantenimientos")} style={navItemStyle}>
                    Mantenimientos
                  </NavLink>
                ) : null}

                {esInspector ? (
                  <NavLink to={link("anexo-15")} style={navItemStyle}>
                    Reintegros
                  </NavLink>
                ) : null}

                {esJefe ? (
                  <NavLink to={link("usuarios")} style={navItemStyle}>
                    Usuarios
                  </NavLink>
                ) : null}
              </nav>
            </div>
          </aside>

          <main style={{ minWidth: 0 }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
