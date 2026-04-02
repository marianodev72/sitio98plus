// LiquidacionesAdminResumen.tsx
import { useEffect, useState, type CSSProperties } from "react";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../pages/permisionario/uiStyles";

export default function LiquidacionesAdminResumen() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");

  async function fetchData() {
    const params = new URLSearchParams();
    if (q) params.append("q", q);

    const res = await fetch(`/api/liquidaciones/admin-resumen?${params}`);
    const json = await res.json();

    setData(json.registros || []);
  }

  async function descargarPDF() {
    try {
      const token = localStorage.getItem("token") || "";
      const params = new URLSearchParams();

      if (q) params.append("q", q);

      const resp = await fetch(`/api/liquidaciones/admin-resumen-pdf?${params.toString()}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!resp.ok) {
        throw new Error("No fue posible descargar el PDF");
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "liquidaciones_resumen.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No fue posible descargar el PDF");
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
          <h2 style={titleStyle}>Resumen de Liquidaciones</h2>
          <p style={subtitleStyle}>
            Resumen operativo de liquidaciones con búsqueda y exportación en PDF.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ ...softCardStyle, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Buscar por nombre o MR"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={controlStyle}
              />

              <div style={buttonRowStyle}>
                <button onClick={fetchData} style={primaryButtonStyle}>
                  Buscar
                </button>
                <button onClick={descargarPDF} style={secondaryButtonStyle}>
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>

          <h3 style={sectionTitleStyle}>Resultados</h3>

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
              style={{ width: "100%", marginTop: 0, borderCollapse: "collapse", minWidth: 860 }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Periodo</th>
                  <th style={thStyle}>MR</th>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>457</th>
                  <th style={thStyle}>411</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Tipo</th>
                </tr>
              </thead>

              <tbody>
                {data.map((r: any, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{r.periodo}</td>
                    <td style={tdStyle}>{r.mr}</td>
                    <td style={tdStyle}>{r.apellidoNombre}</td>
                    <td style={tdStyle}>{r.cod457}</td>
                    <td style={tdStyle}>{r.cod411}</td>
                    <td style={tdStyle}>{r.estado}</td>
                    <td style={tdStyle}>{r.tipoRegistro}</td>
                  </tr>
                ))}

                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: "center" }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}