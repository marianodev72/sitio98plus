import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type CountRow = {
  _id: string;
  count: number;
};

type Alerta = {
  codigo: string;
  severidad: "INFO" | "MEDIA" | "ALTA" | string;
  cantidad: number;
  texto: string;
};

type DashboardResumen = {
  totalAlojamientos: number;
  totalPlazas: number;
  plazasLibres: number;
  plazasOcupadas: number;
  plazasReservadas: number;
  alojamientosPorEstado: Record<string, number>;
  plazasPorEstado: Record<string, number>;
  distribucionPorLugar: CountRow[];
  distribucionPorClase: CountRow[];
  distribucionPorGeneroPermitido: CountRow[];
  alertas: Alerta[];
};

type Props = {
  basePath: string;
};

const CLASES_OFICIALES = ["C01", "C02", "C03", "C04", "CUSO"];

const GENEROS_OFICIALES = [
  "MASCULINO",
  "FEMENINO",
  "SIN_RESTRICCION",
  "NO_ESPECIFICADO",
];

const ALOJAMIENTO_ESTADOS = [
  "DISPONIBLE",
  "PARCIALMENTE_OCUPADO",
  "OCUPADO",
  "RESERVADO",
  "MANTENIMIENTO",
  "FUERA_SERVICIO",
  "INHABILITADO",
  "BAJA",
];

const PLAZA_ESTADOS = [
  "LIBRE",
  "RESERVADA",
  "OCUPADA",
  "MANTENIMIENTO",
  "INHABILITADA",
  "BAJA",
];

const CHART_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#a78bfa", "#f87171", "#14b8a6", "#e879f9", "#94a3b8"];

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function roleAllowed(role: unknown) {
  const r = up(role);
  return r === "ADMIN_GENERAL" || r === "ADMIN";
}

function n(value: unknown) {
  return Number(value || 0);
}

function safe(value: unknown, fallback = "-") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: 14,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.045)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const metricValueStyle: CSSProperties = {
  marginTop: 8,
  color: "#ffffff",
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 900,
};

const metricLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.66)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 850,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "9px 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  minWidth: 0,
};

const chartGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const barTrackStyle: CSSProperties = {
  position: "relative",
  height: 10,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

function alertaTone(severidad: string): CSSProperties {
  const s = up(severidad);
  if (s === "ALTA") return { borderColor: "rgba(248,113,113,0.36)", color: "#fecaca" };
  if (s === "MEDIA") return { borderColor: "rgba(251,191,36,0.36)", color: "#fde68a" };
  return { borderColor: "rgba(148,163,184,0.32)", color: "#e5e7eb" };
}

function normalizeRows(rows: CountRow[], keys: string[] = []) {
  const map = new Map<string, number>();
  (rows || []).forEach((row) => {
    map.set(safe(row._id, "SIN_DATO"), n(row.count));
  });

  const normalized = keys.map((key) => ({ _id: key, count: map.get(key) || 0 }));
  const extras = Array.from(map.entries())
    .filter(([key]) => !keys.includes(key))
    .map(([key, count]) => ({ _id: key, count }))
    .sort((a, b) => a._id.localeCompare(b._id));

  return [...normalized, ...extras];
}

function normalizeMap(data: Record<string, number>, keys: string[] = []) {
  const source = data || {};
  const rows = keys.map((key) => [key, n(source[key])] as [string, number]);
  const extras = Object.entries(source)
    .filter(([key]) => !keys.includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, n(value)] as [string, number]);

  return [...rows, ...extras];
}

function chartRowsFromMap(data: Record<string, number>, keys: string[] = []) {
  return normalizeMap(data, keys).map(([label, value]) => ({ label, value })).filter((row) => row.value > 0);
}

function chartRowsFromCounts(rows: CountRow[], keys: string[] = []) {
  return normalizeRows(rows || [], keys)
    .map((row) => ({ label: safe(row._id, "SIN_DATO"), value: n(row.count) }))
    .filter((row) => row.value > 0);
}

