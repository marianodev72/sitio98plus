// src/pages/admin_general/AdminGeneralDashboard.tsx

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import http from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  cardStyle,
  heroStyle,
  metaStyle,
  pageStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type DashboardAlert = {
  tipo: string;
  prioridad: string;
  cantidad: number;
  texto: string;
  ruta?: string;
};

type DashboardPending = {
  titulo: string;
  cantidad: number;
  ruta?: string;
  detalle?: string;
};

type DashboardActivity = {
  tipo: string;
  titulo: string;
  detalle?: string;
  fecha?: string;
  ruta?: string;
};

type DashboardData = {
  generatedAt?: string;
  resumen?: {
    viviendas?: Record<string, number>;
    alojamientos?: Record<string, number>;
    formularios?: Record<string, number>;
    mantenimientos?: Record<string, number>;
    usuarios?: Record<string, number>;
    mensajes?: Record<string, number>;
  };
  alertas?: DashboardAlert[];
  pendientes?: DashboardPending[];
  actividadReciente?: DashboardActivity[];
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginTop: 14,
};

const actionLinkStyle: CSSProperties = {
  ...secondaryButtonStyle,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function fmtDate(v?: string) {
  if (!v) return "Sin fecha";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityStyle(priority: string): CSSProperties {
  const p = String(priority || "").toUpperCase();
  if (p === "ALTA") {
    return { ...badgeStyle, background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.35)" };
  }
  if (p === "MEDIA") {
    return { ...badgeStyle, background: "rgba(245,158,11,0.18)", borderColor: "rgba(245,158,11,0.35)" };
  }
  return badgeStyle;
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div style={softCardStyle}>
      <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.10em" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: "#ffffff" }}>{value}</div>
      {detail ? <div style={{ ...metaStyle, marginTop: 4 }}>{detail}</div> : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {children}
    </div>
  );
}

export default function AdminGeneralDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const res = await http.get("/dashboard/admin-general");
      setData(res.data || null);
    } catch {
      setError("No se pudo cargar el centro de situacion institucional.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    http
      .get("/dashboard/admin-general")
      .then((res) => {
        if (alive) setData(res.data || null);
      })
      .catch(() => {
        if (alive) setError("No se pudo cargar el centro de situacion institucional.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const resumenItems = useMemo(() => {
    const viviendas = data?.resumen?.viviendas || {};
    const alojamientos = data?.resumen?.alojamientos || {};
    const formularios = data?.resumen?.formularios || {};
    const mantenimientos = data?.resumen?.mantenimientos || {};
    const usuarios = data?.resumen?.usuarios || {};
    const mensajes = data?.resumen?.mensajes || {};

    return [
      { label: "Viviendas", value: viviendas.total || 0, detail: "Stock actual" },
      { label: "Disponibles", value: viviendas.disponibles || 0 },
      { label: "Ocupadas", value: viviendas.ocupadas || 0 },
      { label: "Reservadas", value: viviendas.reservadas || 0 },
      { label: "Reparacion", value: viviendas.reparacion || 0 },
      { label: "Hacinamiento rojo", value: viviendas.hacinamientoRojo || 0 },
      { label: "Plazas alojamientos", value: alojamientos.plazasTotal || 0, detail: "Stock operativo" },
      { label: "Plazas disponibles", value: alojamientos.plazasDisponibles || 0 },
      { label: "Plazas ocupadas", value: alojamientos.plazasOcupadas || 0 },
      { label: "Plazas reservadas", value: alojamientos.plazasReservadas || 0 },
      { label: "Plazas fuera servicio", value: alojamientos.plazasFueraServicio || 0 },
      { label: "ANEXO_11 abiertos", value: formularios.anexo11Abiertos || 0 },
      { label: "Gestiones pendientes", value: formularios.gestionesPendientes || 0 },
      { label: "Mantenimientos", value: mantenimientos.pendientesAdmin || 0, detail: "Pendientes Admin" },
      { label: "Registros", value: usuarios.pendientes || 0, detail: "Pendientes" },
      { label: "Mensajes", value: mensajes.noLeidos || 0, detail: "Sin leer" },
    ];
  }, [data]);

  const alertas = data?.alertas || [];
  const pendientes = data?.pendientes || [];
  const actividad = data?.actividadReciente || [];

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Centro de situacion institucional</h1>
          <p style={subtitleStyle}>
            Vista ejecutiva para detectar alertas, pendientes y actividad reciente sin duplicar el
            modulo de Estadisticas.
          </p>
          <div style={{ ...metaStyle, marginTop: 10 }}>
            Admin General: {user?.apellido} {user?.nombre}
            {data?.generatedAt ? ` - Actualizado ${fmtDate(data.generatedAt)}` : ""}
          </div>
        </div>

        {loading ? (
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Cargando tablero operativo...</h3>
            <p style={{ ...metaStyle, margin: 0 }}>Consultando resumen ejecutivo institucional.</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>No se pudo cargar el dashboard</h3>
            <p style={{ ...metaStyle, marginTop: 0 }}>{error}</p>
            <button onClick={cargar} style={secondaryButtonStyle}>
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <Section title="Resumen operativo">
              <div style={gridStyle}>
                {resumenItems.map((item) => (
                  <MetricCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
                ))}
              </div>
            </Section>

            <div style={sectionGridStyle}>
              <Section title="Alertas prioritarias">
                {alertas.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {alertas.map((a) => (
                      <div key={`${a.tipo}-${a.texto}`} style={softCardStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={priorityStyle(a.prioridad)}>{a.prioridad}</span>
                          <span style={{ ...badgeStyle }}>{a.tipo}</span>
                        </div>
                        <div style={{ marginTop: 10, color: "#ffffff", fontWeight: 800 }}>
                          {a.cantidad} - {a.texto}
                        </div>
                        {a.ruta ? (
                          <Link to={a.ruta} style={{ ...actionLinkStyle, marginTop: 10 }}>
                            Ir al modulo
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ ...metaStyle, margin: 0 }}>Sin alertas prioritarias al momento.</p>
                )}
              </Section>

              <Section title="Pendientes">
                {pendientes.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {pendientes.map((p) => (
                      <div key={p.titulo} style={softCardStyle}>
                        <div style={{ color: "#ffffff", fontWeight: 900 }}>{p.titulo}</div>
                        <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>{p.cantidad}</div>
                        {p.detalle ? <div style={metaStyle}>{p.detalle}</div> : null}
                        {p.ruta ? (
                          <Link to={p.ruta} style={{ ...actionLinkStyle, marginTop: 10 }}>
                            Revisar
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ ...metaStyle, margin: 0 }}>No hay pendientes ejecutivos destacados.</p>
                )}
              </Section>
            </div>

            <div style={sectionGridStyle}>
              <Section title="Actividad reciente">
                {actividad.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {actividad.map((a, idx) => (
                      <div key={`${a.tipo}-${idx}`} style={softCardStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={badgeStyle}>{a.tipo}</span>
                          <span style={metaStyle}>{fmtDate(a.fecha)}</span>
                        </div>
                        <div style={{ marginTop: 8, color: "#ffffff", fontWeight: 900 }}>{a.titulo}</div>
                        {a.detalle ? <div style={{ ...metaStyle, marginTop: 4 }}>{a.detalle}</div> : null}
                        {a.ruta ? (
                          <Link to={a.ruta} style={{ ...actionLinkStyle, marginTop: 10 }}>
                            Abrir
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ ...metaStyle, margin: 0 }}>No hay actividad reciente para mostrar.</p>
                )}
              </Section>

              <Section title="Accesos rapidos">
                <div style={gridStyle}>
                  <Link to="/app/admin-general/viviendas" style={actionLinkStyle}>
                    Viviendas
                  </Link>
                  <Link to="/app/admin-general/gestiones" style={actionLinkStyle}>
                    Gestiones
                  </Link>
                  <Link to="/app/admin-general/estadisticas" style={actionLinkStyle}>
                    Estadisticas
                  </Link>
                  <Link to="/app/admin-general/mantenimientos" style={actionLinkStyle}>
                    Mantenimientos
                  </Link>
                  <Link to="/app/admin-general/usuarios" style={actionLinkStyle}>
                    Usuarios
                  </Link>
                  <Link to="/app/admin-general/mensajeria" style={actionLinkStyle}>
                    Mensajes
                  </Link>
                </div>
              </Section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
