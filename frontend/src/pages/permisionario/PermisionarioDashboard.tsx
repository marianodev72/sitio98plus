// frontend/src/pages/permisionario/PermisionarioDashboard.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getAlertasPostLoginResumen, type AlertaPostLogin } from "../../api/alertas";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  metaStyle,
  moduleButtonStyle,
  modulesGridStyle,
  pageStyle,
  primaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "./uiStyles";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  barrio?: string;
  viviendaCodigo?: string;
  datos?: Record<string, any>;
};

const ESCUDO_ARMADA = "/assets/institucional/escudos/armada-argentina.png";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  const p = up(perm);
  return list.map((x: any) => up(x)).includes(p);
}

function fmtDate(v?: string) {
  if (!v) return "No informado";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "No informado";
  return d.toLocaleString("es-AR");
}

function text(v: unknown) {
  const value = String(v ?? "").trim();
  return value || "";
}

function fallback(v: unknown) {
  return text(v) || "No informado";
}


function getNombreSesion() {
  return "Sesion activa";
}

function alertaColor(prioridad: string) {
  const p = up(prioridad);
  if (p === "CRITICA") return "#f87171";
  if (p === "ALTA") return "#fbbf24";
  if (p === "MEDIA") return "#38bdf8";
  return "#94a3b8";
}

export default function PermisionarioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = up(user?.role);
  const esInspector = hasPerm(user, "INSPECTOR");

  const [loadingGestiones, setLoadingGestiones] = useState(false);
  const [ultimaGestion, setUltimaGestion] = useState<Anexo | null>(null);
  const [alertas, setAlertas] = useState<AlertaPostLogin[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  const identidad = useMemo(
    () => ({
      nombre: getNombreSesion(),
    }),
    []
  );

  async function cargarResumen() {
    setLoadingGestiones(true);
    try {
      const res = await http.get("/formularios/mios");
      const list = Array.isArray(res.data?.anexos) ? res.data.anexos : [];
      setUltimaGestion(list[0] || null);
    } catch {
      setUltimaGestion(null);
    } finally {
      setLoadingGestiones(false);
    }
  }

  async function cargarAlertas() {
    setLoadingAlertas(true);
    try {
      const resumen = await getAlertasPostLoginResumen();
      setAlertas(Array.isArray(resumen.alertas) ? resumen.alertas : []);
    } catch {
      setAlertas([]);
    } finally {
      setLoadingAlertas(false);
    }
  }

  useEffect(() => {
    cargarResumen();
    cargarAlertas();
  }, []);

  const alertasVisibles = alertas.filter((a) => a.prioridad !== "INFO").slice(0, 3);

  const accesos = [
    { label: "Mis anexos", to: "/app/permisionario/anexos" },
    { label: "Mis datos declarados", to: "/app/permisionario/mis-datos" },
    { label: "Comunicaciones", to: "/app/permisionario/comunicaciones" },
    { label: "Mis mantenimientos", to: "/app/permisionario/mis-mantenimientos" },
    { label: "Reintegros", to: "/app/permisionario/liquidaciones" },
    { label: "Mis servicios", to: "/app/permisionario/servicios" },
  ];

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <section style={dashboardHeaderStyle}>
          <img src={ESCUDO_ARMADA} alt="Armada Argentina" style={sealStyle} />
          <div>
            <h1 style={titleStyle}>Panel Permisionario</h1>
            <p style={subtitleStyle}>Resumen de tu situacion</p>
          </div>
        </section>

        <div style={mainGridStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Identidad</h2>
            <div style={identityNameStyle}>{identidad.nombre}</div>
            <div style={identityGridStyle}>
              <InfoItem label="Rol" value={esInspector ? "Permisionario / Inspector" : fallback(role)} />
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Ultima gestion</h2>
            {loadingGestiones ? (
              <p style={emptyTextStyle}>Consultando gestion...</p>
            ) : !ultimaGestion ? (
              <p style={emptyTextStyle}>Sin gestiones recientes.</p>
            ) : (
              <div style={compactStackStyle}>
                <div style={statusLineStyle}>
                  <strong>{fallback(ultimaGestion.codigo)}</strong>
                  <span style={badgeStyle}>{fallback(ultimaGestion.estado)}</span>
                  {ultimaGestion.estadoInstitucional ? <span style={badgeStyle}>{ultimaGestion.estadoInstitucional}</span> : null}
                </div>
                <div style={metaStyle}>Actualizado: {fmtDate(ultimaGestion.updatedAt || ultimaGestion.createdAt)}</div>
                <div style={buttonRowStyle}>
                  <button type="button" style={primaryButtonStyle} onClick={() => navigate("/app/permisionario/anexos")}>
                    Ir a mis anexos
                  </button>
                  {esInspector ? (
                    <button type="button" style={quietButtonStyle} onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}>
                      Mi barrio
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Alertas</h2>
            {loadingAlertas ? (
              <p style={emptyTextStyle}>Consultando alertas...</p>
            ) : !alertasVisibles.length ? (
              <p style={emptyTextStyle}>Sin alertas pendientes.</p>
            ) : (
              <div style={compactStackStyle}>
                {alertasVisibles.map((alerta) => (
                  <div key={alerta.id} style={alertItemStyle}>
                    <div style={{ ...alertPriorityStyle, color: alertaColor(alerta.prioridad) }}>{alerta.prioridad}</div>
                    <div style={alertTitleStyle}>{alerta.titulo}</div>
                    <div style={metaStyle}>{alerta.descripcion}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Novedad destacada</h2>
            <p style={emptyTextStyle}>No hay novedades destacadas vigentes.</p>
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={sectionTitleStyle}>Accesos rapidos</h2>
          <div style={modulesGridStyle}>
            {accesos.map((item) => (
              <button key={item.to} type="button" style={moduleButtonStyle} onClick={() => navigate(item.to)}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoItemStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

const dashboardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
  minWidth: 0,
};

const sealStyle: CSSProperties = {
  width: 46,
  height: 46,
  objectFit: "contain" as const,
  flex: "0 0 auto",
  opacity: 0.92,
};

const mainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const identityNameStyle: CSSProperties = {
  marginBottom: 14,
  fontSize: 20,
  lineHeight: 1.25,
  fontWeight: 900,
  color: "#ffffff",
};

const identityGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const infoItemStyle: CSSProperties = {
  ...softCardStyle,
  padding: 12,
};

const infoLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 5,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.58)",
};

const infoValueStyle: CSSProperties = {
  display: "block",
  fontSize: 14,
  lineHeight: 1.35,
  color: "#ffffff",
};

const compactStackStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const statusLineStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap" as const,
  color: "#ffffff",
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.72)",
  lineHeight: 1.55,
};

const quietButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  maxWidth: "100%",
};

const alertItemStyle: CSSProperties = {
  ...softCardStyle,
  padding: 12,
};

const alertPriorityStyle: CSSProperties = {
  marginBottom: 5,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const alertTitleStyle: CSSProperties = {
  marginBottom: 5,
  color: "#ffffff",
  fontWeight: 800,
};