function MiniBarChart({ rows, emptyText }: { rows: { label: string; value: number }[]; emptyText: string }) {
  const max = Math.max(...rows.map((row) => row.value), 0);
  const totalSerie = rows.reduce((acc, row) => acc + n(row.value), 0);

  if (!rows.length || max <= 0) {
    return <p style={{ ...subtitleStyle, margin: 0 }}>{emptyText}</p>;
  }

  return (
    <div style={chartGridStyle}>
      {rows.map((row, index) => {
        const width = Math.max(4, Math.round((row.value / max) * 100));
        const pct = totalSerie > 0 ? Math.round((n(row.value) / totalSerie) * 100) : 0;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <div key={`${row.label}:${index}`} style={{ display: "grid", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <span style={{ color: "rgba(255,255,255,0.86)", fontSize: 13, overflowWrap: "anywhere" }}>
                {safe(row.label, "SIN_DATO")}
              </span>
              <strong style={{ color: "#ffffff", fontSize: 13 }}>
                {n(row.value)} ({pct}%)
              </strong>
            </div>
            <div style={barTrackStyle} aria-label={`${row.label}: ${row.value}`}>
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.72))`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={cardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{n(value)}</div>
    </div>
  );
}

export default function AlojamientosDashboard({ basePath }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const allowed = roleAllowed(user?.role);

  async function cargar() {
    if (!allowed) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get("/alojamientos-dashboard/resumen");
      setResumen(res.data?.resumen || null);
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 401 || status === 403 || status === 404) {
        setErrorMsg("No es posible acceder al dashboard de alojamientos.");
      } else {
        setErrorMsg("No es posible cargar el dashboard en este momento.");
      }
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0, color: "#ffffff" }}>Recurso no disponible</h2>
        <p style={subtitleStyle}>No es posible acceder al dashboard de alojamientos.</p>
      </div>
    );
  }

  const alertas = Array.isArray(resumen?.alertas) ? resumen.alertas : [];
  const alojamientosEstadoChart = resumen ? chartRowsFromMap(resumen.alojamientosPorEstado, ALOJAMIENTO_ESTADOS) : [];
  const plazasEstadoChart = resumen ? chartRowsFromMap(resumen.plazasPorEstado, PLAZA_ESTADOS) : [];
  const lugarChart = resumen ? chartRowsFromCounts(resumen.distribucionPorLugar || []) : [];
  const claseChart = resumen ? chartRowsFromCounts(resumen.distribucionPorClase || [], CLASES_OFICIALES) : [];
  const generoChart = resumen ? chartRowsFromCounts(resumen.distribucionPorGeneroPermitido || [], GENEROS_OFICIALES) : [];

  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={titleStyle}>Dashboard Alojamientos</h1>
          <p style={subtitleStyle}>Resumen operativo read-only del inventario naval.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
          <button type="button" style={secondaryButtonStyle} onClick={() => navigate(`${basePath}/inventario`)}>
            Inventario
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
            Actualizar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid rgba(248,113,113,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading && <p style={subtitleStyle}>Cargando dashboard...</p>}

      {!loading && resumen && (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <Metric label="Alojamientos" value={resumen.totalAlojamientos} />
            <Metric label="Plazas" value={resumen.totalPlazas} />
            <Metric label="Libres" value={resumen.plazasLibres} />
            <Metric label="Ocupadas" value={resumen.plazasOcupadas} />
            <Metric label="Reservadas" value={resumen.plazasReservadas} />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Alojamientos por estado</h2>
              <MiniBarChart rows={alojamientosEstadoChart} emptyText="Sin estados registrados." />
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Plazas por estado</h2>
              <MiniBarChart rows={plazasEstadoChart} emptyText="Sin estados registrados." />
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Por clase</h2>
              <MiniBarChart rows={claseChart} emptyText="Sin clases registradas." />
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Por genero permitido</h2>
              <MiniBarChart rows={generoChart} emptyText="Sin restricciones registradas." />
            </section>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Distribucion por lugar</h2>
              <MiniBarChart rows={lugarChart} emptyText="Sin lugares registrados." />
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Alertas operativas</h2>
              {!alertas.length && <p style={{ ...subtitleStyle, margin: 0 }}>Sin alertas registradas.</p>}
              {alertas.map((alerta) => (
                <div key={alerta.codigo} style={{ ...rowStyle, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ ...badgeStyle, ...alertaTone(alerta.severidad) }}>{safe(alerta.severidad)}</span>
                    <div style={{ marginTop: 7, color: "rgba(255,255,255,0.86)", overflowWrap: "anywhere" }}>
                      {safe(alerta.texto)}
                    </div>
                  </div>
                  <strong style={{ color: "#ffffff" }}>{n(alerta.cantidad)}</strong>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
