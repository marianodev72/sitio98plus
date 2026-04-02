// LiquidacionesAdminConsulta.tsx
import { useEffect, useState, type CSSProperties } from "react";
import {
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../pages/permisionario/uiStyles";

type Liquidacion = {
  _id: string;
  periodo: string;
  mr: string;
  apellidoNombre?: string;
  principal: { cod457: number; cod411: number };
  reintegros: { cod457: number; cod411: number };
  total: {
    cod457: number;
    cod411: number;
    etiqueta457: string;
    etiqueta411: string;
  };
  estadoEntrega: string;
};

export default function LiquidacionesAdminConsulta() {
  const [data, setData] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(false);

  const [periodo, setPeriodo] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (periodo) params.append("periodo", periodo);
      if (q) params.append("q", q);
      if (estado) params.append("estado", estado);

      const res = await fetch(`/api/liquidaciones/admin?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();

      setData(json.liquidaciones || []);
    } catch (err) {
      console.error("Error cargando liquidaciones", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const controlStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    fontSize: 14,
    minHeight: 42,
    boxSizing: "border-box",
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: "12px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    verticalAlign: "middle",
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Consulta de Liquidaciones</h2>
          <p style={subtitleStyle}>
            Consulta institucional de liquidaciones emitidas con filtros por período,
            estado y búsqueda general.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ ...softCardStyle, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Periodo (YYYY-MM)"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                style={controlStyle}
              />

              <input
                type="text"
                placeholder="Buscar por apellido, nombre o MR"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ ...controlStyle, minWidth: 240 }}
              />

              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                style={controlStyle}
              >
                <option value="">Todas</option>
                <option value="ENTREGADA">Entregadas</option>
                <option value="NO_ENTREGADA">No entregadas</option>
              </select>

              <button onClick={fetchData} style={primaryButtonStyle}>
                Buscar
              </button>
            </div>
          </div>

          <h3 style={sectionTitleStyle}>Resultados</h3>

          {loading ? (
            <div style={softCardStyle}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>Cargando...</p>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <table
                border={0}
                cellPadding={6}
                style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Periodo</th>
                    <th style={thStyle}>MR</th>
                    <th style={thStyle}>Apellido y Nombre</th>
                    <th style={thStyle}>457</th>
                    <th style={thStyle}>411</th>
                    <th style={thStyle}>Tipo 457</th>
                    <th style={thStyle}>Tipo 411</th>
                    <th style={thStyle}>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((liq) => (
                    <tr key={liq._id}>
                      <td style={tdStyle}>{liq.periodo}</td>
                      <td style={tdStyle}>{liq.mr}</td>
                      <td style={tdStyle}>{liq.apellidoNombre || "—"}</td>
                      <td style={tdStyle}>{liq.total.cod457}</td>
                      <td style={tdStyle}>{liq.total.cod411}</td>
                      <td style={tdStyle}>{liq.total.etiqueta457}</td>
                      <td style={tdStyle}>{liq.total.etiqueta411}</td>
                      <td style={tdStyle}>{liq.estadoEntrega}</td>
                    </tr>
                  ))}

                  {data.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ ...tdStyle, textAlign: "center" }}>
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}