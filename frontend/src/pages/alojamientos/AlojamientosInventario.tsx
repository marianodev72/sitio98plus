import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type AlojamientoEstado =
  | "DISPONIBLE"
  | "PARCIALMENTE_OCUPADO"
  | "OCUPADO"
  | "RESERVADO"
  | "MANTENIMIENTO"
  | "FUERA_SERVICIO"
  | "INHABILITADO"
  | "BAJA";

type GeneroPermitido =
  | "MASCULINO"
  | "FEMENINO"
  | "SIN_RESTRICCION"
  | "NO_ESPECIFICADO";

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
  generoPermitido: GeneroPermitido;
  estado: AlojamientoEstado;
  activo: boolean;
  ocupacionActual?: {
    plazasTotales?: number;
    plazasOcupadas?: number;
    plazasReservadas?: number;
  };
};

type Props = {
  basePath: string;
};

const ESTADOS: AlojamientoEstado[] = [
  "DISPONIBLE",
  "PARCIALMENTE_OCUPADO",
  "OCUPADO",
  "RESERVADO",
  "MANTENIMIENTO",
  "FUERA_SERVICIO",
  "INHABILITADO",
  "BAJA",
];

const GENEROS: GeneroPermitido[] = [
  "MASCULINO",
  "FEMENINO",
  "SIN_RESTRICCION",
  "NO_ESPECIFICADO",
];

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function roleAllowed(role: unknown) {
  const r = up(role);
  return r === "ADMIN_GENERAL" || r === "ADMIN";
}

function estadoTone(estado: string): CSSProperties {
  const e = up(estado);
  if (e === "DISPONIBLE") return { borderColor: "rgba(34,197,94,0.34)", color: "#bbf7d0" };
  if (e === "OCUPADO") return { borderColor: "rgba(248,113,113,0.36)", color: "#fecaca" };
  if (e === "PARCIALMENTE_OCUPADO" || e === "RESERVADO") {
    return { borderColor: "rgba(251,191,36,0.36)", color: "#fde68a" };
  }
  return { borderColor: "rgba(148,163,184,0.32)", color: "#e5e7eb" };
}

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  boxSizing: "border-box",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  verticalAlign: "top",
};

export default function AlojamientosInventario({ basePath }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AlojamientoNaval[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [dependencia, setDependencia] = useState("");
  const [lugar, setLugar] = useState("");
  const [clase, setClase] = useState("");
  const [estado, setEstado] = useState("");
  const [generoPermitido, setGeneroPermitido] = useState("");

  const allowed = roleAllowed(user?.role);

  const dependencias = useMemo(
    () => Array.from(new Set(items.map((x) => safe(x.dependencia, "")).filter(Boolean))).sort(),
    [items]
  );

  const lugares = useMemo(
    () => Array.from(new Set(items.map((x) => safe(x.lugar, "")).filter(Boolean))).sort(),
    [items]
  );

  async function cargar() {
    if (!allowed) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const params: Record<string, string | number> = {
        limit: 200,
        page: 1,
      };
      if (dependencia) params.dependencia = dependencia;
      if (lugar) params.lugar = lugar;
      if (clase) params.clase = clase;
      if (estado) params.estado = estado;
      if (generoPermitido) params.generoPermitido = generoPermitido;

      const res = await http.get("/alojamientos-navales", { params });
      const list = Array.isArray(res.data?.alojamientos) ? res.data.alojamientos : [];
      setItems(list);
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 401 || status === 403 || status === 404) {
        setErrorMsg("No es posible acceder al inventario de alojamientos.");
      } else {
        setErrorMsg("No es posible cargar el inventario en este momento.");
      }
      setItems([]);
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
        <p style={subtitleStyle}>No es posible acceder al inventario de alojamientos.</p>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={titleStyle}>Alojamientos</h1>
          <p style={subtitleStyle}>Inventario administrativo read-only de Alojamientos Navales.</p>
        </div>
        <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
          Actualizar
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        <label>
          <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
            Dependencia
          </span>
          <select value={dependencia} onChange={(e) => setDependencia(e.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todas</option>
            {dependencias.map((x) => (
              <option key={x} value={x} style={optionStyle}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
            Lugar
          </span>
          <select value={lugar} onChange={(e) => setLugar(e.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todos</option>
            {lugares.map((x) => (
              <option key={x} value={x} style={optionStyle}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
            Clase
          </span>
          <select value={clase} onChange={(e) => setClase(e.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todas</option>
            {["C01", "C02", "C03", "C04", "CUSO"].map((x) => (
              <option key={x} value={x} style={optionStyle}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
            Estado
          </span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todos</option>
            {ESTADOS.map((x) => (
              <option key={x} value={x} style={optionStyle}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>
            Genero permitido
          </span>
          <select
            value={generoPermitido}
            onChange={(e) => setGeneroPermitido(e.target.value)}
            style={inputStyle}
          >
            <option value="" style={optionStyle}>Todos</option>
            {GENEROS.map((x) => (
              <option key={x} value={x} style={optionStyle}>{x}</option>
            ))}
          </select>
        </label>

        <button type="button" style={primaryButtonStyle} onClick={cargar} disabled={loading}>
          Filtrar
        </button>
      </div>

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

      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
          <thead>
            <tr>
              <th style={thStyle}>Codigo</th>
              <th style={thStyle}>Dependencia</th>
              <th style={thStyle}>Lugar</th>
              <th style={thStyle}>Sector</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Numero</th>
              <th style={thStyle}>Clase</th>
              <th style={thStyle}>Cap.</th>
              <th style={thStyle}>Genero</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Activo</th>
              <th style={thStyle}>Plazas</th>
              <th style={thStyle}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={tdStyle} colSpan={13}>Cargando inventario...</td>
              </tr>
            )}
            {!loading && !items.length && (
              <tr>
                <td style={tdStyle} colSpan={13}>Sin alojamientos para mostrar.</td>
              </tr>
            )}
            {!loading && items.map((a) => {
              const ocupadas = Number(a.ocupacionActual?.plazasOcupadas || 0);
              const totales = Number(a.ocupacionActual?.plazasTotales || a.capacidad || 0);
              return (
                <tr key={a._id}>
                  <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>{safe(a.codigo)}</td>
                  <td style={tdStyle}>{safe(a.dependencia)}</td>
                  <td style={tdStyle}>{safe(a.lugar)}</td>
                  <td style={tdStyle}>{safe(a.sector)}</td>
                  <td style={tdStyle}>{safe(a.tipo)}</td>
                  <td style={tdStyle}>{safe(a.numero)}</td>
                  <td style={tdStyle}>{safe(a.clase)}</td>
                  <td style={tdStyle}>{Number(a.capacidad || 0)}</td>
                  <td style={tdStyle}>{safe(a.generoPermitido)}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badgeStyle, ...estadoTone(a.estado) }}>{safe(a.estado)}</span>
                  </td>
                  <td style={tdStyle}>{a.activo ? "SI" : "NO"}</td>
                  <td style={tdStyle}>{ocupadas} / {totales}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={{ ...secondaryButtonStyle, padding: "7px 10px" }}
                      onClick={() => navigate(`${basePath}/${a._id}`)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
