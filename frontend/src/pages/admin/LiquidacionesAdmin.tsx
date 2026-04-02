// frontend/src/pages/admin/LiquidacionesAdmin.tsx
import React, { useMemo, useState, type CSSProperties } from "react";

type LiqItem = {
  _id: string;
  periodo: string;
  mr: string;
  principal?: { cod457?: number; cod411?: number };
  reintegros?: { cod457?: number; cod411?: number };
  total?: {
    cod457?: number;
    cod411?: number;
    etiqueta457?: "DESCUENTO" | "REINTEGRO";
    etiqueta411?: "DESCUENTO" | "REINTEGRO";
  };
  estadoEntrega?: string;
};

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function apiFetch<T>(url: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, { headers, credentials: "include" });
  const isJson = (resp.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await resp.json().catch(() => ({})) : await resp.text().catch(() => "");

  if (!resp.ok) {
    const msg =
      (body && typeof body === "object" && (body.message || body.error)) ||
      (typeof body === "string" && body) ||
      "Error interno";
    throw new Error(String(msg));
  }
  return body as T;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function defaultPeriodoYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function LiquidacionesAdmin() {
  const [periodo, setPeriodo] = useState(defaultPeriodoYYYYMM());
  const [data, setData] = useState<LiqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titulo = useMemo(() => `Liquidaciones (solo lectura)`, []);

  async function buscar() {
    setError("");
    setLoading(true);
    try {
      const resp = await apiFetch<{ liquidaciones: LiqItem[] }>(
        `/api/liquidaciones/admin?periodo=${encodeURIComponent(periodo)}`
      );
      setData(Array.isArray(resp.liquidaciones) ? resp.liquidaciones : []);
    } catch (e: any) {
      setError(e?.message || "Error interno");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const pageStyle: CSSProperties = {
    padding: 24,
    background: "#0b1220",
    minHeight: "100%",
    color: "#eaf0ff",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const controlStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    minHeight: 42,
    boxSizing: "border-box",
  };

  const tableWrapStyle: CSSProperties = {
    marginTop: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: 10,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: 10,
    color: "#ffffff",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div style={pageStyle}>
      <h2 style={{ margin: 0, color: "#ffffff" }}>{titulo}</h2>
      <p style={{ marginTop: 8, color: "rgba(255,255,255,0.82)" }}>
        ADMIN ve todo, sin acciones de carga ni modificación.
      </p>

      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(255,255,255,0.72)",
                marginBottom: 6,
              }}
            >
              Período (YYYY-MM)
            </label>
            <input
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value.trim())}
              placeholder="2026-01"
              style={{ ...controlStyle, minWidth: 140 }}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <button onClick={buscar} disabled={loading} style={buttonStyle}>
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            ...cardStyle,
            marginTop: 14,
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          <b>Alerta:</b> {error}
        </div>
      ) : null}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>MR</th>
              <th style={thStyle}>Período</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cod 457</th>
              <th style={thStyle}>Etiqueta 457</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cod 411</th>
              <th style={thStyle}>Etiqueta 411</th>
              <th style={thStyle}>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, opacity: 0.85 }}>
                  {loading ? "Cargando…" : "Sin resultados"}
                </td>
              </tr>
            ) : (
              data.map((it) => (
                <tr key={it._id}>
                  <td style={tdStyle}>{it.mr}</td>
                  <td style={tdStyle}>{it.periodo}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {n(it.total?.cod457).toFixed(2)}
                  </td>
                  <td style={tdStyle}>{it.total?.etiqueta457 || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {n(it.total?.cod411).toFixed(2)}
                  </td>
                  <td style={tdStyle}>{it.total?.etiqueta411 || "—"}</td>
                  <td style={tdStyle}>{it.estadoEntrega || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}