import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type AlojamientoNaval = {
  _id: string;
  codigo: string;
  dependencia: string;
  lugar: string;
  sector?: string;
  tipo: string;
  numero: string;
  clase: string;
  capacidad: number;
  generoPermitido: string;
  localidad?: string;
  provincia?: string;
  observaciones?: string;
  estado: string;
  activo: boolean;
  ocupacionActual?: {
    plazasTotales?: number;
    plazasOcupadas?: number;
    plazasReservadas?: number;
  };
};

type Plaza = {
  _id: string;
  codigo: string;
  numeroPlaza: number;
  estado: string;
  activo: boolean;
  alojadoActual?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
  } | string | null;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function roleAllowed(role: unknown) {
  const r = up(role);
  return r === "ADMIN_GENERAL" || r === "ADMIN";
}

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function alojadoLabel(value: Plaza["alojadoActual"]) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  const full = `${safe(value.apellido, "")} ${safe(value.nombre, "")}`.trim();
  return full || safe(value.email);
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.62)",
  marginBottom: 4,
};

const valueStyle: CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{safe(value)}</div>
    </div>
  );
}

export default function AlojamientoDetalle() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [alojamiento, setAlojamiento] = useState<AlojamientoNaval | null>(null);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const allowed = roleAllowed(user?.role);

  async function cargar() {
    if (!allowed || !id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [detalleRes, plazasRes] = await Promise.all([
        http.get(`/alojamientos-navales/${id}`),
        http.get(`/alojamientos-navales/${id}/plazas`),
      ]);

      setAlojamiento(detalleRes.data?.alojamiento || null);
      setPlazas(Array.isArray(plazasRes.data?.plazas) ? plazasRes.data.plazas : []);
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 401 || status === 403 || status === 404) {
        setErrorMsg("No es posible acceder al detalle del alojamiento.");
      } else {
        setErrorMsg("No es posible cargar el detalle en este momento.");
      }
      setAlojamiento(null);
      setPlazas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, id]);

  if (!allowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0, color: "#ffffff" }}>Recurso no disponible</h2>
        <p style={subtitleStyle}>No es posible acceder al detalle del alojamiento.</p>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={titleStyle}>Detalle de alojamiento</h1>
          <p style={subtitleStyle}>Consulta read-only de unidad y plazas asociadas.</p>
        </div>
        <button type="button" style={secondaryButtonStyle} onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>

      {loading && <p style={subtitleStyle}>Cargando detalle...</p>}

      {errorMsg && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          {errorMsg}
        </div>
      )}

      {!loading && alojamiento && (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <Field label="Codigo" value={alojamiento.codigo} />
            <Field label="Dependencia" value={alojamiento.dependencia} />
            <Field label="Lugar" value={alojamiento.lugar} />
            <Field label="Sector" value={alojamiento.sector} />
            <Field label="Tipo" value={alojamiento.tipo} />
            <Field label="Numero" value={alojamiento.numero} />
            <Field label="Clase" value={alojamiento.clase} />
            <Field label="Capacidad" value={alojamiento.capacidad} />
            <Field label="Genero permitido" value={alojamiento.generoPermitido} />
            <Field label="Localidad" value={alojamiento.localidad} />
            <Field label="Provincia" value={alojamiento.provincia} />
            <Field label="Activo" value={alojamiento.activo ? "SI" : "NO"} />
          </div>

          <div style={{ marginTop: 16 }}>
            <span style={badgeStyle}>{safe(alojamiento.estado)}</span>
            <span style={{ ...badgeStyle, marginLeft: 8 }}>
              Plazas {Number(alojamiento.ocupacionActual?.plazasOcupadas || 0)} /{" "}
              {Number(alojamiento.ocupacionActual?.plazasTotales || alojamiento.capacidad || 0)}
            </span>
          </div>

          {alojamiento.observaciones && (
            <p style={{ ...subtitleStyle, marginTop: 16 }}>{alojamiento.observaciones}</p>
          )}

          <h2 style={{ marginTop: 26, color: "#ffffff", fontSize: 20 }}>Plazas</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Codigo</th>
                  <th style={thStyle}>Numero</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Activo</th>
                  <th style={thStyle}>Alojado actual</th>
                </tr>
              </thead>
              <tbody>
                {!plazas.length && (
                  <tr>
                    <td style={tdStyle} colSpan={5}>Sin plazas registradas.</td>
                  </tr>
                )}
                {plazas.map((p) => (
                  <tr key={p._id}>
                    <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>{safe(p.codigo)}</td>
                    <td style={tdStyle}>{Number(p.numeroPlaza || 0)}</td>
                    <td style={tdStyle}><span style={badgeStyle}>{safe(p.estado)}</span></td>
                    <td style={tdStyle}>{p.activo ? "SI" : "NO"}</td>
                    <td style={tdStyle}>{alojadoLabel(p.alojadoActual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
