import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import {
  badgeStyle,
  cardStyle,
  metaStyle,
  sectionTitleStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type AlojamientoNaval = {
  _id: string;
  codigo?: string;
  nombre?: string;
  dependencia?: string;
  lugar?: string;
  sector?: string;
  tipo?: string;
  clase?: string;
  numero?: string;
  capacidad?: number;
  estado?: string;
  ocupacionActual?: {
    plazasTotales?: number;
    plazasOcupadas?: number;
    plazasReservadas?: number;
  };
};

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

export default function AlojamientosInspectorInventario() {
  const [items, setItems] = useState<AlojamientoNaval[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lugar, setLugar] = useState("");

  const lugares = useMemo(
    () => Array.from(new Set(items.map((item) => safe(item.lugar, "")).filter(Boolean))).sort(),
    [items]
  );

  const filtrados = useMemo(() => {
    const q = normalize(busqueda);
    return items.filter((item) => {
      if (lugar && safe(item.lugar, "") !== lugar) return false;
      if (!q) return true;

      const texto = [
        item.codigo,
        item.nombre,
        item.lugar,
        item.dependencia,
        item.sector,
        item.tipo,
        item.clase,
        item.numero,
        item.estado,
      ]
        .map(normalize)
        .join(" ");

      return texto.includes(q);
    });
  }, [busqueda, items, lugar]);

  async function cargar() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get("/alojamientos-navales", {
        params: { limit: 200, page: 1 },
      });
      const list = Array.isArray(res.data?.alojamientos) ? res.data.alojamientos : [];
      setItems(list);
    } catch {
      setItems([]);
      setErrorMsg("No es posible cargar el inventario territorial en este momento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <section style={cardStyle}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={titleStyle}>Inventario territorial</h2>
          <p style={subtitleStyle}>
            Consulta readonly de alojamientos dentro de los territorios asignados.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          style={{
            ...badgeStyle,
            minHeight: 36,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        <label>
          <span style={metaStyle}>Busqueda</span>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Codigo, lugar, sector..."
            style={inputStyle}
          />
        </label>

        <label>
          <span style={metaStyle}>Lugar</span>
          <select value={lugar} onChange={(event) => setLugar(event.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todos</option>
            {lugares.map((item) => (
              <option key={item} value={item} style={optionStyle}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMsg && (
        <div style={{ ...softCardStyle, marginTop: 16, color: "#fecaca" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ ...softCardStyle, marginTop: 16, overflowX: "auto" }}>
        <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>
          Resultados: {filtrados.length}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840 }}>
          <thead>
            <tr>
              <th style={thStyle}>Codigo / nombre</th>
              <th style={thStyle}>Lugar</th>
              <th style={thStyle}>Dependencia</th>
              <th style={thStyle}>Sector</th>
              <th style={thStyle}>Tipo / clase</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Plazas</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={tdStyle} colSpan={7}>Cargando inventario...</td>
              </tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={7}>No hay alojamientos para los filtros seleccionados.</td>
              </tr>
            )}
            {!loading && filtrados.map((item) => {
              const totales = Number(item.ocupacionActual?.plazasTotales || item.capacidad || 0);
              const ocupadas = Number(item.ocupacionActual?.plazasOcupadas || 0);
              const reservadas = Number(item.ocupacionActual?.plazasReservadas || 0);

              return (
                <tr key={item._id}>
                  <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>
                    {safe(item.codigo)}
                    <div style={metaStyle}>{safe(item.nombre, safe(item.numero))}</div>
                  </td>
                  <td style={tdStyle}>{safe(item.lugar)}</td>
                  <td style={tdStyle}>{safe(item.dependencia)}</td>
                  <td style={tdStyle}>{safe(item.sector)}</td>
                  <td style={tdStyle}>
                    {safe(item.tipo)}
                    <div style={metaStyle}>{safe(item.clase)}</div>
                  </td>
                  <td style={tdStyle}>{safe(item.estado)}</td>
                  <td style={tdStyle}>
                    {totales}
                    <div style={metaStyle}>Ocupadas {ocupadas} / Reservadas {reservadas}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
