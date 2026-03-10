import React, { useMemo, useState } from "react";

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

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>{titulo}</h2>
      <p style={{ marginTop: 8, opacity: 0.9 }}>ADMIN ve todo, sin acciones de carga ni modificación.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Período (YYYY-MM)</label>
          <input
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value.trim())}
            placeholder="2026-01"
            style={{ padding: "8px 10px", minWidth: 140 }}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={buscar} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #d33", borderRadius: 8 }}>
          <b>Alerta:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>MR</th>
              <th style={{ textAlign: "left", padding: 10 }}>Período</th>
              <th style={{ textAlign: "right", padding: 10 }}>Cod 457</th>
              <th style={{ textAlign: "left", padding: 10 }}>Etiqueta 457</th>
              <th style={{ textAlign: "right", padding: 10 }}>Cod 411</th>
              <th style={{ textAlign: "left", padding: 10 }}>Etiqueta 411</th>
              <th style={{ textAlign: "left", padding: 10 }}>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, opacity: 0.85 }}>
                  {loading ? "Cargando…" : "Sin resultados"}
                </td>
              </tr>
            ) : (
              data.map((it) => (
                <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{it.mr}</td>
                  <td style={{ padding: 10 }}>{it.periodo}</td>
                  <td style={{ padding: 10, textAlign: "right" }}>{n(it.total?.cod457).toFixed(2)}</td>
                  <td style={{ padding: 10 }}>{it.total?.etiqueta457 || "—"}</td>
                  <td style={{ padding: 10, textAlign: "right" }}>{n(it.total?.cod411).toFixed(2)}</td>
                  <td style={{ padding: 10 }}>{it.total?.etiqueta411 || "—"}</td>
                  <td style={{ padding: 10 }}>{it.estadoEntrega || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
