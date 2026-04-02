// frontend/src/pages/permisionario/inspector/InspectorDashboard.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import {
  cardStyle,
  heroStyle,
  moduleButtonStyle,
  modulesGridStyle,
  pageStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../uiStyles";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function InspectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);

  // Modelo institucional: INSPECTOR es permiso sobre PERMISIONARIO (compat con role legacy)
  const esInspector =
    (role === "PERMISIONARIO" && hasPerm(user, "INSPECTOR")) || role === "INSPECTOR";

  const barrio = useMemo(() => String(user?.barrioAsignado || "").trim(), [user]);

  // Fail-closed: sin permiso o sin incumbencia territorial
  if (!esInspector || !barrio) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={heroStyle}>
            <h1 style={titleStyle}>Panel del Inspector</h1>
            <p style={subtitleStyle}>
              Acceso restringido al panel de gestión territorial.
            </p>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>La página solicitada no está disponible.</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
              Por favor, contacte al administrador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const base = "/app/permisionario/mi-barrio-inspector";

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Panel del Inspector</h1>
          <p style={subtitleStyle}>
            Desde este panel podrá gestionar las viviendas, anexos y comunicaciones
            correspondientes a su barrio.
          </p>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={softCardStyle}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 6,
                }}
              >
                Inspector
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
                {safe(user?.apellido)} {safe(user?.nombre)}
              </div>
            </div>

            <div style={softCardStyle}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 6,
                }}
              >
                Barrio asignado
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{barrio}</div>
            </div>
          </div>

          <h3 style={sectionTitleStyle}>Módulos</h3>

          <div style={modulesGridStyle}>
            <button type="button" style={moduleButtonStyle} onClick={() => navigate(`${base}/viviendas`)}>
              Viviendas
            </button>
            <button type="button" style={moduleButtonStyle} onClick={() => navigate(`${base}/gestiones`)}>
              Gestiones
            </button>
            <button type="button" style={moduleButtonStyle} onClick={() => navigate(`${base}/mensajeria`)}>
              Mensajería
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}